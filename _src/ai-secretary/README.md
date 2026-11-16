# AI 비서실 소스 (배포본: /ai-secretary)
- App.tsx 단일 파일 React 앱. 빌드: esbuild(entry.tsx, lucide-react는 stub로 alias) + Tailwind 3 CLI(tailwind.config.js, tw-in.css)
- 배포 폴더 ai-secretary/ 에 assets/app.js, assets/app.css, index.html(버전 꼬리표 /v.js data-v)
- 매일 아침 예약 작업(Claude)이 ai-secretary/data/today.json 을 새로 써서 push → 앱이 브리핑 맨 위에 표시
  스키마: { date, generatedAt, headline, todo[], fieldMemo[], issues[{title,desc,source,url}], golden[{kw,reason}], blog{keyword,title,body}?, threads{text,tags[1개 주제태그]} } — 저녁 스레드는 저녁 홍보 작업 담당이라 쓰지 않음
- ai-secretary/data/ranks.json : { updatedAt, keywords[], byDate: { 'YYYY-MM-DD': { '키워드': { blog: n, web: n } } } } (0 = 권외) → 앱이 자동 반영
- naver-rank-worker.js 는 선택 기능(네이버 API 등록 필요)이라 현재 미사용

## data/status.json — 비서실 업무 현황 (앱 첫 화면 '비서들이 한 일 n/m')
각 예약 작업이 끝날 때 기록한다. 날짜가 오늘(KST)이 아니면 새로 시작.
```json
{ "date": "2026-11-16", "items": { "report": {"done": true, "at": "07:19", "note": "보고서·블로그 초안"} } }
```
키: report(아침 보고서) · blog(블로그 초안, 월·목) · threads(아침 스레드 게시) · tip(청소팁 카드, 화·금) · coupang(쿠팡 글 준비) · evening(저녁 6곳 홍보).
note는 15자 이내, 고객 이름·전화번호·매출 금지. 못 했으면 done:false + 이유.

## data/bids.json — 입찰·공고 비서관 (평일 08:23, 앱 '입찰·공고 비서관' 카드)
{ "date", "updatedAt", "note", "items": [{ "title", "org", "kind": "입찰|수의견적|모집|소식", "deadline", "amount", "url", "why", "new", "found" }] }
공공 공고 정보만. status.json 키: bids.
