import assert from "node:assert/strict";
import test from "node:test";
import { bookReviewIndices } from "../app/bookReview.ts";

const words = Array.from({ length: 106 }, (_, index) => ({ id: `word-${index}` }));
const range = (start, end) => Array.from({ length: end - start }, (_, index) => start + index);

test("each round starts scanning at the front and selects the first 50 unremembered words", () => {
  assert.deepEqual(bookReviewIndices(words, new Set()), range(0, 50));
});

test("four failed or skipped words keep their positions and the next round fills to 50 with later words", () => {
  const retained = [3, 17, 28, 49];
  const known = new Set(range(0, 50).filter((index) => !retained.includes(index)).map((index) => words[index].id));
  const next = bookReviewIndices(words, known);
  assert.equal(next.length, 50);
  assert.deepEqual(next, [...retained, ...range(50, 96)]);
});

test("one remaining failure is included with 49 later words instead of making a one-word round", () => {
  const known = new Set(range(0, 50).filter((index) => index !== 7).map((index) => words[index].id));
  assert.deepEqual(bookReviewIndices(words, known), [7, ...range(50, 99)]);
});

test("all remembered words are skipped, including words learned outside daily review", () => {
  const known = new Set(range(0, 50).map((index) => words[index].id));
  known.add(words[55].id);
  assert.deepEqual(bookReviewIndices(words, known), [...range(50, 55), ...range(56, 101)]);
});

test("leaving mid-round still tops up the next round to 50", () => {
  const known = new Set(range(0, 10).map((index) => words[index].id));
  assert.deepEqual(bookReviewIndices(words, known), range(10, 60));
});

test("saved mastery is sufficient to restore the same selection after refresh or a new day", () => {
  const known = new Set(["word-0", "word-5", "word-20", "word-90"]);
  const restored = new Set(JSON.parse(JSON.stringify([...known])));
  assert.deepEqual(bookReviewIndices(words, restored), bookReviewIndices(words, known));
  assert.deepEqual(bookReviewIndices(words, restored).slice(0, 5), [1, 2, 3, 4, 6]);
});

test("only the final round can have fewer than 50; a fully remembered book returns no cards", () => {
  const known = new Set(range(0, 100).map((index) => words[index].id));
  assert.deepEqual(bookReviewIndices(words, known), range(100, 106));
  for (const word of words) known.add(word.id);
  assert.deepEqual(bookReviewIndices(words, known), []);
});

test("selection never rearranges the book or changes mastery data", () => {
  const original = structuredClone(words);
  const known = new Set(["word-2", "word-4", "stale-id"]);
  bookReviewIndices(words, known);
  assert.deepEqual(words, original);
  assert.deepEqual([...known], ["word-2", "word-4", "stale-id"]);
});
