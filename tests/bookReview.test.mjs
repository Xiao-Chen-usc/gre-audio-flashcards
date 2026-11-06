import assert from "node:assert/strict";
import test from "node:test";
import { bookReviewIndices } from "../app/bookReview.ts";

const words = Array.from({ length: 106 }, (_, index) => ({ id: `word-${index}` }));
const range = (start, end) => Array.from({ length: end - start }, (_, index) => start + index);
const groups = Array.from({ length: 53 }, (_, index) => ({ indices: [index * 2, index * 2 + 1] }));
const select = (hard) => bookReviewIndices(words, hard, groups);

test("no unfamiliar words means no review, even when the whole book is unseen", () => {
  assert.deepEqual(select(new Set()), []);
});

test("one explicitly unfamiliar word selects its whole pair and no unseen filler", () => {
  assert.deepEqual(select(new Set(["word-7"])), [6, 7]);
});

test("sparse unfamiliar pairs stay in book order regardless of when they were added", () => {
  assert.deepEqual(select(new Set(["word-81", "word-3", "word-42"])), [2, 3, 42, 43, 80, 81]);
});

test("a round is capped at the first 25 unfamiliar pairs / 50 words", () => {
  const hard = new Set(range(0, 106).filter((index) => index % 2 === 0).map((index) => words[index].id));
  assert.deepEqual(select(hard), range(0, 50));
  for (const index of range(0, 10)) hard.delete(words[index].id);
  assert.deepEqual(select(hard), range(10, 60));
});

test("a pair stays eligible until neither member is marked unfamiliar", () => {
  const hard = new Set(["word-6", "word-7"]);
  hard.delete("word-6");
  assert.deepEqual(select(hard), [6, 7]);
  hard.delete("word-7");
  assert.deepEqual(select(hard), []);
});

test("saved unfamiliar progress restores the same review after refresh or a new day", () => {
  const hard = new Set(["word-0", "word-5", "word-20", "word-90"]);
  const restored = new Set(JSON.parse(JSON.stringify([...hard])));
  assert.deepEqual(select(restored), [0, 1, 4, 5, 20, 21, 90, 91]);
});

test("stale IDs do not create review cards", () => {
  assert.deepEqual(select(new Set(["deleted-id"])), []);
});

test("the 50-word boundary never splits an unfamiliar pair", () => {
  const pool = select(new Set(words.map(({ id }) => id)));
  assert.equal(pool.length, 50);
  for (const group of groups) {
    const included = group.indices.filter((index) => pool.includes(index));
    assert.ok(included.length === 0 || included.length === 2);
  }
});

test("selection never rearranges the book or mutates unfamiliar progress", () => {
  const original = structuredClone(words);
  const hard = new Set(["word-2", "word-4", "stale-id"]);
  select(hard);
  assert.deepEqual(words, original);
  assert.deepEqual([...hard], ["word-2", "word-4", "stale-id"]);
});
