import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { MAGOOSH_WORDS, MAGOOSH_SOURCES } from "../app/magooshWordData.ts";

const source = JSON.parse(await readFile(new URL("../data/magoosh-common-words-2026-11-11.json", import.meta.url), "utf8"));
const report = JSON.parse(await readFile(new URL("../data/magoosh-content-review.json", import.meta.url), "utf8"));

test("the standalone deck contains exactly the 350 verified Common words in stable source order", () => {
  assert.equal(MAGOOSH_WORDS.length, 350);
  assert.equal(new Set(MAGOOSH_WORDS.map(({ id }) => id)).size, 350);
  assert.equal(source.pdfCommonWords, 300);
  assert.equal(source.commonVIIWords, 50);
  assert.deepEqual(MAGOOSH_WORDS.map(({ word }) => word), source.words.map(({ word }) => word));
  for (const card of MAGOOSH_WORDS) {
    assert.ok(card.id.startsWith("magoosh-common-"));
    assert.equal(card.pair, "");
  }
});

test("all 350 cards have reviewed Chinese meanings, complete etymology sections and source links", () => {
  for (const card of MAGOOSH_WORDS) {
    assert.match(card.meaning, /[\u3400-\u9fff]/);
    for (const heading of ["词源亲戚", "近义词辨析", "记忆链"]) assert.ok(card.origin.includes(heading), card.word + ": " + heading);
    assert.ok((card.origin.match(/[\u3400-\u9fff]/g) || []).length >= 300, card.word);
    assert.ok(card.originQuery.trim());
    assert.ok(MAGOOSH_SOURCES[card.id].some(({ url }) => url.includes("magoosh")), card.word);
    assert.ok(MAGOOSH_SOURCES[card.id].some(({ url }) => /etymonline|wiktionary/.test(url)), card.word);
  }
});

test("bulk content was both drafted and reviewed with DeepSeek; no source definitions or generated examples are republished", () => {
  assert.equal(report.wordCount, 350);
  assert.equal(report.draftCount, 350);
  assert.equal(report.reviewCount, 350);
  assert.match(report.draftModel, /^deepseek-/);
  assert.match(report.reviewModel, /^deepseek-/);
  assert.equal(report.generatedExamples, 0);
  assert.equal(report.sourceDefinitionsCopied, 0);
  assert.ok(report.usage.total_tokens > 0);
});
