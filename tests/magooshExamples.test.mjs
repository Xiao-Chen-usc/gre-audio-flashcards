import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import test from 'node:test';

const read = async (path) => JSON.parse(await readFile(new URL('../'+path, import.meta.url), 'utf8'));
const examples = await read('data/magoosh-book-examples.json');
const questions = await read('data/magoosh-question-contexts.json');
const report = await read('data/magoosh-example-review.json');
const words = await read('data/magoosh-common-words-2026-11-11.json');
const ids = new Set(words.words.map(({word})=>'magoosh-common-'+word));

test('published book examples have approved DeepSeek reviews, actual target forms and original-book images', async () => {
  assert.ok(Object.keys(examples).length > 80);
  assert.equal(report.bookExamples, Object.keys(examples).length);
  assert.equal(report.generatedExamples, 0);
  assert.equal(report.model, 'deepseek-flash');
  assert.ok(report.usage.total_tokens > 0);
  for (const [id, example] of Object.entries(examples)) {
    assert.ok(ids.has(id), id);
    assert.match(example.sourceKey, /^p\d{2}r\d{2}$/);
    assert.equal(example.sourceUrl, '/source-examples/'+example.sourceKey+'.webp');
    await access(new URL('../public'+example.sourceUrl, import.meta.url));
    assert.match(example.chinese, /[\u3400-\u9fff]/);
    assert.ok(example.targetForms.some(form=>new RegExp('\\b'+form+'\\b','i').test(example.english)), id);
    assert.ok(!example.english.includes('&'), id);
    assert.equal(report.evidence[id.replace('magoosh-common-','')].review.approved, true);
  }
});

test('question excerpts preserve source links and blanks without claiming third-party material is ETS-certified', async () => {
  const verification = await read('data/magoosh-question-verification.json');
  for (const [id, example] of Object.entries(questions)) {
    assert.ok(ids.has(id), id);
    assert.match(example.sourceUrl, /^https:\/\/(gre\.kmf\.com|blog\.powerscore\.com)\//);
    assert.ok(example.english.split(/\s+/).filter(token=>token!=='…').length <= 25, id);
    assert.match(example.chinese, /[\u3400-\u9fff]/);
    assert.ok(verification.sources.some(row=>row.sourceUrl===example.sourceUrl && row.verified && row.english===example.english));
  }
});
