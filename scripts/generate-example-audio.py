"""Generate the site's English MP3s offline with Kokoro v1.0 / af_heart.

Install CPU torch, kokoro==0.9.4, transformers<5, soundfile, spacy plus the
en_core_web_sm model, and ffmpeg. Download config.json, kokoro-v1_0.pth, and
voices/af_heart.pt from https://huggingface.co/hexgrad/Kokoro-82M into
--model-dir.

The run is resumable: every English example without a usable MP3 is a pending
item, and a single invocation only renders the next --batch-size pending items
in the order they appear in app/exampleData.ts. Re-running is idempotent and
continues with the next unfinished example.
"""
import argparse
import concurrent.futures
import hashlib
import json
import multiprocessing
from pathlib import Path
import re
import subprocess
import tempfile
import time
import traceback

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'app/exampleData.ts'
MAPPING = ROOT / 'app/exampleAudio.ts'
OUTPUT = ROOT / 'public/audio/examples'
URL_PREFIX = '/audio/examples/'
DIGEST_PREFIX = 'kokoro-v1.0-af_heart|'
SAMPLE_RATE = 24000
MIN_BYTES = 1000
MIN_SECONDS = 1
PIPELINE = None
VOICE = None


def initialize(model_dir):
    import torch
    from kokoro import KModel, KPipeline
    global PIPELINE, VOICE
    torch.set_num_threads(1)
    torch.set_num_interop_threads(1)
    model_dir = Path(model_dir)
    model = KModel(repo_id='hexgrad/Kokoro-82M', config=str(model_dir/'config.json'),
                   model=str(model_dir/'kokoro-v1_0.pth')).eval()
    PIPELINE = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M', model=model)
    VOICE = torch.load(model_dir/'af_heart.pt', weights_only=True)


def clean_english(text):
    """English only: drop Chinese characters, read & as 'and', collapse blanks."""
    text = re.sub(r'[\u3400-\u9fff]', '', text).replace('&', ' and ')
    return re.sub(r'\s+', ' ', text).strip()


def audio_name(key, text):
    digest = hashlib.sha256((DIGEST_PREFIX + clean_english(text)).encode()).hexdigest()[:16]
    return f'{key}-{digest}.mp3'


def load_examples():
    """Every non-empty English example, in app/exampleData.ts order."""
    source = DATA.read_text()
    start = source.index('export const EXAMPLES')
    body = source[source.index(' = ', start) + 3:].strip().rstrip(';')
    data = json.loads(body)
    return [(key, value['english'].strip()) for key, value in data.items() if value['english'].strip()]


def load_mapping():
    if not MAPPING.exists():
        return {}
    body = MAPPING.read_text().split(' = ', 1)[1].strip().rstrip(';')
    return json.loads(body)


def verify_mp3(path):
    """Decode a generated MP3 and confirm it is usable audio."""
    import numpy as np
    import soundfile as sf
    if not path.is_file():
        return False, 'missing'
    size = path.stat().st_size
    if size <= MIN_BYTES:
        return False, f'only {size} bytes'
    try:
        info = sf.info(str(path))
        if info.samplerate != SAMPLE_RATE:
            return False, f'{info.samplerate} Hz'
        if info.channels != 1:
            return False, f'{info.channels} channels'
        if info.duration <= MIN_SECONDS:
            return False, f'{info.duration:.3f}s'
        samples, _ = sf.read(str(path), dtype='float32')
    except Exception as error:
        return False, f'unreadable ({error})'
    if not np.isfinite(samples).all():
        return False, 'contains NaN/Inf'
    if float(np.max(np.abs(samples))) <= .001:
        return False, 'silent'
    return True, f'{info.duration:.3f}s'


def render(item):
    import numpy as np
    import soundfile as sf
    key, text = item
    cleaned = clean_english(text)
    target = OUTPUT / audio_name(key, text)
    if not target.exists():
        chunks = [result.audio.numpy() for result in PIPELINE(cleaned, voice=VOICE, speed=1.0)]
        samples = np.concatenate(chunks)
        assert np.isfinite(samples).all() and np.max(np.abs(samples)) > .001
        assert len(samples) / SAMPLE_RATE > MIN_SECONDS
        with tempfile.TemporaryDirectory() as temp:
            wav, mp3 = Path(temp)/'audio.wav', Path(temp)/'audio.mp3'
            sf.write(wav, samples, SAMPLE_RATE)
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(wav),
                            '-codec:a', 'libmp3lame', '-b:a', '64k', '-ac', '1', str(mp3)], check=True)
            target.write_bytes(mp3.read_bytes())
    ok, detail = verify_mp3(target)
    assert ok, f'{target.name}: {detail}'
    return key, URL_PREFIX + target.name


def write_mapping(examples, mapping):
    entries = {key: mapping[key] for key, _ in examples if key in mapping}
    payload = ('export const EXAMPLE_AUDIO: Record<string, string> = ' +
               json.dumps(entries, indent=2) + ';\n')
    temporary = MAPPING.with_name(MAPPING.name + '.tmp')
    temporary.write_text(payload)
    temporary.replace(MAPPING)


def report(examples, mapping, pending, label):
    done = len(examples) - len(pending)
    print(f'{label}: {done}/{len(examples)} examples have a usable MP3 '
          f'({len(mapping)} mapping entries), {len(pending)} pending', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--model-dir', required=True)
    parser.add_argument('--workers', type=int, default=4)
    parser.add_argument('--batch-size', type=int)
    args = parser.parse_args()

    examples = load_examples()
    mapping = load_mapping()
    pending = []
    for key, text in examples:
        name = audio_name(key, text)
        if mapping.get(key) != URL_PREFIX + name:
            pending.append((key, text))
            continue
        ok, _ = verify_mp3(OUTPUT / name)
        if not ok:
            pending.append((key, text))
    report(examples, mapping, pending, 'before')
    if not pending:
        write_mapping(examples, mapping)
        print('nothing to do', flush=True)
        raise SystemExit(0)

    batch = pending[:args.batch_size] if args.batch_size else pending
    OUTPUT.mkdir(parents=True, exist_ok=True)
    results, failures = {}, []
    started = time.monotonic()
    with concurrent.futures.ProcessPoolExecutor(max_workers=args.workers,
            mp_context=multiprocessing.get_context('spawn'),
            initializer=initialize, initargs=(args.model_dir,)) as executor:
        futures = {executor.submit(render, item): item for item in batch}
        for future in concurrent.futures.as_completed(futures):
            key = futures[future][0]
            try:
                key, url = future.result()
            except Exception:
                failures.append(key)
                print(f'FAILED {key}:\n{traceback.format_exc()}', flush=True)
                continue
            results[key] = url
            if len(results) % 10 == 0 or len(results) + len(failures) == len(batch):
                print(f'{len(results)}/{len(batch)} generated in {time.monotonic()-started:.0f}s',
                      flush=True)

    if failures:
        print(f'{len(failures)} failed: {" ".join(sorted(failures))}', flush=True)
        raise SystemExit(1)

    mapping.update(results)
    write_mapping(examples, mapping)
    remaining = [item for item in pending if item[0] not in results]
    report(examples, mapping, remaining, 'after')
