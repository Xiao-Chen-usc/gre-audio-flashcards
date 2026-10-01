"use client";

import { useEffect, useState } from "react";
import StudyPage from "./StudyPage";
import { COLLECTED_WORDS, COLLECTED_EXAMPLES, COLLECTED_SOURCES } from "./collectedWordData";

export default function Home() {
  const [collected, setCollected] = useState(false);
  useEffect(() => {
    // Static nginx serves a single /gre page; hash views survive reloads.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollected(window.location.hash.startsWith("#collected"));
  }, []);
  function selectCollection(value: boolean) {
    window.speechSynthesis?.cancel();
    window.history.replaceState(window.history.state, "", value ? "#collected" : window.location.pathname + window.location.search);
    setCollected(value);
    window.scrollTo(0, 0);
  }
  return <StudyPage key={collected ? "collected" : "synonyms"} collected={collected}
    words={collected ? COLLECTED_WORDS : undefined}
    examples={collected ? COLLECTED_EXAMPLES : undefined}
    sources={collected ? COLLECTED_SOURCES : undefined}
    onCollectionChange={selectCollection} />;
}
