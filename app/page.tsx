"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EXAMPLES } from "./exampleData";
import { WORDS, type WordCard } from "./wordData";

type SessionMode = "new" | "review" | "all";

type ReviewRecord = {
  dueAt: number;
  intervalDays: number;
  streak: number;
  lapses: number;
};

type SavedState = {
  known: string[];
  hard: string[];
  reviews?: Record<string, ReviewRecord>;
  sessionSize: number;
  randomOrder: boolean;
  autoSpeak: boolean;
  rate: number;
};

const STORAGE_KEY = "gre-voice-memory-v1";
const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60];
const DAY_MS = 24 * 60 * 60 * 1000;

function shuffled(values: number[]) {
  const next = [...values];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

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

function pairKey(cardId: string) {
  const match = cardId.match(/^(p\d{2}r\d{2})[ab]$/);
  return match?.[1] ?? null;
}

function originDetails(card: WordCard) {
  const raw = card.origin.replace(/^原形 [^；]+；/, "");
  const earlyMeaning =
    raw.match(/早期义 [“"]([^”"]+)[”"]/)?.[1]?.trim() ?? "";
  const chainPart = raw
    .split("｜")
    .find((part) => part.includes("←"))
    ?.replace(/。$/, "")
    .trim();

  let chain = chainPart
    ? chainPart
        .split("←")
        .map((part) => part.trim())
        .filter(Boolean)
        .reverse()
    : [];
  chain = chain.map((node) =>
    node === "英语" ? `现代英语 ${card.originQuery}` : node,
  );
  if (!chain.length) {
    chain = [
      raw.split("｜")[1]?.replace(/。$/, "").trim() || "英语内部构词",
      `现代英语 ${card.originQuery}`,
    ];
  } else if (!chain.at(-1)?.includes(card.originQuery)) {
    chain[chain.length - 1] = `现代英语 ${card.originQuery}`;
  }

  const oldest = chain[0];
  const evidence = `${oldest} ${raw}`;
  let family = "英语内部构词";
  if (/希腊语/.test(evidence)) family = "希腊语词源";
  else if (/拉丁语/.test(evidence)) family = "拉丁语词源";
  else if (/原始日耳曼语|古英语|古诺斯语|荷兰语|德语/.test(evidence)) {
    family = "日耳曼语词源";
  } else if (/法语|古法语/.test(evidence)) family = "罗曼语族 · 法语来源";
  else if (/阿拉伯语/.test(evidence)) family = "阿拉伯语词源";
  else if (/梵语/.test(evidence)) family = "印欧语系 · 梵语同源";

  return { chain, earlyMeaning, family, oldest };
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
  const [reviews, setReviews] = useState<Record<string, ReviewRecord>>({});
  const [sessionSize, setSessionSize] = useState(10);
  const [randomOrder, setRandomOrder] = useState(false);
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
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [speechMessage, setSpeechMessage] = useState("");
  const lastSpokenRef = useRef("");

  const currentIndex = queue[position];
  const card: WordCard | undefined =
    currentIndex === undefined ? undefined : WORDS[currentIndex];

  /* Local storage is an external source; hydrate it once after the client mounts. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<SavedState>;
        setKnown(new Set(saved.known ?? []));
        setHard(new Set(saved.hard ?? []));
        const now = Date.now();
        const migratedReviews = { ...(saved.reviews ?? {}) };
        for (const id of saved.hard ?? []) {
          migratedReviews[id] ??= {
            dueAt: now,
            intervalDays: 0,
            streak: 0,
            lapses: 1,
          };
        }
        for (const id of saved.known ?? []) {
          migratedReviews[id] ??= {
            dueAt: now + DAY_MS,
            intervalDays: 1,
            streak: 1,
            lapses: 0,
          };
        }
        setReviews(migratedReviews);
        setSessionSize(saved.sessionSize ?? 10);
        setRandomOrder(saved.randomOrder ?? false);
        setAutoSpeak(saved.autoSpeak ?? true);
        setRate(saved.rate ?? 0.82);
      }
    } catch {
      // A corrupt local preference should never block studying.
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    const saved: SavedState = {
      known: [...known],
      hard: [...hard],
      reviews,
      sessionSize,
      randomOrder,
      autoSpeak,
      rate,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }, [autoSpeak, hard, hydrated, known, randomOrder, rate, reviews, sessionSize]);

  const dueIds = useMemo(() => {
    const now = Date.now();
    return new Set(
      Object.entries(reviews)
        .filter(([, review]) => review.dueAt <= now)
        .map(([id]) => id),
    );
  }, [reviews]);

  const speak = useCallback(
    (text: string, force = false) => {
      if (!force && !autoSpeak) return;
      if (!("speechSynthesis" in window)) {
        setSpeechMessage("当前浏览器不支持朗读，建议使用 Chrome、Edge 或 Safari。");
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = rate;
      utterance.pitch = 1;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (voice) =>
          voice.lang === "en-US" &&
          /Samantha|Aria|Jenny|Google US English|Microsoft David/i.test(
            voice.name,
          ),
      );
      const fallback = voices.find((voice) => voice.lang === "en-US");
      utterance.voice = preferred ?? fallback ?? null;
      utterance.onerror = () =>
        setSpeechMessage("没有成功发声，请点一下喇叭后再试。");
      utterance.onstart = () => setSpeechMessage("");
      window.speechSynthesis.speak(utterance);
    },
    [autoSpeak, rate],
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
      let pool = WORDS.map((_, index) => index);
      if (mode === "new") {
        const unseen = pool.filter((index) => !known.has(WORDS[index].id));
        pool = unseen.length ? unseen : pool;
      } else if (mode === "review") {
        const review = pool
          .filter((index) => dueIds.has(WORDS[index].id))
          .sort(
            (a, b) =>
              (reviews[WORDS[a].id]?.dueAt ?? 0) -
              (reviews[WORDS[b].id]?.dueAt ?? 0),
          );
        pool = review.length
          ? review
          : pool.filter((index) => hard.has(WORDS[index].id));
      }
      if (randomOrder) pool = shuffled(pool);
      return pool.slice(0, sessionSize);
    },
    [dueIds, hard, known, randomOrder, reviews, sessionSize],
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
      setAttempts({});
      lastSpokenRef.current = first.id;
      speak(first.word, true);
    },
    [buildPool, speak],
  );

  const advance = useCallback(() => {
    setRevealed(false);
    setPosition((value) => {
      if (value + 1 >= queue.length) {
        setComplete(true);
        return value;
      }
      return value + 1;
    });
  }, [queue.length]);

  const markKnown = useCallback(() => {
    if (!card) return;
    const previous = reviews[card.id];
    const nextStreak = (previous?.streak ?? 0) + 1;
    const intervalDays =
      REVIEW_INTERVALS[Math.min(nextStreak - 1, REVIEW_INTERVALS.length - 1)];
    setReviews((old) => ({
      ...old,
      [card.id]: {
        dueAt: Date.now() + intervalDays * DAY_MS,
        intervalDays,
        streak: nextStreak,
        lapses: previous?.lapses ?? 0,
      },
    }));
    setKnown((old) => new Set(old).add(card.id));
    setHard((old) => {
      const next = new Set(old);
      next.delete(card.id);
      return next;
    });
    setSessionKnown((value) => value + 1);
    advance();
  }, [advance, card, reviews]);

  const markAgain = useCallback(() => {
    if (!card) return;
    const previous = reviews[card.id];
    setReviews((old) => ({
      ...old,
      [card.id]: {
        dueAt: Date.now(),
        intervalDays: 0,
        streak: 0,
        lapses: (previous?.lapses ?? 0) + 1,
      },
    }));
    setHard((old) => new Set(old).add(card.id));
    setKnown((old) => {
      const next = new Set(old);
      next.delete(card.id);
      return next;
    });
    setSessionAgain((value) => value + 1);
    const priorAttempts = attempts[card.id] ?? 0;
    if (priorAttempts < 1) {
      setQueue((old) => [...old, currentIndex]);
      setAttempts((old) => ({ ...old, [card.id]: priorAttempts + 1 }));
    }
    advance();
  }, [advance, attempts, card, currentIndex, reviews]);

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
    started,
  ]);

  const fullProgress = Math.round((known.size / WORDS.length) * 100);
  const sessionProgress = queue.length
    ? Math.min(100, Math.round((position / queue.length) * 100))
    : 0;
  const longWordClass = useMemo(() => {
    const length = card?.word.length ?? 0;
    if (length > 25) return "study-word study-word--xl";
    if (length > 16) return "study-word study-word--long";
    return "study-word";
  }, [card?.word]);

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
          <p className="eyebrow">GRE · 声音记忆模式</p>
          <h1 id="welcome-title">一次，只记一个词。</h1>
          <p className="welcome-copy">
            切到新词就自动念出来。先听、再猜，翻开后看中文、等价词和词源。
          </p>
          <div className="welcome-stats" aria-label="学习进度">
            <div><strong>{WORDS.length}</strong><span>张发声词卡</span></div>
            <div><strong>{known.size}</strong><span>已经记住</span></div>
            <div><strong>{dueIds.size}</strong><span>今天到期</span></div>
          </div>
          <div className="session-choice">
            <span>本轮</span>
            {[10, 25, 50].map((size) => (
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
          <button className="primary-start" onClick={() => begin("new")} type="button">
            开始，并打开声音 <span>→</span>
          </button>
          <button
            className="text-start"
            disabled={!dueIds.size}
            onClick={() => begin("review")}
            type="button"
          >
            {dueIds.size
              ? `复习今天到期的 ${dueIds.size} 个词`
              : "今天的复习已经完成"}
          </button>
          <p className="review-note">
            间隔复习：记住后按 1 → 3 → 7 → 14 → 30 天再次出现。
          </p>
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
                window.speechSynthesis?.cancel();
              }}
              type="button"
            >
              <span>A音</span> GRE 声忆卡
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
                <button onClick={() => begin("new")} type="button">
                  再来 {sessionSize} 词
                </button>
                <button
                  className="secondary-button"
                  disabled={!dueIds.size}
                  onClick={() => begin("review")}
                  type="button"
                >
                  复习今天到期的词
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
                  <h1 className={longWordClass}>{card.word}</h1>
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
                      <strong>{card.meaning}</strong>
                    </div>
                    <div className="pair-block">
                      <span className="answer-label">六选二等价词</span>
                      <button onClick={() => speak(card.pair, true)} type="button">
                        <span>{card.pair}</span><SpeakerIcon />
                      </button>
                    </div>
                    <div className="origin-block">
                      <div className="origin-heading">
                        <span className="answer-label">词源 · Origin</span>
                        <a
                          href={`https://www.etymonline.com/search?q=${encodeURIComponent(card.originQuery)}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          完整词源 ↗
                        </a>
                      </div>
                      {(() => {
                        const details = originDetails(card);
                        return (
                          <div className="origin-story">
                            <section className="origin-source">
                              <span className="origin-step">01 · 源头</span>
                              <strong>{details.family}</strong>
                              <p>
                                最早可追溯形式：
                                <b>{details.oldest}</b>
                              </p>
                            </section>
                            <section className="origin-evolution">
                              <span className="origin-step">02 · 演变路径</span>
                              <div className="origin-chain">
                                {details.chain.map((node, index) => (
                                  <span className="origin-node" key={`${node}-${index}`}>
                                    <b>{node}</b>
                                    {index < details.chain.length - 1 ? (
                                      <i aria-hidden="true">→</i>
                                    ) : null}
                                  </span>
                                ))}
                              </div>
                              {details.earlyMeaning ? (
                                <p className="early-meaning">
                                  早期含义：“{details.earlyMeaning}”
                                </p>
                              ) : null}
                            </section>
                          </div>
                        );
                      })()}
                    </div>
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
            <div className="setting-row">
              <div><strong>随机顺序</strong><span>关闭时按 PDF 原顺序学习</span></div>
              <button
                aria-pressed={randomOrder}
                className={randomOrder ? "toggle is-on" : "toggle"}
                onClick={() => setRandomOrder((value) => !value)}
                type="button"
              ><i /></button>
            </div>
            <div className="mastery-summary">
              <span style={{ width: `${fullProgress}%` }} />
              <p>
                总进度 <strong>{fullProgress}%</strong> · {known.size} 已掌握 ·{" "}
                {dueIds.size} 今天到期
              </p>
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
                setReviews({});
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
