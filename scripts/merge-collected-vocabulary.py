#!/usr/bin/env python3
"""Merge reviewed, ordered vocabulary with stable IDs and no paired words."""
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT.parent / '.collected-build'

def main():
    raw = json.loads((ROOT / 'data/kmf-collected-words-2026-10-01.json').read_text())
    corrections = json.loads((ROOT / 'data/collected-editorial-corrections.json').read_text())
    cards = []; examples = {}; sources = {}; seen = set(); edit_count = 0
    for row in raw['words']:
        word = row['word']
        review = json.loads((WORK / 'reviews' / (word + '.json')).read_text())
        item = {**review['revised'], **corrections.get(word, {})}
        edit_count += len(review['edits'])
        if word in seen or item['word'] != word: raise ValueError('Duplicate or changed word')
        seen.add(word)
        id = 'kmf-' + word.lower()
        origin = item['origin'].replace('**', '').strip()
        origin = re.sub(r'^#{1,6}\s*', '', origin, flags=re.M)
        for heading in ('词源亲戚', '近义词辨析', '记忆链'):
            if heading not in origin: raise ValueError(word + ': missing section')
        if not re.search(r'\b' + re.escape(word) + r'\b', item['english'], re.I):
            raise ValueError(word + ': missing target in example')
        cards.append({'id': id, 'word': word, 'pair': '', 'meaning': item['meaning'], 'origin': origin, 'originQuery': item['originQuery'], 'page': row['page']})
        examples[id] = {'english': item['english'], 'chinese': item['chinese']}
        source_refs = item['sources']
        sources[id] = [{'label': 'Etymonline · ' + s['query'], 'url': s['url']} for s in source_refs]
    if len(cards) != raw['total_words']: raise ValueError('Incomplete collection')
    content = 'import type { WordCard } from "./wordData";\n\n'
    content += '// KMF collection, 2026-10-01. Preserve collection order and stable IDs.\n'
    content += '// Drafted and checked with DeepSeek; editorial corrections are kept in data/.\n'
    content += 'export const COLLECTED_WORDS: WordCard[] = ' + json.dumps(cards, ensure_ascii=False, indent=2) + ';\n\n'
    content += 'export const COLLECTED_EXAMPLES: Record<string, { english: string; chinese: string }> = ' + json.dumps(examples, ensure_ascii=False, indent=2) + ';\n\n'
    content += 'export const COLLECTED_SOURCES: Record<string, { label: string; url: string }[]> = ' + json.dumps(sources, ensure_ascii=False, indent=2) + ';\n'
    target = ROOT / 'app/collectedWordData.ts'
    tmp = target.with_suffix('.tmp'); tmp.write_text(content); tmp.replace(target)
    report = {'source_file': 'data/kmf-collected-words-2026-10-01.json', 'source_words': len(cards), 'draft_model': 'deepseek-flash', 'review_model': 'deepseek-flash', 'drafts': len(cards), 'reviews': len(cards), 'model_review_edits': edit_count, 'editorially_corrected_words': sorted(corrections), 'examples': len(examples), 'paired_memory_words': 0, 'source_urls': sources}
    (ROOT / 'data/collected-content-review.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k != 'source_urls'}, ensure_ascii=False))

if __name__ == '__main__': main()
