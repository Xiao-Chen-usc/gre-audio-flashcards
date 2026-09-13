#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const projectDir = path.resolve(import.meta.dirname, "..");
const repoDir = path.resolve(projectDir, "..");
const sourceFiles = [
  path.join(repoDir, "site-source/app/wordData.ts"),
  path.join(repoDir, "gre-audio-flashcards/app/wordData.ts"),
];
const workDir = path.join(repoDir, ".origin-rewrite");
const batchesDir = path.join(workDir, "batches");
const MEANING_CORRECTIONS = new Map([
  ["宛长", "冗长"], ["狐隘", "狭隘"], ["不一臻", "不一致"],
  ["愤世姥俗的", "愤世嫉俗的"], ["一丝不荀", "一丝不苟"],
  ["优柔喜断", "优柔寡断"], ["磊视", "蔑视"], ["易弘", "易怒"],
  ["宛长吧嗪", "冗长啰嗦"], ["令人蝴惧", "令人畏惧"],
  ["羞厚", "羞耻"], ["信殖的", "贪婪的"], ["刘题", "难题"],
  ["曹红欲睡的", "昏昏欲睡的"], ["孙涩难懂", "晦涩难懂"],
  ["坚韧裔力", "坚韧毅力"], ["迁回的", "迂回的"],
  ["令人生时的", "令人生畏的"], ["受.影响", "受影响"],
  ["兼收并曹", "兼收并蓄"], ["阅明", "阐明"], ["轻套的", "轻蔑的"],
  ["尊敬崇黎", "尊敬崇拜"],
]);

function parseWordData(file) {
  const source = fs.readFileSync(file, "utf8");
  const match = source.match(/export const WORDS: WordCard\[\] = (\[[\s\S]*\]);\s*$/);
  if (!match) throw new Error(`Cannot parse WORDS from ${file}`);
  return { source, words: JSON.parse(match[1]) };
}

function batchFiles() {
  return fs.existsSync(batchesDir)
    ? fs.readdirSync(batchesDir).filter((name) => /^batch-\d{3}\.json$/.test(name)).sort()
    : [];
}

function loadResults() {
  const results = [];
  for (const name of batchFiles()) {
    const value = JSON.parse(fs.readFileSync(path.join(batchesDir, name), "utf8"));
    if (!Array.isArray(value)) throw new Error(`${name} must contain an array`);
    results.push(...value.map((item) => ({ ...item, _batch: name })));
  }
  return results;
}

function validate({ requireComplete = false } = {}) {
  const { words } = parseWordData(sourceFiles[0]);
  const results = loadResults();
  const sourceById = new Map(words.map((word) => [word.id, word]));
  const seen = new Set();
  const errors = [];

  for (const item of results) {
    if (!item || typeof item !== "object") errors.push("Non-object result");
    else if (!sourceById.has(item.id)) errors.push(`${item._batch}: unknown id ${item.id}`);
    else {
      const source = sourceById.get(item.id);
      if (seen.has(item.id)) errors.push(`${item._batch}: duplicate id ${item.id}`);
      seen.add(item.id);
      if (item.word !== source.word) errors.push(`${item._batch}: word changed for ${item.id}`);
      if (typeof item.explanation !== "string" || !item.explanation.trim()) {
        errors.push(`${item._batch}: empty explanation for ${item.id}`);
      }
      if (item.explanation?.includes("undefined") || item.explanation?.includes("TODO")) {
        errors.push(`${item._batch}: placeholder in ${item.id}`);
      }
    }
  }

  if (requireComplete && seen.size !== words.length) {
    errors.push(`Expected ${words.length} results, found ${seen.size}`);
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return { total: words.length, completed: seen.size, remaining: words.length - seen.size };
}

function extract(batchNumber) {
  const { words } = parseWordData(sourceFiles[0]);
  const start = (batchNumber - 1) * 20;
  const batch = words.slice(start, start + 20).map(({ id, word, meaning, originQuery, origin }) => ({
    id,
    word,
    meaning,
    originQuery,
    oldOrigin: origin,
  }));
  process.stdout.write(`${JSON.stringify(batch, null, 2)}\n`);
}

function extractNext(size = 20) {
  const { words } = parseWordData(sourceFiles[0]);
  const completed = new Set(loadResults().map((item) => item.id));
  const batch = words.filter((word) => !completed.has(word.id)).slice(0, size).map(
    ({ id, word, meaning, originQuery, origin }) => ({ id, word, meaning, originQuery, oldOrigin: origin }),
  );
  process.stdout.write(`${JSON.stringify(batch, null, 2)}\n`);
}

function merge() {
  const status = validate({ requireComplete: true });
  const results = loadResults();
  const explanationById = new Map(results.map((item) => [item.id, item.explanation]));

  for (const file of sourceFiles) {
    const { source, words } = parseWordData(file);
    const updated = words.map((word) => ({
      ...word,
      meaning: MEANING_CORRECTIONS.get(word.meaning) ?? word.meaning,
      origin: explanationById.get(word.id),
    }));
    const next = source.replace(
      /export const WORDS: WordCard\[\] = \[[\s\S]*\];\s*$/,
      `export const WORDS: WordCard[] = ${JSON.stringify(updated)};\n`,
    );
    fs.writeFileSync(file, next);
  }
  return status;
}

const [command, argument] = process.argv.slice(2);
if (command === "extract") extract(Number(argument));
else if (command === "extract-next") extractNext(argument ? Number(argument) : 20);
else if (command === "validate") console.log(validate({ requireComplete: argument === "--complete" }));
else if (command === "merge") console.log(merge());
else throw new Error("Usage: origin-rewrite.mjs extract <batch> | extract-next [size] | validate [--complete] | merge");
