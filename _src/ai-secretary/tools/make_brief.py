"""비서실장 대화창(artifact db: brief/today)에 넣을 요약 JSON을 만든다.
사용: python3 _src/ai-secretary/tools/make_brief.py > /tmp/brief.json
그다음 ArtifactData set (url=https://claude.ai/artifact/5NejHa4Rrzhpay23bbd97X, collection=brief, doc_id=today, file_path=/tmp/brief.json, if_version=읽은 버전)"""
import json, os, datetime
R = os.path.join(os.path.dirname(__file__), '..', '..', '..')
D = os.path.join(R, 'ai-secretary', 'data')
def load(n):
    try: return json.load(open(os.path.join(D, n), encoding='utf-8'))
    except Exception: return None
now = datetime.datetime.utcnow() + datetime.timedelta(hours=9)
r = load('day-report.json') or {}
rep = f"저녁 보고({r.get('date','')} {r.get('at','')}): {r.get('headline','')}\n한 일: " + ' / '.join(r.get('done', [])) + "\n내일: " + ' / '.join(r.get('tomorrow', [])) + "\n승인할 것: " + ' / '.join(map(str, r.get('approvals', [])))
m = (load('meetings.json') or {}).get('items', [])[:3]
meet = '\n\n'.join(f"회의 {x.get('date','')} {x.get('at','')} {x.get('title','')}\n결론: {x.get('conclusion','')}\n할 일: " + json.dumps(x.get('actions', []), ensure_ascii=False)[:600] for x in m)
s = load('status.json') or {}
today = '\n'.join([f"기록 날짜 {s.get('date','')}"] + [f"{k}: {'완료' if (v or {}).get('done') else '못 함'} {(v or {}).get('at','')} · {(v or {}).get('note','')}" for k, v in (s.get('items') or {}).items()])
try: notice = open(os.path.join(R, '_src', 'ai-secretary', 'NOTICE.md'), encoding='utf-8').read()[:7000]
except Exception: notice = ''
print(json.dumps({'updated': now.strftime('%Y-%m-%d %H:%M'), 'report': rep, 'meetings': meet, 'today': today, 'notice': notice}, ensure_ascii=False))
