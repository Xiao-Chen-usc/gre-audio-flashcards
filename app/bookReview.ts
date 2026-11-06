export const BOOK_REVIEW_WORDS = 50;

/** Review only explicitly unfamiliar pairs, in book order, without unseen filler. */
export function bookReviewIndices(
  words: { id: string }[],
  hard: ReadonlySet<string>,
  groups: { indices: number[] }[],
): number[] {
  const indices: number[] = [];
  for (const group of groups) {
    if (!group.indices.some((index) => hard.has(words[index].id))) continue;
    if (indices.length + group.indices.length > BOOK_REVIEW_WORDS) break;
    indices.push(...group.indices);
  }
  return indices;
}
