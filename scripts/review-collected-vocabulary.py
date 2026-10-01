#!/usr/bin/env python3
"""Delegate evidence-based editorial checks; save exact, reviewable edits."""
import concurrent.futures
import importlib.util
import json
import os
from pathlib import Path
import time
import urllib.request

spec = importlib.util.spec_from_file_location('prepare', Path(__file__).with_name('prepare-collected-vocabulary.py'))
prepare = importlib.util.module_from_spec(spec); spec.loader.exec_module(prepare)
WORK = prepare.WORK

def review(file, key):
    item = json.loads(file.read_text())
    target = WORK / 'reviews' / file.name
    if target.exists(): return json.loads(target.read_text())
    evidence = []
    for source in item['sources']:
        p = WORK / 'sources' / (source['query'] + '.json')
        if p.exists(): evidence.append(json.loads(p.read_text()))
    prompt = '''你是严格的英语词源校订者，核查网站初稿，必须根据附带词典证据逐条对照。
历史来源、古词词形与拆分、亲戚关系、确切年代、意义变化路径必须准确；不在证据中的推测不可写成已证实事实。特别检查词根不同却因为前缀相同被混为亲戚、民间词源、同形不同源、属格与派生形容词混淆、假设被误当确定、来源不明时强行追溯。来源证据可能不完整，不能因没提到就判错；对于深层关系无法确认则改为保守措辞或只保留直接派生词。不要编造新的历史事实。现代语感解释和原创比喻可以保留，但必须明确是理解画面而非历史事实。
词源亲戚只列3–5个高价值现代英语词，不列无关的外语同源词凑数。不要机械删掉有证据的正确内容。
还要核查中文常用释义、屈折形、英文原创例句目标词形、例句自然程度和翻译准确性。检查原稿的段落和小标题。
只返回 JSON {"word":"原词","issues":["具体的问题；如果没有则空数组"],"edits":[{"field":"origin或meaning或originQuery或english或chinese","old":"原文中需要替换的准确连续子串","new":"改正后的字符串","reason":"理由"}]}。
edits 必须是最少的必要修改，old 必须准确匹配该字段原文且只出现一次，不要用 ... 缩写，不要返回整篇新稿。不改掉小标题。长度略有变化可以接受。'''
    body = {'model': 'deepseek-flash', 'thinking': {'type': 'disabled'}, 'response_format': {'type': 'json_object'}, 'max_tokens': 6500,
            'messages': [{'role': 'system', 'content': prompt}, {'role': 'user', 'content': json.dumps({'draft': item, 'evidence': evidence}, ensure_ascii=False)}]}
    for attempt in range(3):
        try:
            req = urllib.request.Request('https://api.deepseek.com/chat/completions', data=json.dumps(body).encode(), headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=180) as r: result = json.load(r)
            choice = result['choices'][0]
            if choice['finish_reason'] != 'stop': raise ValueError('Truncated review')
            output = json.loads(choice['message']['content'])
            if output['word'] != item['word'] or not isinstance(output['edits'], list): raise ValueError('Invalid review')
            revised = dict(item)
            for edit in output['edits']:
                field = edit['field']
                if field not in ('origin', 'meaning', 'originQuery', 'english', 'chinese'): raise ValueError('Unknown field')
                if not edit['old'] or revised[field].count(edit['old']) != 1: raise ValueError('Edit is not uniquely matched: ' + field)
                revised[field] = revised[field].replace(edit['old'], edit['new'], 1)
            for heading in ('词源亲戚', '近义词辨析', '记忆链'):
                if heading not in revised['origin']: raise ValueError('Lost section')
            output['revised'] = revised
            prepare.write_json(target, output)
            print('Reviewed: ' + item['word'] + '; edits ' + str(len(output['edits'])), flush=True)
            return output
        except Exception as exc:
            error = type(exc).__name__ + ': ' + str(exc)[:160]
            print(item['word'] + ' review attempt ' + str(attempt + 1) + ': ' + error, flush=True)
            body['messages'].append({'role': 'user', 'content': '修复输出检查错误：' + error + '。old 子串需唯一匹配，必要时包含更多上下文。重新输出整个 JSON。'})
            time.sleep(2)
    raise ValueError(item['word'] + ': ' + error)

def main():
    key = os.environ['DEEPSEEK_API_KEY']
    files = sorted((WORK / 'drafts').glob('*.json'))
    failures = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(review, file, key) for file in files]
        for future in concurrent.futures.as_completed(futures):
            try: future.result()
            except Exception as exc: failures.append(str(exc)); print('FAILED: ' + str(exc), flush=True)
    print(json.dumps({'drafts': len(files), 'reviewed': len(files)-len(failures), 'failures': failures}), flush=True)
    if failures: raise SystemExit(1)

if __name__ == '__main__': main()
