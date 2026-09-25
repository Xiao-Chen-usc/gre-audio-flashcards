import { WORDS } from "./wordData";

export type DailyProgress = {
  date: string;
  newCompleted: number;
  reviewCompleted: number;
};

export type SavedState = {
  known: string[];
  hard: string[];
  daily?: DailyProgress;
  sessionSize: number;
  autoSpeak: boolean;
  rate: number;
};

/** When a pair was last answered, and when it was last marked 还不熟 (ms since epoch). */
export type PairHistory = { seen?: number; hardAt?: number };
export type History = Record<string, PairHistory>;

export const STORAGE_KEY = "gre-voice-memory-v1";
// Kept apart from STORAGE_KEY: older builds rewrite that key with only the
// fields they know, which would silently drop anything added to it.
export const HISTORY_KEY = "gre-voice-history-v1";

export function localDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function emptyDailyProgress(): DailyProgress {
  return { date: localDateKey(), newCompleted: 0, reviewCompleted: 0 };
}

export function pairKey(cardId: string) {
  const match = cardId.match(/^(p\d{2}r\d{2})[ab]$/);
  return match?.[1] ?? null;
}

export type WordPair = {
  key: string;
  indices: number[];
};

export const WORD_PAIRS: WordPair[] = (() => {
  const groups = new Map<string, number[]>();
  WORDS.forEach((card, index) => {
    const key = pairKey(card.id) ?? card.id;
    const indices = groups.get(key) ?? [];
    indices.push(index);
    groups.set(key, indices);
  });
  return [...groups.entries()].map(([key, indices]) => ({ key, indices }));
})();

export function groupKeyOf(cardId: string) {
  return pairKey(cardId) ?? cardId;
}

export function loadSaved(): Partial<SavedState> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<SavedState>) : null;
  } catch {
    return null;
  }
}

export function saveSaved(saved: SavedState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}

export function loadHistory(): History {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as History)
      : {};
  } catch {
    return {};
  }
}

export function saveHistory(history: History) {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // History only orders review rounds; losing it must not block studying.
  }
}

export function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
