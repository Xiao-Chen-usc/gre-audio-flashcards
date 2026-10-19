export const BOOK_REVIEW_WORDS = 50;

/** Scan from the front on every round. Unremembered words keep their place. */
export function bookReviewIndices(
  words: { id: string }[],
  known: ReadonlySet<string>,
): number[] {
  const indices: number[] = [];
  for (let index = 0; index < words.length && indices.length < BOOK_REVIEW_WORDS; index += 1) {
    if (!known.has(words[index].id)) indices.push(index);
  }
  return indices;
}
