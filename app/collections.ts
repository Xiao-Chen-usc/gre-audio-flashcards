export type CollectionId = "synonyms" | "collected" | "magoosh";

export function collectionFromHash(hash: string): CollectionId {
  if (hash.startsWith("#magoosh")) return "magoosh";
  if (hash.startsWith("#collected")) return "collected";
  return "synonyms";
}

export function collectionHash(collection: CollectionId, words = false): string {
  if (collection === "synonyms") return words ? "#words" : "";
  return `#${collection}${words ? "-words" : ""}`;
}

export function collectionStorageKeys(collection: CollectionId) {
  const prefix = collection === "magoosh" ? "gre-magoosh-common" : collection === "collected" ? "gre-collected" : "gre-voice";
  return { memory: `${prefix}-memory-v1`, history: `${prefix}-history-v1` };
}
