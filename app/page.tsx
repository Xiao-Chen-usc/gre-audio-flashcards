"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import StudyPage from "./StudyPage";
import { COLLECTED_WORDS, COLLECTED_EXAMPLES, COLLECTED_SOURCES, COLLECTED_QUESTION_CONTEXTS } from "./collectedWordData";
import { collectionFromHash, collectionHash, type CollectionId } from "./collections";

const MagooshStudyPage = lazy(() => import("./MagooshStudyPage"));

export default function Home() {
  const [collection, setCollection] = useState<CollectionId>("synonyms");
  useEffect(() => {
    // Static nginx serves a single /gre page; hash views survive reloads.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollection(collectionFromHash(window.location.hash));
  }, []);
  function selectCollection(value: CollectionId) {
    window.speechSynthesis?.cancel();
    window.history.replaceState(window.history.state, "", collectionHash(value) || window.location.pathname + window.location.search);
    setCollection(value);
    window.scrollTo(0, 0);
  }
  if (collection === "magoosh") return <Suspense fallback={<main className="app-shell loading-shell"><div className="loading-dot" /><p>正在整理 Magoosh 词卡…</p></main>}>
    <MagooshStudyPage collectionSize={COLLECTED_WORDS.length} onCollectionChange={selectCollection} />
  </Suspense>;
  const collected = collection === "collected";
  return <StudyPage key={collection} collected={collected} collectionId={collection} collectionSize={COLLECTED_WORDS.length}
    words={collected ? COLLECTED_WORDS : undefined}
    examples={collected ? COLLECTED_EXAMPLES : undefined}
    questionContexts={collected ? COLLECTED_QUESTION_CONTEXTS : undefined}
    sources={collected ? COLLECTED_SOURCES : undefined}
    onCollectionChange={selectCollection} />;
}
