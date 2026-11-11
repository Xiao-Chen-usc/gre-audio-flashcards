#!/usr/bin/env python3
"""Import word names only from Magoosh's public Common resources."""
import concurrent.futures
import html
import json
from pathlib import Path
import re
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT.parent / '.magoosh-build'
PDF_URL = 'https://s3.amazonaws.com/magoosh.resources/magoosh-gre-1000-words_oct01.pdf'
DECK_URL = 'https://gre.magoosh.com/flashcards/vocabulary/decks/common-words-vii'


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)


def common_pdf_words():
    pdf = WORK / 'magoosh-official-1000.pdf'
    text = WORK / 'magoosh-official-1000.txt'
    if not pdf.exists():
        subprocess.run(['curl', '-fLsS', '--max-time', '60', PDF_URL, '-o', str(pdf)], check=True)
    if not text.exists():
        subprocess.run(['pdftotext', '-layout', str(pdf), str(text)], check=True)
    result = {}
    for number, page in enumerate(text.read_text().split('\f'), 1):
        common = page.split('Basic Words')[0]
        for match in re.finditer(r"^([A-Za-z][A-Za-z'’ -]*?)\s+\(([^)]+)\):", common, re.M):
            word = match[1].strip().lower()
            result.setdefault(word, {'word': word, 'sourceUrl': PDF_URL + '#page=' + str(number), 'sourcePart': 'Common (High-frequency) Words'})
        if 'Basic Words' in page:
            break
    if len(result) != 300:
        raise ValueError(f'Official PDF Common section changed: {len(result)} unique words')
    return list(result.values())


def read_public_card():
    time.sleep(0.25)
    response = subprocess.run(['curl', '-fLsS', '--max-time', '30', DECK_URL], capture_output=True, text=True)
    if response.returncode:
        raise RuntimeError('Magoosh public card unavailable: ' + response.stderr[:120])
    url = re.search(r"<link href='([^']+)' rel='canonical'>", response.stdout)
    title = re.search(r'<h1[^>]*class="[^"]*flashcard-word[^"]*"[^>]*>(.*?)</h1>', response.stdout, re.S)
    if not url or not title or '/common-words-vii/' not in url[1]:
        raise ValueError('Unexpected public Common VII card')
    word = html.unescape(re.sub('<[^>]*>', '', title[1])).strip().lower()
    if not re.fullmatch(r"[a-z][a-z' -]*", word):
        raise ValueError('Invalid word name')
    return {'word': word, 'sourceUrl': html.unescape(url[1]), 'sourcePart': 'Common VII'}


def common_vii_words():
    cache = WORK / 'common-vii-source-words.json'
    rows = json.loads(cache.read_text()) if cache.exists() else []
    found = {row['word']: row for row in rows}
    requests = 0
    failures = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        while len(found) < 50 and requests < 600:
            jobs = [pool.submit(read_public_card) for _ in range(8)]
            requests += len(jobs)
            for job in concurrent.futures.as_completed(jobs):
                try:
                    row = job.result()
                    found[row['word']] = row
                except Exception as error:
                    failures += 1
                    print(str(error), flush=True)
            write_json(cache, sorted(found.values(), key=lambda row: row['word']))
            print(f'Common VII: {len(found)}/50 word names; {requests} public page reads', flush=True)
            if len(found) > 50 or failures > 12:
                raise ValueError('Common VII import requires inspection')
    if len(found) != 50:
        raise ValueError(f'Incomplete Common VII: {len(found)}/50; resume to continue')
    return sorted(found.values(), key=lambda row: row['word'])


def main():
    WORK.mkdir(parents=True, exist_ok=True)
    common = common_pdf_words()
    seventh = common_vii_words()
    ordered = {row['word']: row for row in common}
    for row in seventh:
        ordered.setdefault(row['word'], row)
    words = [{**row, 'page': index // 50 + 1} for index, row in enumerate(ordered.values())]
    if len(words) != 350:
        raise ValueError(f'Expected 350 Common words after deduplication, found {len(words)}')
    result = {
        'title': 'Magoosh GRE Common Words',
        'retrievedOn': '2026-11-11',
        'sources': [PDF_URL, DECK_URL],
        'pdfCommonWords': len(common),
        'commonVIIWords': len(seventh),
        'totalWords': len(words),
        'note': 'Word names only. PDF Common section plus official Common VII, excluding Basic and Advanced. Content is generated separately with DeepSeek.',
        'words': words,
    }
    write_json(ROOT / 'data/magoosh-common-words-2026-11-11.json', result)
    print(json.dumps({'imported': len(words), 'source': 'Magoosh official public resources'}), flush=True)


if __name__ == '__main__':
    main()
