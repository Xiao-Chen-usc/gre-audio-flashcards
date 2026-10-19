export const BOOK_REVIEW_GROUPS = 25;
export const BOOK_REVIEW_WORDS = 50;
export const BOOK_REVIEW_KEY = "gre-voice-book-review-v1";

export type BookReviewState = {
  nextGroup: number;
  pending: string[];
};

type ReviewWord = { id: string };
type ReviewGroup = { indices: number[] };

export function emptyBookReview(): BookReviewState {
  return { nextGroup: 0, pending: [] };
}

export function normalizeBookReview(
  value: unknown,
  groups: ReviewGroup[],
  words: ReviewWord[],
): BookReviewState {
  if (!value || typeof value !== "object") return emptyBookReview();
  const saved = value as Partial<BookReviewState>;
  if (typeof saved.nextGroup !== "number" || !Number.isInteger(saved.nextGroup) || saved.nextGroup < 0) {
    return emptyBookReview();
  }
  const validIds = new Set(words.map(({ id }) => id));
  return {
    nextGroup: Math.min(saved.nextGroup, groups.length),
    pending: Array.isArray(saved.pending)
      ? [...new Set(saved.pending.filter((id) => typeof id === "string" && validIds.has(id)))]
      : [],
  };
}

/** Finish the current batch before taking the next 25 groups in book order. */
export function nextBookReview(
  state: BookReviewState,
  groups: ReviewGroup[],
  words: ReviewWord[],
): BookReviewState {
  const current = normalizeBookReview(state, groups, words);
  if (current.pending.length) return current;
  const start = current.nextGroup < groups.length ? current.nextGroup : 0;
  const batch = groups.slice(start, start + BOOK_REVIEW_GROUPS);
  return {
    nextGroup: start + batch.length,
    pending: batch.flatMap(({ indices }) => indices.map((index) => words[index].id)),
  };
}

/** Only a remembered answer leaves the batch; failures and skips stay pending. */
export function rememberBookReviewWord(
  state: BookReviewState,
  id: string,
): BookReviewState {
  return { ...state, pending: state.pending.filter((pendingId) => pendingId !== id) };
}
