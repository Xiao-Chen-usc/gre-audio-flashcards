import assert from "node:assert/strict";
import test from "node:test";
import { collectionFromHash, collectionHash, collectionStorageKeys } from "../app/collections.ts";

test("existing collection hashes and progress keys stay unchanged", () => {
  assert.equal(collectionHash("synonyms"), "");
  assert.equal(collectionHash("synonyms", true), "#words");
  assert.equal(collectionHash("collected"), "#collected");
  assert.equal(collectionHash("collected", true), "#collected-words");
  assert.deepEqual(collectionStorageKeys("synonyms"), { memory: "gre-voice-memory-v1", history: "gre-voice-history-v1" });
  assert.deepEqual(collectionStorageKeys("collected"), { memory: "gre-collected-memory-v1", history: "gre-collected-history-v1" });
});

test("Magoosh home and word-list links reload into the correct collection", () => {
  assert.equal(collectionHash("magoosh"), "#magoosh");
  assert.equal(collectionHash("magoosh", true), "#magoosh-words");
  for (const collection of ["synonyms", "collected", "magoosh"]) {
    assert.equal(collectionFromHash(collectionHash(collection)), collection);
    assert.equal(collectionFromHash(collectionHash(collection, true)), collection);
  }
});

test("all three libraries have separate memory and history keys", () => {
  const keys = ["synonyms", "collected", "magoosh"].flatMap((collection) => Object.values(collectionStorageKeys(collection)));
  assert.equal(new Set(keys).size, 6);
  assert.deepEqual(collectionStorageKeys("magoosh"), { memory: "gre-magoosh-common-memory-v1", history: "gre-magoosh-common-history-v1" });
});
