export const BOOK_REVIEW_WORDS = 50;

/** Scan from the front on every round, keeping an incomplete pair together. */
export function bookReviewIndices(
  words: { id: string }[],
  known: ReadonlySet<string>,
  groups: { indices: number[] }[],
): number[] {
  const indices: number[] = [];
  for (const group of groups) {
    if (group.indices.every((index) => known.has(words[index].id))) continue;
    if (indices.length + group.indices.length > BOOK_REVIEW_WORDS) break;
    indices.push(...group.indices);
  }
  return indices;
}
