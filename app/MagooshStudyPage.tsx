"use client";

import StudyPage from "./StudyPage";
import type { CollectionId } from "./collections";
import { MAGOOSH_WORDS, MAGOOSH_SOURCES } from "./magooshWordData";

export default function MagooshStudyPage({ collectionSize, onCollectionChange }: {
  collectionSize: number;
  onCollectionChange: (collection: CollectionId) => void;
}) {
  return <StudyPage collected collectionId="magoosh" collectionSize={collectionSize}
    words={MAGOOSH_WORDS} sources={MAGOOSH_SOURCES} examples={{}}
    onCollectionChange={onCollectionChange} />;
}
