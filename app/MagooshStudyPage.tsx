"use client";

import StudyPage from "./StudyPage";
import type { CollectionId } from "./collections";
import { MAGOOSH_WORDS, MAGOOSH_SOURCES } from "./magooshWordData";
import MAGOOSH_EXAMPLES from "../data/magoosh-book-examples.json";
import MAGOOSH_QUESTION_CONTEXTS from "../data/magoosh-question-contexts.json";

export default function MagooshStudyPage({ collectionSize, onCollectionChange }: {
  collectionSize: number;
  onCollectionChange: (collection: CollectionId) => void;
}) {
  return <StudyPage collected collectionId="magoosh" collectionSize={collectionSize}
    words={MAGOOSH_WORDS} sources={MAGOOSH_SOURCES} examples={MAGOOSH_EXAMPLES}
    questionContexts={MAGOOSH_QUESTION_CONTEXTS}
    onCollectionChange={onCollectionChange} />;
}
