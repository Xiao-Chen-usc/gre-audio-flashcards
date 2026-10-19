import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyBookReview,
  nextBookReview,
  normalizeBookReview,
  rememberBookReviewWord,
} from "../app/bookReview.ts";

const words = Array.from({ length: 106 }, (_, index) => ({ id: `word-${index}` }));
const groups = Array.from({ length: 53 }, (_, index) => ({ indices: [index * 2, index * 2 + 1] }));
const plan = (state) => nextBookReview(state, groups, words);

test("the first batch contains the first 25 complete book groups, regardless of previous mastery", () => {
  const batch = plan(emptyBookReview());
  assert.equal(batch.nextGroup, 25);
  assert.deepEqual(batch.pending, words.slice(0, 50).map(({ id }) => id));
});

test("remembered words leave the batch; failed, skipped, and unanswered words return immediately", () => {
  let batch = plan(emptyBookReview());
  const retained = new Set(["word-3", "word-17", "word-49"]);
  for (const { id } of words.slice(0, 50)) {
    if (!retained.has(id)) batch = rememberBookReviewWord(batch, id);
  }
  assert.equal(batch.nextGroup, 25);
  assert.deepEqual(plan(batch).pending, [...retained]);
  // A second failed round neither advances the cursor nor pulls in new words.
  assert.deepEqual(plan(plan(batch)), plan(batch));
});

test("clearing the batch advances to the next 25 groups without gaps or duplicates", () => {
  const first = plan(emptyBookReview());
  const passed = first.pending.reduce(rememberBookReviewWord, first);
  const second = plan(passed);
  assert.equal(second.nextGroup, 50);
  assert.deepEqual(second.pending, words.slice(50, 100).map(({ id }) => id));
});

test("an unfinished batch and its book cursor survive saving, reloading, and a new day", () => {
  const active = rememberBookReviewWord(plan(emptyBookReview()), "word-0");
  const restored = normalizeBookReview(JSON.parse(JSON.stringify(active)), groups, words);
  assert.deepEqual(plan(restored), active);
  assert.equal(restored.pending.length, 49);
});

test("the last partial batch keeps complete pairs, then a completed book can restart from the front", () => {
  const last = plan({ nextGroup: 50, pending: [] });
  assert.equal(last.nextGroup, 53);
  assert.deepEqual(last.pending, words.slice(100).map(({ id }) => id));
  const passed = last.pending.reduce(rememberBookReviewWord, last);
  assert.deepEqual(plan(passed), plan(emptyBookReview()));
});

test("invalid saved progress is safe and stale or duplicated word IDs are removed", () => {
  for (const value of [null, {}, { nextGroup: -1 }, { nextGroup: 1.5 }, { nextGroup: "25" }]) {
    assert.deepEqual(normalizeBookReview(value, groups, words), emptyBookReview());
  }
  assert.deepEqual(normalizeBookReview({ nextGroup: 1000, pending: ["word-3", "deleted", "word-3", null] }, groups, words), {
    nextGroup: 53,
    pending: ["word-3"],
  });
});
