import { KokoroTTS } from 'kokoro-js';
import { env } from '@huggingface/transformers';
env.allowLocalModels = false;
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.wasmPaths = '/onnx/';
}
let model: ReturnType<typeof KokoroTTS.from_pretrained> | undefined;
let current = 0;
let queue = Promise.resolve();
self.onmessage = (event: MessageEvent<{id: number; text?: string}>) => {
  const {id, text} = event.data;
  current = id;
  if (!text) return;
  queue = queue.catch(() => {}).then(async () => {
    if (id !== current) return;
    const progress = (message: string) => { if (current === id) self.postMessage({id, type: 'progress', message}); };
    try {
      const english = text.replace(/[\u3400-\u9fff]/g, '').replace(/&/g, 'and').replace(/\s+/g, ' ').trim();
      const cacheKey = new URL('/audio/generated/af-heart-v1?text=' + encodeURIComponent(english), self.location.origin).href;
      const cache = typeof caches !== 'undefined' ? await caches.open('gre-kokoro-af-heart-v1').catch(() => null) : null;
      let blob = await cache?.match(cacheKey).then(r => r?.blob());
      if (!blob) {
        progress('首次需下载语音模型，之后会缓存复用，请稍候…');
        model ??= KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {dtype: 'q8', device: 'wasm'}).catch(error => { model = undefined; throw error; });
        const tts = await model;
        if (current !== id) return;
        progress('Kokoro 正在生成英文朗读…');
        const chunks: string[] = [];
        let chunk = '';
        for (const word of english.split(' ')) {
          if ((chunk + ' ' + word).length > 220 && chunk) { chunks.push(chunk); chunk = ''; }
          chunk += (chunk ? ' ' : '') + word;
          if (/[.!?]$/.test(word) && chunk.length > 60) { chunks.push(chunk); chunk = ''; }
        }
        if (chunk) chunks.push(chunk);
        const audioParts = [];
        for (const part of chunks) {
          if (current !== id) return;
          audioParts.push(await tts.generate(part, {voice: 'af_heart', speed: 1}));
        }
        const first = audioParts[0];
        if (!first) throw new Error('Empty text');
        const combined = new Float32Array(audioParts.reduce((n, a) => n + a.audio.length, 0));
        let offset = 0;
        for (const part of audioParts) { combined.set(part.audio, offset); offset += part.audio.length; }
        first.audio = combined;
        blob = first.toBlob();
        await cache?.put(cacheKey, new Response(blob)).catch(() => {});
      }
      if (current === id) self.postMessage({id, type: 'ready', blob});
    } catch (error) {
      console.error("Kokoro speech generation failed", error);
      if (current === id) self.postMessage({id, type: 'error', detail: String(error), message: 'Kokoro 加载失败，请检查网络后重试。首次使用需要连接语音模型服务。'});
    }
  });
};
