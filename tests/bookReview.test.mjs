import assert from "node:assert/strict";
import test from "node:test";
import { bookReviewIndices } from "../app/bookReview.ts";

const words = Array.from({ length: 106 }, (_, index) => ({ id: `word-${index}` }));
const range = (start, end) => Array.from({ length: end - start }, (_, index) => start + index);
const groups = Array.from({ length: 53 }, (_, index) => ({ indices: [index * 2, index * 2 + 1] }));
const select = (known) => bookReviewIndices(words, known, groups);

test("each round starts scanning at the front and selects 25 complete pairs / 50 words", () => {
  assert.deepEqual(select(new Set()), range(0, 50));
});

test("failed pairs keep their positions and the next round fills to 50 with later pairs", () => {
  const retained = [2, 3, 16, 17];
  const known = new Set(range(0, 50).filter((index) => !retained.includes(index)).map((index) => words[index].id));
  const next = select(known);
  assert.equal(next.length, 50);
  assert.deepEqual(next, [...retained, ...range(50, 96)]);
});

test("one remaining failure brings its known partner and 48 later words into the next round", () => {
  const known = new Set(range(0, 50).filter((index) => index !== 7).map((index) => words[index].id));
  assert.deepEqual(select(known), [6, 7, ...range(50, 98)]);
});

test("only fully mastered pairs are skipped; a half-mastered pair is included in full", () => {
  const known = new Set(range(0, 50).map((index) => words[index].id));
  known.add(words[55].id);
  assert.deepEqual(select(known), range(50, 100));
  known.add(words[54].id);
  assert.deepEqual(select(known), [...range(50, 54), ...range(56, 102)]);
});

test("leaving mid-round still tops up the next round to 50", () => {
  const known = new Set(range(0, 10).map((index) => words[index].id));
  assert.deepEqual(select(known), range(10, 60));
});

test("saved mastery is sufficient to restore the same selection after refresh or a new day", () => {
  const known = new Set(["word-0", "word-1", "word-4", "word-5", "word-20", "word-90"]);
  const restored = new Set(JSON.parse(JSON.stringify([...known])));
  assert.deepEqual(select(restored), select(known));
  assert.deepEqual(select(restored).slice(0, 6), [2, 3, 6, 7, 8, 9]);
});

test("only the final round can have fewer than 50; a fully remembered book returns no cards", () => {
  const known = new Set(range(0, 100).map((index) => words[index].id));
  assert.deepEqual(select(known), range(100, 106));
  for (const word of words) known.add(word.id);
  assert.deepEqual(select(known), []);
});

test("legacy single-word mastery never splits the pair at the 50-word boundary", () => {
  const known = new Set(range(0, 70).filter((index) => index % 2 === 0).map((index) => words[index].id));
  const pool = select(known);
  assert.equal(pool.length, 50);
  assert.deepEqual(pool, range(0, 50));
  for (const group of groups) {
    const included = group.indices.filter((index) => pool.includes(index));
    assert.ok(included.length === 0 || included.length === 2);
  }
});

test("selection never rearranges the book or changes mastery data", () => {
  const original = structuredClone(words);
  const known = new Set(["word-2", "word-4", "stale-id"]);
  select(known);
  assert.deepEqual(words, original);
  assert.deepEqual([...known], ["word-2", "word-4", "stale-id"]);
});
