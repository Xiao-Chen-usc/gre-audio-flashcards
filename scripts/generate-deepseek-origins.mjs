#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(root, "app/wordData.ts");
const skillPath = path.join(process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex"), "skills/gre-etymology/SKILL.md");
const progressDir = path.resolve(root, "../.origin-rewrite/deepseek-skill-v1");
const batchSize = 1;

function readWords() {
  const source = fs.readFileSync(sourcePath, "utf8");
  const match = source.match(/export const WORDS: WordCard\[\] = (\[[\s\S]*\]);\s*$/);
  if (!match) throw new Error("Cannot parse app/wordData.ts");
  return { source, words: JSON.parse(match[1]) };
}

function fileFor(index) {
  return path.join(progressDir, `batch-${String(index + 1).padStart(3, "0")}.json`);
}

function verify(items, expected) {
  if (!Array.isArray(items) || items.length !== expected.length) throw new Error("Wrong batch size");
  const byId = new Map(items.map(item => [item?.id, item]));
  if (byId.size !== expected.length) throw new Error("Duplicate or missing IDs");
  for (const card of expected) {
    const item = byId.get(card.id);
    if (!item || typeof item.explanation !== "string") throw new Error(`Missing ${card.id}`);
    const s = item.explanation.trim();
    const han = (s.match(/\p{Script=Han}/gu) || []).length;
    if (han < 550 || han > 1600) throw new Error(`${card.id}: Chinese character count ${han}`);
    if (!s.includes("词源亲戚") || !s.includes("记忆链")) throw new Error(`${card.id}: missing required sections`);
    if (s.includes("TODO") || s.includes("undefined")) throw new Error(`${card.id}: placeholder`);
  }
  return expected.map(card => ({ id: card.id, explanation: byId.get(card.id).explanation.trim() }));
}

function loadBatch(index, expected) {
  const file = fileFor(index);
  if (!fs.existsSync(file)) return null;
  return verify(JSON.parse(fs.readFileSync(file, "utf8")), expected);
}

function displayText(raw) {
  return raw
    .replace(/\*\*/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function generate(index, expected, skill) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY is missing");
  const cards = expected.map(({ id, word, pair, meaning, originQuery, origin }) => ({
    id, word, pair, meaning, originQuery, previous_origin_hint: origin,
  }));
  const body = {
    model: "deepseek-flash",
    thinking: { type: "disabled" },
    response_format: { type: "json_object" },
    max_tokens: 16000,
    messages: [
      { role: "system", content: `${skill}\n\n为每张 GRE 词卡写一篇完整的中文词源学习内容。每篇须有 800–1300 个汉字（不计英文、标点），请充分展开词形变化和每一步语义转移的原因；短于 800 汉字会被程序拒绝。必须逐词独立分析，不能把旧词源当作已核实的证据。若词源资料不确定，明确说明。利用 pair 比较近义词的真实语感差别；如果 pair 实际不是近义词，指出差异，不要硬说等价。“词源亲戚”标题下只能列真实共享词源的现代英语词，不能用仅仅意义相关的词凑数；真实亲戚少于三个就只列实际找到的几个。“近义词辨析”标题下才讨论意义相近但词源无关的词。纯文本中使用“词源亲戚”“近义词辨析”“记忆链”小标题和换行。不要写未经查证的精确年代、虚构的同源词或来源。只输出 JSON 对象，格式为 {"items":[{"id":"...","explanation":"..."}]}。` },
      { role: "user", content: JSON.stringify(cards) },
    ],
  };
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 180000);
      let response;
      try {
        response = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } finally { clearTimeout(timer); }
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 400);
        throw new Error(`HTTP ${response.status}: ${detail}`);
      }
      const data = await response.json();
      if (data.choices?.[0]?.finish_reason !== "stop") throw new Error(`finish_reason ${data.choices?.[0]?.finish_reason}`);
      const parsed = JSON.parse(data.choices[0].message.content);
      const items = verify(parsed.items, expected);
      const file = fileFor(index);
      const tmp = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(items, null, 2) + "\n");
      fs.renameSync(tmp, file);
      return { tokens: data.usage?.total_tokens ?? 0 };
    } catch (error) {
      console.error(`batch ${index + 1} attempt ${attempt}: ${error.message}`);
      if (attempt === 5) throw new Error(`batch ${index + 1}: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, Math.min(30000, 2000 * 2 ** (attempt - 1))));
    }
  }
}

async function run() {
  const args = process.argv.slice(2);
  const mode = args[0] ?? "generate";
  const { source, words } = readWords();
  const batches = Array.from({ length: Math.ceil(words.length / batchSize) }, (_, i) => words.slice(i * batchSize, (i + 1) * batchSize));
  fs.mkdirSync(progressDir, { recursive: true });

  if (mode === "status" || mode === "merge") {
    const all = batches.flatMap((batch, i) => loadBatch(i, batch) ?? []);
    console.log(JSON.stringify({ cards: words.length, completed: all.length, batches: batches.length }));
    if (mode === "status") return;
    if (all.length !== words.length) throw new Error("Cannot merge incomplete generation");
    const map = new Map(all.map(item => [item.id, displayText(item.explanation)]));
    const updated = words.map(card => ({ ...card, origin: map.get(card.id) }));
    const next = source.replace(/export const WORDS: WordCard\[\] = \[[\s\S]*\];\s*$/, `export const WORDS: WordCard[] = ${JSON.stringify(updated)};\n`);
    const tmp = `${sourcePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, next);
    fs.renameSync(tmp, sourcePath);
    return;
  }
  if (mode !== "generate") throw new Error("Usage: generate [maxNewBatches] [concurrency] | status | merge");
  const limit = Number(args[1] ?? Infinity);
  const concurrency = Number(args[2] ?? 8);
  if (!(limit > 0) || !Number.isInteger(concurrency) || concurrency < 1 || concurrency > 24) throw new Error("Invalid limit or concurrency");
  const skill = fs.readFileSync(skillPath, "utf8");
  const pending = batches.map((batch, i) => ({ batch, i })).filter(({ batch, i }) => !loadBatch(i, batch)).slice(0, limit);
  let cursor = 0, completed = 0, tokens = 0;
  const errors = [];
  await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, async () => {
    while (cursor < pending.length) {
      const { batch, i } = pending[cursor++];
      try {
        const result = await generate(i, batch, skill);
        tokens += result.tokens;
        completed++;
        console.log(`completed batch ${i + 1}/${batches.length}; new ${completed}/${pending.length}; tokens ${tokens}`);
      } catch (error) { errors.push(error.message); console.error(error.message); }
    }
  }));
  if (errors.length) throw new Error(`${errors.length} batches failed`);
}

run().catch(error => { console.error(error.message); process.exitCode = 1; });
