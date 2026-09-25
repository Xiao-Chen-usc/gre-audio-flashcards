"use client";

import { useMemo, useState } from "react";
import { WORD_PAIRS } from "./progress";
import { WORDS } from "./wordData";

type Status = "known" | "hard" | "new";
type Filter = Status | "all";

const STATUS_LABEL: Record<Status, string> = {
  known: "已掌握",
  hard: "正在学习",
  new: "还未学到",
};

function cardStatus(id: string, known: Set<string>, hard: Set<string>): Status {
  if (hard.has(id)) return "hard";
  if (known.has(id)) return "known";
  return "new";
}

function pairStatus(ids: string[], known: Set<string>, hard: Set<string>): Status {
  if (ids.some((id) => hard.has(id))) return "hard";
  if (ids.every((id) => known.has(id))) return "known";
  return "new";
}

const PAGES = [...new Set(WORDS.map((card) => card.page))].sort((a, b) => a - b);

// Rendered as a view of the home page (#words) rather than its own route: the
// site is deployed as a single pre-rendered /gre page on static nginx.
export default function WordList({
  known,
  hard,
  onBack,
  onDemote,
}: {
  known: Set<string>;
  hard: Set<string>;
  onBack: () => void;
  onDemote: (key: string, ids: string[]) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [masked, setMasked] = useState(true);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const rows = useMemo(
    () =>
      WORD_PAIRS.map(({ key, indices }) => {
        const cards = indices.map((index) => WORDS[index]);
        return {
          key,
          cards,
          page: cards[0].page,
          status: pairStatus(
            cards.map((card) => card.id),
            known,
            hard,
          ),
        };
      }),
    [hard, known],
  );

  const counts = useMemo(() => {
    const result: Record<Status, number> = { known: 0, hard: 0, new: 0 };
    rows.forEach((row) => {
      result[row.status] += 1;
    });
    return result;
  }, [rows]);

  const visibleByPage = useMemo(() => {
    const groups = new Map<number, typeof rows>();
    rows
      .filter((row) => filter === "all" || row.status === filter)
      .forEach((row) => {
        const list = groups.get(row.page) ?? [];
        list.push(row);
        groups.set(row.page, list);
      });
    return [...groups.entries()];
  }, [filter, rows]);

  return (
    <main className="app-shell words-shell">
      <header className="words-top">
        <button className="words-back" onClick={onBack} type="button">← 首页</button>
        <h1>全部词表</h1>
        <span className="words-total">{rows.length} 对 · {WORDS.length} 张</span>
      </header>

      <section className="words-summary" aria-label="掌握情况">
        {(["known", "hard", "new"] as Status[]).map((status) => (
          <span key={status}>
            <i className={`words-dot words-dot--${status}`} />
            {STATUS_LABEL[status]} <b>{counts[status]}</b> 对
          </span>
        ))}
      </section>

      <section className="words-map-card" aria-label="掌握地图">
        <div className="words-map-head">
          <strong>掌握地图</strong>
          <span>每格一张卡，每列是原书一页，点一列跳到那一页</span>
        </div>
        <div className="words-map">
          {PAGES.map((page) => (
            <button
              aria-label={`跳到第 ${page} 页`}
              className="words-map-col"
              key={page}
              onClick={() => {
                setFilter("all");
                // Scroll after the unfiltered list renders; a #page-N hash
                // would replace #words and leave the list.
                window.setTimeout(() =>
                  document.getElementById(`page-${page}`)?.scrollIntoView(),
                );
              }}
              type="button"
            >
              {WORDS.filter((card) => card.page === page).map((card) => (
                <i
                  className={`words-cell words-cell--${cardStatus(card.id, known, hard)}`}
                  key={card.id}
                  title={`${card.word} · ${STATUS_LABEL[cardStatus(card.id, known, hard)]}`}
                />
              ))}
            </button>
          ))}
        </div>
        <div className="words-map-axis">
          <span>第 {PAGES[0]} 页</span>
          <span>第 {PAGES[PAGES.length - 1]} 页</span>
        </div>
      </section>

      <div className="words-controls">
        <div className="words-filters">
          {(["all", "known", "hard", "new"] as Filter[]).map((value) => (
            <button
              aria-pressed={filter === value}
              className={filter === value ? "chip chip--active" : "chip"}
              key={value}
              onClick={() => setFilter(value)}
              type="button"
            >
              {value === "all" ? "全部" : STATUS_LABEL[value]}{" "}
              <em>{value === "all" ? rows.length : counts[value]}</em>
            </button>
          ))}
        </div>
        <div className="words-mask">
          <span id="mask-label">遮住中文</span>
          <button
            aria-labelledby="mask-label"
            aria-pressed={masked}
            className={masked ? "toggle is-on" : "toggle"}
            onClick={() => {
              setMasked((value) => !value);
              setRevealed(new Set());
            }}
            type="button"
          >
            <i />
          </button>
        </div>
      </div>

      {visibleByPage.length ? (
        visibleByPage.map(([page, pageRows]) => (
          <section className="words-page" id={`page-${page}`} key={page}>
            <h2>
              <span>第 {page} 页</span>
              <small>{pageRows.length} 对</small>
            </h2>
            {pageRows.map((row) => {
              const hidden = masked && !revealed.has(row.key);
              const meaning = [...new Set(row.cards.map((card) => card.meaning))].join(" / ");
              return (
                <div className="words-row" key={row.key}>
                  <span className={`words-status words-status--${row.status}`}>
                    <i className={`words-dot words-dot--${row.status}`} />
                    {STATUS_LABEL[row.status]}
                  </span>
                  <span className="words-pair">
                    {row.cards.map((card, index) => (
                      <span key={card.id}>
                        {index ? <span className="words-sep">⇄</span> : null}
                        {card.word}
                      </span>
                    ))}
                  </span>
                  <button
                    aria-label={hidden ? "显示中文" : `中文：${meaning}`}
                    className={hidden ? "words-meaning is-hidden" : "words-meaning"}
                    onClick={() =>
                      setRevealed((old) => {
                        const next = new Set(old);
                        if (next.has(row.key)) next.delete(row.key);
                        else next.add(row.key);
                        return next;
                      })
                    }
                    type="button"
                  >
                    {hidden ? "点击显示" : meaning}
                  </button>
                  {row.status === "known" ? (
                    <button
                      className="words-demote"
                      onClick={() =>
                        onDemote(
                          row.key,
                          row.cards.map((card) => card.id),
                        )
                      }
                      type="button"
                    >
                      放回不熟库
                    </button>
                  ) : (
                    <span className="words-demote-placeholder" />
                  )}
                </div>
              );
            })}
          </section>
        ))
      ) : (
        <p className="words-empty">这一类目前没有词。</p>
      )}
    </main>
  );
}
