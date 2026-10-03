#!/usr/bin/env python3
"""Merge reviewed, ordered vocabulary with stable IDs and no paired words."""
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT.parent / '.collected-build'

def main():
    inputs = sorted((ROOT / 'data').glob('*collected-words-*.json'), key=lambda path: (path.stem[-10:], path.name))
    batches = [json.loads(path.read_text()) for path in inputs]
    ordered = {}
    for batch in batches:
        for row in batch['words']:
            ordered.setdefault(row['word'], row)
    raw = {'words': list(ordered.values()), 'total_words': len(ordered)}
    corrections = json.loads((ROOT / 'data/collected-editorial-corrections.json').read_text())
    example_overrides = json.loads((ROOT / 'data/collected-example-overrides.json').read_text())
    question_contexts = json.loads((ROOT / 'data/collected-question-contexts.json').read_text())
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
        cards.append({'id': id, 'word': word, 'pair': '', 'meaning': item['meaning'], 'origin': origin, 'originQuery': item['originQuery'], 'page': row['page']})
        # Publish only source-backed examples; never fall back to model drafts.
        example = example_overrides.get(word)
        if example:
            if not example.get('sourceLabel') or not re.fullmatch(r'p\d{2}r\d{2}', example.get('sourceKey', '')):
                raise ValueError(word + ': missing book provenance')
            if not re.search(r'\b' + re.escape(word) + r'\b', example['english'], re.I):
                raise ValueError(word + ': missing target in sourced example')
            examples[id] = example
        source_refs = item['sources']
        sources[id] = [{'label': s.get('label', 'Etymonline · ' + s['query']), 'url': s['url']} for s in source_refs]
    for word, context in question_contexts.items():
        if word not in seen or not context.get('sourceUrl', '').startswith('https://gre.kmf.com/'):
            raise ValueError(word + ': invalid question provenance')
        if context.get('english') and len([token for token in context['english'].split() if token != '…']) > 25:
            raise ValueError(word + ': question excerpt too long')
    if len(cards) != raw['total_words']: raise ValueError('Incomplete collection')
    content = 'import type { WordCard } from "./wordData";\n\n'
    content += '// KMF collection, updated 2026-10-02. Preserve collection order and stable IDs.\n'
    content += '// Drafted and checked with DeepSeek; editorial corrections are kept in data/.\n'
    content += 'export const COLLECTED_WORDS: WordCard[] = ' + json.dumps(cards, ensure_ascii=False, indent=2) + ';\n\n'
    content += 'export const COLLECTED_EXAMPLES: Record<string, { english: string; chinese: string; sourceLabel?: string; sourceNote?: string; sourceKey?: string }> = ' + json.dumps(examples, ensure_ascii=False, indent=2) + ';\n\n'
    content += 'export const COLLECTED_SOURCES: Record<string, { label: string; url: string }[]> = ' + json.dumps(sources, ensure_ascii=False, indent=2) + ';\n'
    content += '\nexport const COLLECTED_QUESTION_CONTEXTS: Record<string, { sourceUrl: string; label: string; note: string; english?: string; chinese?: string }> = ' + json.dumps({'kmf-' + word: value for word, value in question_contexts.items() if word in seen}, ensure_ascii=False, indent=2) + ';\n'
    target = ROOT / 'app/collectedWordData.ts'
    tmp = target.with_suffix('.tmp'); tmp.write_text(content); tmp.replace(target)
    report = {'source_files': [str(path.relative_to(ROOT)) for path in inputs], 'source_words': len(cards), 'draft_model': 'deepseek-flash', 'review_model': 'deepseek-flash', 'drafts': len(cards), 'reviews': len(cards), 'model_review_edits': edit_count, 'editorially_corrected_words': sorted(corrections), 'examples': len(examples), 'book_examples': len(examples), 'original_generated_examples': 0, 'words_without_confirmed_context': len(seen - set(example_overrides) - set(question_contexts)), 'question_references': len(question_contexts), 'question_excerpts': sum(bool(v.get('english')) for v in question_contexts.values()), 'paired_memory_words': 0, 'source_urls': sources}
    (ROOT / 'data/collected-content-review.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k != 'source_urls'}, ensure_ascii=False))

if __name__ == '__main__': main()
