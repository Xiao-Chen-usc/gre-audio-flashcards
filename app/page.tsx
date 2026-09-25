"use client";

import Link from "next/link";
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { EXAMPLES } from "./exampleData";
import { EXAMPLE_AUDIO } from "./exampleAudio";
import { getOriginView } from "./originEngine";
import {
  type DailyProgress,
  type History,
  type SavedState,
  WORD_PAIRS,
  emptyDailyProgress,
  groupKeyOf,
  loadHistory,
  loadSaved,
  localDateKey,
  pairKey,
  saveHistory,
  saveSaved,
  shuffled,
} from "./progress";
import { WORDS, type WordCard } from "./wordData";

type SessionMode = "new" | "review" | "recall" | "all";

type ProgressExport = {
  learnedWords: string[];
  reviewWords: string[];
  // Optional so exports stay importable by builds that predate it.
  history?: History;
};

const DAILY_NEW_TARGET = 100;
const DAILY_REVIEW_TARGET = 40;
const RECALL_SESSION_SIZE = 20;

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 9.5v5h3.4l4.1 3.4V6.1L7.4 9.5H4Zm11.3-.7a4.6 4.6 0 0 1 0 6.4m2.6-9.1a8.2 8.2 0 0 1 0 11.8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8 3.5-2.1-1.2.1-2.4-2.4-1.4-2 1.3L11.5 7 9.4 8.3l-2-1.3L5 8.4l.1 2.4L3 12l2.1 1.2L5 15.6 7.4 17l2-1.3 2.1 1.3 2.1-1.3 2 1.3 2.4-1.4-.1-2.4L20 12Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function bestSpeechVoice(
  voices: SpeechSynthesisVoice[],
  language: "en-US" | "zh-CN",
) {
  const candidates = voices.filter((voice) =>
    language === "zh-CN"
      ? /^zh(?:-CN|-Hans)?$/i.test(voice.lang)
      : /^en-US$/i.test(voice.lang),
  );
  return (
    candidates
      .map((voice) => {
        const name = voice.name;
        let score = voice.default ? 2 : 0;
        if (language === "zh-CN") {
          if (/Xiaoxiao.*Natural|Xiaoyi.*Natural|Yunxi.*Natural/i.test(name)) score += 100;
          else if (/Google.*普通话|Google.*Mandarin/i.test(name)) score += 90;
          else if (/Tingting|Ting-Ting|Yu-shu|Mandarin/i.test(name)) score += 80;
          else if (/Xiaoxiao|Xiaoyi|Yunxi/i.test(name)) score += 70;
          if (/Huihui|Kangkang|Hanhan|Compact|eSpeak/i.test(name)) score -= 80;
        } else {
          if (/Ava.*Premium|Samantha.*Premium|Zoe.*Premium/i.test(name)) score += 100;
          else if (/Aria.*Natural|Jenny.*Natural/i.test(name)) score += 90;
          else if (/Samantha|Google US English|Ava|Zoe/i.test(name)) score += 80;
          if (/Compact|eSpeak/i.test(name)) score -= 60;
        }
        return { score, voice };
      })
      .sort((a, b) => b.score - a.score)[0]?.voice ?? null
  );
}

function highlightedExample(text: string, terms: string[]) {
  const cleaned = terms
    .flatMap((term) => term.split(/\s*&\s*|\s+/))
    .map((term) => term.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, ""))
    .filter((term) => term.length > 3);
  if (!cleaned.length) return text;
  const pattern = new RegExp(
    `(${cleaned.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi",
  );
  return text.split(pattern).map((part, index) =>
    cleaned.some((term) => term.toLowerCase() === part.toLowerCase()) ? (
      <mark key={`${part}-${index}`}>{part}</mark>
    ) : (
      part
    ),
  );
}

export default function Home() {
  const [hydrated, setHydrated] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [hard, setHard] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<History>({});
  const [daily, setDaily] = useState<DailyProgress>(emptyDailyProgress);
  const [sessionSize, setSessionSize] = useState(10);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [rate, setRate] = useState(0.82);
  const [queue, setQueue] = useState<number[]>([]);
  const [position, setPosition] = useState(0);
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [sessionKnown, setSessionKnown] = useState(0);
  const [sessionAgain, setSessionAgain] = useState(0);
  const [sessionMode, setSessionMode] = useState<SessionMode>("new");
  const [speechMessage, setSpeechMessage] = useState("");
  const [exampleAudioState, setExampleAudioState] = useState<"idle" | "loading" | "playing">("idle");
  const exampleWorkerRef = useRef<Worker | null>(null);
  const exampleRequestRef = useRef(0);
  const exampleUrlRef = useRef<string | null>(null);
  const exampleBusyRef = useRef(false);
  const exampleAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastSpokenRef = useRef("");
  const speechRunRef = useRef(0);
  const creditedThisSessionRef = useRef(new Set<string>());
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const currentIndex = queue[position];
  const card: WordCard | undefined =
    currentIndex === undefined ? undefined : WORDS[currentIndex];

  /* Local storage is an external source; hydrate it once after the client mounts. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const saved = loadSaved();
      if (saved) {
        setKnown(new Set(saved.known ?? []));
        setHard(new Set(saved.hard ?? []));
        setDaily(
          saved.daily?.date === localDateKey()
            ? saved.daily
            : emptyDailyProgress(),
        );
        setSessionSize(saved.sessionSize ?? 10);
        setAutoSpeak(saved.autoSpeak ?? true);
        setRate(saved.rate ?? 0.82);
      }
    } catch {
      // A corrupt local preference should never block studying.
    }
    setHistory(loadHistory());
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    const saved: SavedState = {
      known: [...known],
      hard: [...hard],
      daily,
      sessionSize,
      autoSpeak,
      rate,
    };
    saveSaved(saved);
  }, [autoSpeak, daily, hard, hydrated, known, rate, sessionSize]);

  useEffect(() => {
    if (hydrated) saveHistory(history);
  }, [history, hydrated]);

  const exportProgress = useCallback(() => {
    const progress: ProgressExport = {
      learnedWords: [...new Set([...known, ...hard])],
      reviewWords: [...hard],
      history,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(progress, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "gre-progress.json";
    link.click();
    URL.revokeObjectURL(url);
  }, [hard, history, known]);

  const importProgress = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = "";
      if (!file) return;

      try {
        const progress = JSON.parse(await file.text()) as Partial<ProgressExport>;
        if (
          !Array.isArray(progress.learnedWords) ||
          !Array.isArray(progress.reviewWords) ||
          !progress.learnedWords.every((value) => typeof value === "string") ||
          !progress.reviewWords.every((value) => typeof value === "string")
        ) {
          window.alert("导入失败");
          return;
        }

        const learned = new Set(progress.learnedWords);
        const review = new Set(progress.reviewWords);
        const saved: SavedState = {
          known: [...learned].filter((id) => !review.has(id)),
          hard: [...review],
          daily,
          sessionSize,
          autoSpeak,
          rate,
        };
        saveSaved(saved);
        if (
          progress.history &&
          typeof progress.history === "object" &&
          !Array.isArray(progress.history)
        ) {
          saveHistory(progress.history);
        }
        window.location.reload();
      } catch {
        window.alert("导入失败");
      }
    },
    [autoSpeak, daily, rate, sessionSize],
  );

  const stopExampleAudio = useCallback(() => {
    exampleBusyRef.current = false;
    exampleRequestRef.current += 1;
    exampleWorkerRef.current?.postMessage({id: exampleRequestRef.current});
    if (exampleUrlRef.current) URL.revokeObjectURL(exampleUrlRef.current);
    exampleUrlRef.current = null;
    const audio = exampleAudioRef.current;
    exampleAudioRef.current = null;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.onplaying = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setExampleAudioState("idle");
  }, []);

  useEffect(() => () => {
    exampleWorkerRef.current?.terminate();
    if (exampleUrlRef.current) URL.revokeObjectURL(exampleUrlRef.current);
    exampleAudioRef.current?.pause();
    exampleAudioRef.current = null;
  }, []);

  useEffect(() => {
    if (exampleAudioRef.current) exampleAudioRef.current.playbackRate = rate;
  }, [rate]);

  const playExample = useCallback((key: string, text: string) => {
    if (exampleBusyRef.current) { stopExampleAudio(); setSpeechMessage(""); return; }
    exampleBusyRef.current = true;
    const id = ++exampleRequestRef.current;
    speechRunRef.current += 1;
    window.speechSynthesis?.cancel();
    setExampleAudioState("loading");
    setSpeechMessage("");
    const play = (source: string) => {
      if (id !== exampleRequestRef.current) return;
      const audio = new Audio(source);
      exampleAudioRef.current = audio;
      audio.playbackRate = rate;
      audio.preservesPitch = true;
      const failed = (error?: {name?: string}) => {
        if (id !== exampleRequestRef.current) return;
        stopExampleAudio();
        setSpeechMessage(error?.name === "NotAllowedError" ? "音频已缓存，请再点一次朗读。" : "例句音频未能播放，请检查网络后重试。");
      };
      audio.onplaying = () => { if (id === exampleRequestRef.current) { setExampleAudioState("playing"); setSpeechMessage(""); } };
      audio.onended = () => { if (id === exampleRequestRef.current) stopExampleAudio(); };
      audio.onerror = () => failed();
      void audio.play().catch(failed);
    };
    if (EXAMPLE_AUDIO[key]) {
      const basePath = window.location.pathname.replace(/\/$/, "");
      play(`${basePath}${EXAMPLE_AUDIO[key]}`);
      return;
    }
    try {
      const worker = exampleWorkerRef.current ??= new Worker(new URL("./kokoro.worker.ts", import.meta.url), {type: "module"});
      worker.onmessage = (event) => {
        const data = event.data;
        if (data.id !== exampleRequestRef.current) return;
        if (data.type === "progress") setSpeechMessage(data.message);
        if (data.type === "ready") { const url = URL.createObjectURL(data.blob); exampleUrlRef.current = url; play(url); }
        if (data.type === "error") { console.error("Kokoro:", data.detail); stopExampleAudio(); setSpeechMessage(data.message); }
      };
      worker.onerror = () => { stopExampleAudio(); worker.terminate(); exampleWorkerRef.current = null; setSpeechMessage("语音引擎未能启动，请重试或使用新版 Chrome / Edge。"); };
      worker.postMessage({id, text});
    } catch { stopExampleAudio(); setSpeechMessage("当前浏览器无法启动 Kokoro 语音，请使用新版 Chrome / Edge。"); }
  }, [rate, stopExampleAudio]);

  const speak = useCallback(
    (text: string, force = false, language: "en-US" | "zh-CN" = "en-US") => {
      if (!force && !autoSpeak) return;
      stopExampleAudio();
      if (!("speechSynthesis" in window)) {
        setSpeechMessage("当前浏览器不支持朗读，建议使用 Chrome、Edge 或 Safari。");
        return;
      }
      speechRunRef.current += 1;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = rate;
      utterance.pitch = 1;
      const voices = window.speechSynthesis.getVoices();
      utterance.voice = bestSpeechVoice(voices, language);
      utterance.onerror = () =>
        setSpeechMessage("没有成功发声，请点一下喇叭后再试。");
      utterance.onstart = () => setSpeechMessage("");
      window.speechSynthesis.speak(utterance);
    },
    [autoSpeak, rate, stopExampleAudio],
  );

  const speakMeaningAndWord = useCallback(
    (meaning: string, word: string) => {
      stopExampleAudio();
      if (!("speechSynthesis" in window)) {
        setSpeechMessage("当前浏览器不支持朗读，建议使用 Chrome、Edge 或 Safari。");
        return;
      }
      const run = speechRunRef.current + 1;
      speechRunRef.current = run;
      window.speechSynthesis.cancel();
      const voices = window.speechSynthesis.getVoices();
      const chinese = new SpeechSynthesisUtterance(meaning);
      chinese.lang = "zh-CN";
      chinese.rate = rate;
      chinese.pitch = 1;
      chinese.voice = bestSpeechVoice(voices, "zh-CN");
      const english = new SpeechSynthesisUtterance(word);
      english.lang = "en-US";
      english.rate = rate;
      english.pitch = 1;
      english.voice = bestSpeechVoice(voices, "en-US");
      chinese.onstart = () => setSpeechMessage("");
      chinese.onerror = () =>
        setSpeechMessage("中文没有成功发声，请点一下喇叭后再试。");
      chinese.onend = () => {
        if (speechRunRef.current === run) {
          window.speechSynthesis.speak(english);
        }
      };
      english.onerror = () =>
        setSpeechMessage("英文没有成功发声，请点一下喇叭后再试。");
      window.speechSynthesis.speak(chinese);
    },
    [rate, stopExampleAudio],
  );

  useEffect(() => {
    if (
      started &&
      !complete &&
      card &&
      autoSpeak &&
      lastSpokenRef.current !== card.id
    ) {
      lastSpokenRef.current = card.id;
      speak(card.word);
    }
  }, [autoSpeak, card, complete, speak, started]);

  const buildPool = useCallback(
    (mode: SessionMode) => {
      if (mode === "recall") {
        // Longest-unreviewed mastered pairs first. Pairs with no history
        // (mastered before history was recorded) count as oldest; the stable
        // sort keeps those in PDF order.
        const mastered = WORD_PAIRS.filter(({ indices }) =>
          indices.every((index) => known.has(WORDS[index].id)),
        ).sort(
          (a, b) => (history[a.key]?.seen ?? 0) - (history[b.key]?.seen ?? 0),
        );
        return shuffled(
          mastered
            .flatMap(({ indices }) => indices)
            .slice(0, RECALL_SESSION_SIZE),
        );
      }
      const eligiblePairs = WORD_PAIRS.filter(({ indices }) => {
        if (mode === "new") {
          const hasHardCard = indices.some((index) =>
            hard.has(WORDS[index].id),
          );
          const hasUnseenCard = indices.some(
            (index) =>
              !known.has(WORDS[index].id) && !hard.has(WORDS[index].id),
          );
          return !hasHardCard && hasUnseenCard;
        }
        if (mode === "review") {
          return indices.some((index) => hard.has(WORDS[index].id));
        }
        return true;
      });

      // The source PDF is organized as adjacent synonym pairs. Enqueue the
      // complete pair so 1→2, 3→4 can never become 1→4.
      const evenSessionSize = Math.max(2, sessionSize - (sessionSize % 2));
      if (mode === "review") {
        // Most recently marked 还不熟 first; pairs without a timestamp
        // (marked before history was recorded) go last, in PDF order.
        const recent = [...eligiblePairs].sort(
          (a, b) =>
            (history[b.key]?.hardAt ?? 0) - (history[a.key]?.hardAt ?? 0),
        );
        // Shuffle so the first word of a pair no longer gives away the second.
        return shuffled(
          recent.flatMap(({ indices }) => indices).slice(0, evenSessionSize),
        );
      }
      return eligiblePairs
        .flatMap(({ indices }) => indices)
        .slice(0, evenSessionSize);
    },
    [hard, history, known, sessionSize],
  );

  const begin = useCallback(
    (mode: SessionMode = "new") => {
      const nextQueue = buildPool(mode);
      if (!nextQueue.length) return;
      const first = WORDS[nextQueue[0]];
      setQueue(nextQueue);
      setPosition(0);
      setStarted(true);
      setComplete(false);
      setRevealed(false);
      setSettingsOpen(false);
      setSessionKnown(0);
      setSessionAgain(0);
      setSessionMode(mode);
      creditedThisSessionRef.current = new Set();
      lastSpokenRef.current = first.id;
      speak(first.word, true);
    },
    [buildPool, speak],
  );

  const advance = useCallback(() => {
    stopExampleAudio();
    setRevealed(false);
    setPosition((value) => {
      if (value + 1 >= queue.length) {
        setComplete(true);
        return value;
      }
      return value + 1;
    });
  }, [queue.length, stopExampleAudio]);

  const markKnown = useCallback(() => {
    if (!card) return;
    if (!creditedThisSessionRef.current.has(card.id)) {
      creditedThisSessionRef.current.add(card.id);
      setDaily((old) => ({
        ...old,
        newCompleted: old.newCompleted + (sessionMode === "new" ? 1 : 0),
        reviewCompleted:
          old.reviewCompleted +
          (sessionMode === "review" || sessionMode === "recall" ? 1 : 0),
      }));
    }
    const group = groupKeyOf(card.id);
    const now = Date.now();
    setHistory((old) => ({ ...old, [group]: { ...old[group], seen: now } }));
    setKnown((old) => new Set(old).add(card.id));
    setHard((old) => {
      const next = new Set(old);
      next.delete(card.id);
      return next;
    });
    setSessionKnown((value) => value + 1);
    advance();
  }, [advance, card, sessionMode]);

  const markAgain = useCallback(() => {
    if (!card) return;
    if (!creditedThisSessionRef.current.has(card.id)) {
      creditedThisSessionRef.current.add(card.id);
      setDaily((old) => ({
        ...old,
        newCompleted: old.newCompleted + (sessionMode === "new" ? 1 : 0),
        reviewCompleted:
          old.reviewCompleted +
          (sessionMode === "review" || sessionMode === "recall" ? 1 : 0),
      }));
    }
    const group = groupKeyOf(card.id);
    const now = Date.now();
    setHistory((old) => ({
      ...old,
      [group]: { ...old[group], seen: now, hardAt: now },
    }));
    // Forgetting a mastered word sends the whole pair back to 不熟.
    const moved =
      sessionMode === "recall"
        ? (WORD_PAIRS.find(({ key }) => key === group)?.indices ?? []).map(
            (index) => WORDS[index].id,
          )
        : [card.id];
    setHard((old) => {
      const next = new Set(old);
      moved.forEach((id) => next.add(id));
      return next;
    });
    setKnown((old) => {
      const next = new Set(old);
      moved.forEach((id) => next.delete(id));
      return next;
    });
    setSessionAgain((value) => value + 1);
    advance();
  }, [advance, card, sessionMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!started || complete || settingsOpen || !card) return;
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLButtonElement
      ) {
        return;
      }
      if (event.code === "Space" || event.key === "Enter") {
        event.preventDefault();
        setRevealed(true);
      } else if (event.key.toLowerCase() === "r") {
        speak(card.word, true);
      } else if (event.key.toLowerCase() === "c" && revealed) {
        speakMeaningAndWord(card.meaning, card.word);
      } else if (event.key === "1" && revealed) {
        markAgain();
      } else if (event.key === "2" && revealed) {
        markKnown();
      } else if (event.key === "ArrowRight") {
        advance();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    advance,
    card,
    complete,
    markAgain,
    markKnown,
    revealed,
    settingsOpen,
    speak,
    speakMeaningAndWord,
    started,
  ]);

  const masteredPairs = WORD_PAIRS.filter(({ indices }) =>
    indices.every((index) => known.has(WORDS[index].id)),
  ).length;
  const fullProgress = Math.round((known.size / WORDS.length) * 100);
  const newRemaining = Math.max(0, WORDS.length - known.size - hard.size);
  const newDailyProgress = Math.min(
    100,
    Math.round((daily.newCompleted / DAILY_NEW_TARGET) * 100),
  );
  const reviewDailyProgress = Math.min(
    100,
    Math.round((daily.reviewCompleted / DAILY_REVIEW_TARGET) * 100),
  );
  const sessionProgress = queue.length
    ? Math.min(100, Math.round((position / queue.length) * 100))
    : 0;
  const wordLength = Math.max(card?.word.length ?? 1, 8);
  const wordFontSize = `clamp(1.15rem, ${Math.min(14, 145 / wordLength)}vw, 5.4rem)`;

  if (!hydrated) {
    return (
      <main className="app-shell loading-shell">
        <div className="loading-dot" />
        <p>正在整理你的词卡…</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      {!started ? (
        <section className="welcome" aria-labelledby="welcome-title">
          <div className="brand-mark" aria-hidden="true">
            A<span>音</span>
          </div>
          <p className="eyebrow">ADHD 友好 · 声音记忆模式</p>
          <h1 id="welcome-title">GRE同义词<br />一千速记</h1>
          <p className="welcome-copy">
            一次只记一个词。切到新词就自动念出来，再用等价词、词源和例句加深记忆。
          </p>
          <div className="welcome-stats" aria-label="学习进度">
            <div><strong>{WORDS.length}</strong><span>张发声词卡</span></div>
            <div><strong>{known.size}</strong><span>已经记住</span></div>
            <div><strong>{hard.size}</strong><span>不熟词库</span></div>
          </div>
          <Link className="word-list-link" href="/words">
            查看全部词表 · 掌握地图 <span>→</span>
          </Link>
          <div className="session-choice">
            <span>本轮</span>
            {[10, 20, 50].map((size) => (
              <button
                className={sessionSize === size ? "chip chip--active" : "chip"}
                key={size}
                onClick={() => setSessionSize(size)}
                type="button"
              >
                {size} 词
              </button>
            ))}
          </div>
          <div className="daily-sections">
            <section className="daily-section daily-section--new">
              <div className="daily-section-heading">
                <span>01 · 今日新词</span>
                <strong>{daily.newCompleted} / {DAILY_NEW_TARGET}</strong>
              </div>
              <div className="daily-progress" aria-label="今日新词进度">
                <span style={{ width: `${newDailyProgress}%` }} />
              </div>
              <p>按 PDF 原顺序学习；相邻的同义词始终成对出现。每天建议约 100 个。</p>
              <button
                disabled={!newRemaining}
                onClick={() => begin("new")}
                type="button"
              >
                {newRemaining ? "按顺序学习新词" : "新词已经全部刷过"} <span>→</span>
              </button>
            </section>
            <section className="daily-section daily-section--review">
              <div className="daily-section-heading">
                <span>02 · 今日复习</span>
                <strong>{daily.reviewCompleted} / {DAILY_REVIEW_TARGET}</strong>
              </div>
              <div className="daily-progress" aria-label="今日复习进度">
                <span style={{ width: `${reviewDailyProgress}%` }} />
              </div>
              <p>先复习最近标记的不熟词；同义词对一起出，顺序打乱。</p>
              <button
                disabled={!hard.size}
                onClick={() => begin("review")}
                type="button"
              >
                {hard.size ? "复习不熟词" : "不熟词库目前为空"} <span>→</span>
              </button>
            </section>
            <section className="daily-section daily-section--recall">
              <div className="daily-section-heading">
                <span>03 · 复习已掌握</span>
              </div>
              <p>从最早记住的词里抽 {RECALL_SESSION_SIZE} 个，打乱顺序再考一次。想不起来的整对放回不熟库。</p>
              <button
                disabled={!masteredPairs}
                onClick={() => begin("recall")}
                type="button"
              >
                {masteredPairs ? `抽 ${RECALL_SESSION_SIZE} 个已掌握的词` : "还没有已掌握的词"} <span>→</span>
              </button>
            </section>
          </div>
          <p className="privacy-note">
            进度只保存在这台电脑。建议戴耳机，完成一小轮就停一下。
          </p>
        </section>
      ) : (
        <div className="study-layout">
          <header className="topbar">
            <button
              className="wordmark"
              onClick={() => {
                setStarted(false);
                setComplete(false);
                stopExampleAudio();
                window.speechSynthesis?.cancel();
              }}
              type="button"
            >
              <span>A音</span> GRE同义词一千速记
            </button>
            <div className="topbar-center">
              <span>{autoSpeak ? "自动朗读 开" : "自动朗读 关"}</span>
              <i />
              <span>{known.size} / {WORDS.length} 已掌握</span>
            </div>
            <button
              aria-label="打开设置"
              className="icon-button settings-button"
              onClick={() => setSettingsOpen(true)}
              type="button"
            >
              <SettingsIcon />
            </button>
          </header>
          <div className="progress-track" aria-label="本轮学习进度">
            <span style={{ width: `${complete ? 100 : sessionProgress}%` }} />
          </div>
          {complete ? (
            <section className="complete-card">
              <div className="complete-orbit">✓</div>
              <p className="eyebrow">这一轮完成</p>
              <h2>很好，先让大脑喘口气。</h2>
              <p>
                本轮记住 <strong>{sessionKnown}</strong> 个，标记待加强{" "}
                <strong>{sessionAgain}</strong> 次。
              </p>
              <div className="complete-actions">
                <button onClick={() => begin(sessionMode)} type="button">
                  继续这一类 {sessionMode === "recall" ? RECALL_SESSION_SIZE : sessionSize} 词
                </button>
                <button
                  className="secondary-button"
                  onClick={() => setStarted(false)}
                  type="button"
                >
                  查看今日两项进度
                </button>
              </div>
              <button className="quiet-link" onClick={() => setStarted(false)} type="button">
                回到首页
              </button>
            </section>
          ) : card ? (
            <section className="study-stage">
              <div className="card-meta">
                <span>本轮 {position + 1} / {queue.length}</span>
                <span>词表第 {card.page} 页</span>
              </div>
              <article className={revealed ? "flashcard is-open" : "flashcard"}>
                <div className="word-zone">
                  <button
                    aria-label={`朗读 ${card.word}`}
                    className="speaker-button"
                    onClick={() => speak(card.word, true)}
                    type="button"
                  >
                    <SpeakerIcon /><span>再听一次</span><kbd>R</kbd>
                  </button>
                  <h1 className="study-word" style={{ fontSize: wordFontSize }}>
                    {card.word}
                  </h1>
                  <p className="listen-prompt">
                    {revealed ? "答案已展开" : "先听发音，在脑中说出它的意思"}
                  </p>
                </div>
                {!revealed ? (
                  <button className="reveal-button" onClick={() => setRevealed(true)} type="button">
                    显示答案 <span>Space</span>
                  </button>
                ) : (
                  <div className="answer-zone">
                    <div className="meaning-block">
                      <span className="answer-label">中文</span>
                      <button
                        aria-label={`先朗读中文释义，再朗读英文单词：${card.meaning}，${card.word}`}
                        className="meaning-speak-button"
                        onClick={() =>
                          speakMeaningAndWord(card.meaning, card.word)
                        }
                        type="button"
                      >
                        <strong>{card.meaning}</strong>
                        <span>
                          <SpeakerIcon />
                          <kbd>C</kbd>
                        </span>
                      </button>
                    </div>
                    <div className="pair-block">
                      <span className="answer-label">六选二等价词</span>
                      <button onClick={() => speak(card.pair, true)} type="button">
                        <span>{card.pair}</span><SpeakerIcon />
                      </button>
                    </div>
                    <details className="origin-block" key={card.id}>
                      <summary className="origin-heading">
                        <span className="answer-label">词源 · Origin</span>
                        <span className="origin-toggle">
                          <span className="origin-toggle-closed">展开全文 ⌄</span>
                          <span className="origin-toggle-open">收起 ⌃</span>
                        </span>
                      </summary>
                      <div className="origin-content">
                        <a
                          href={`https://www.etymonline.com.cn/word/${encodeURIComponent(card.originQuery)}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          完整词源 ↗
                        </a>
                        {(() => {
                          const details = getOriginView(card);
                          return details.paragraph ? (
                            <p className="origin-paragraph">{details.paragraph}</p>
                          ) : null;
                        })()}
                      </div>
                    </details>
                    {(() => {
                      const key = pairKey(card.id);
                      const example = key ? EXAMPLES[key] : undefined;
                      return example ? (
                        <section className="example-block">
                          <div className="example-heading">
                            <span>
                              <b>GRE 语境例句</b>
                              <small>OCR 提取文字 · 可复制、可缩放</small>
                            </span>
                            <em>原书第 {card.page} 页</em>
                          </div>
                          {key && example.english?.trim() ? (
                            <button
                              className="example-speak-button"
                              type="button"
                              aria-label={exampleAudioState === "idle" ? "朗读英文例句" : "停止例句朗读"}
                              aria-pressed={exampleAudioState !== "idle"}
                              onClick={() => playExample(key, example.english)}
                            >
                              <SpeakerIcon /> {exampleAudioState === "loading" ? "正在加载 · 点击取消" : exampleAudioState === "playing" ? "停止朗读" : "朗读英文例句"}
                            </button>
                          ) : null}
                          {key && example.english?.trim() ? <small className="example-voice-note">Kokoro AI · 美式女声{!EXAMPLE_AUDIO[key] ? " · 首次需下载模型，之后缓存复用" : ""}</small> : null}
                          <p className="example-english">
                            {example.english
                              ? highlightedExample(example.english, [
                                  card.word,
                                  card.pair,
                                ])
                              : `${card.word} 与 ${card.pair} 在原例句中构成等价表达。`}
                          </p>
                          <p className="example-chinese">
                            {example.chinese ||
                              "中文 OCR 暂未识别完整，请以原 PDF 为准。"}
                          </p>
                        </section>
                      ) : null;
                    })()}
                    <div className="answer-actions">
                      <button className="again-button" onClick={markAgain} type="button">
                        <span>还不熟</span><kbd>1</kbd>
                      </button>
                      <button className="known-button" onClick={markKnown} type="button">
                        <span>记住了</span><kbd>2</kbd>
                      </button>
                    </div>
                  </div>
                )}
              </article>
              <div className="under-card">
                <button onClick={advance} type="button">跳过这个词 <span>→</span></button>
                <p><kbd>Space</kbd> 翻开 · <kbd>R</kbd> 重听 · <kbd>1</kbd>/<kbd>2</kbd> 反馈</p>
              </div>
              {speechMessage ? <p className="speech-message" role="status">{speechMessage}</p> : null}
            </section>
          ) : null}
        </div>
      )}
      {settingsOpen ? (
        <div
          aria-modal="true"
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSettingsOpen(false);
          }}
          role="dialog"
        >
          <section className="settings-panel">
            <div className="settings-heading">
              <div><p className="eyebrow">学习设置</p><h2>让节奏适合你</h2></div>
              <button aria-label="关闭设置" onClick={() => setSettingsOpen(false)} type="button">×</button>
            </div>
            <div className="setting-row">
              <div><strong>切词自动朗读</strong><span>每张新卡出现时自动念一次</span></div>
              <button
                aria-pressed={autoSpeak}
                className={autoSpeak ? "toggle is-on" : "toggle"}
                onClick={() => setAutoSpeak((value) => !value)}
                type="button"
              ><i /></button>
            </div>
            <label className="slider-setting">
              <span><strong>朗读速度</strong><b>{rate.toFixed(2)}×</b></span>
              <input
                max="1.1"
                min="0.6"
                onChange={(event) => setRate(Number(event.target.value))}
                step="0.02"
                type="range"
                value={rate}
              />
              <small>慢一些更容易分辨音节</small>
            </label>
            <div className="setting-stack">
              <strong>每轮词数</strong>
              <div className="session-choice session-choice--panel">
                {[10, 25, 50].map((size) => (
                  <button
                    className={sessionSize === size ? "chip chip--active" : "chip"}
                    key={size}
                    onClick={() => setSessionSize(size)}
                    type="button"
                  >{size}</button>
                ))}
              </div>
            </div>
            <div className="mastery-summary">
              <span style={{ width: `${fullProgress}%` }} />
              <p>
                总进度 <strong>{fullProgress}%</strong> · {known.size} 已掌握 ·{" "}
                {hard.size} 个不熟词
              </p>
            </div>
            <div className="progress-transfer">
              <button onClick={exportProgress} type="button">导出学习数据</button>
              <button onClick={() => importInputRef.current?.click()} type="button">
                导入学习数据
              </button>
              <input
                ref={importInputRef}
                accept="application/json,.json"
                aria-label="选择要导入的学习数据"
                onChange={importProgress}
                type="file"
              />
            </div>
            <button
              className={resetArmed ? "reset-button is-armed" : "reset-button"}
              onClick={() => {
                if (!resetArmed) {
                  setResetArmed(true);
                  return;
                }
                setKnown(new Set());
                setHard(new Set());
                setHistory({});
                setDaily(emptyDailyProgress());
                setResetArmed(false);
              }}
              type="button"
            >
              {resetArmed ? "再点一次，确认清空进度" : "清空本机学习进度"}
            </button>
            <p className="source-note">
              词表来自你上传的《学而思 GRE 高频六选二等价1000词（2026版）》；
              词源为便于记忆的简化整理。
            </p>
          </section>
        </div>
      ) : null}
    </main>
  );
}
