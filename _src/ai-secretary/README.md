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

## data/google.json — 구글 순위 (전략수석실, 매일 11:17, 키워드 탭 '구글 순위' 카드)
{ "date", "checkedAt", "note", "byDate": { "YYYY-MM-DD": [ { "kw", "map": 지도 업체칸 순위|0=권외|null, "web": linkclean.co.kr 웹 순위, "blog": 링크클린 블로그 글 순위 } ] } } — 60일 보관. status 키: google.

## data/place-news.json — 플레이스 소식·짧은 영상 (홍보수석, 월·수·금 15:43, 브리핑 '플레이스 소식' 카드)
{ "updatedAt", "used": [사용한 현장 job id], "items": [ { "date", "title", "body", "keyword", "clip": 영상 주소, "photos": 사진 수 } ] } 최신 10개. status 키: placenews.
## 홈페이지 동네 페이지 — 전략수석, 수 14:37, linkclean-web src/data/seoPages.json 의 view:"area" 항목 추가. status 키: areapage.

## data/appcare.json (전략수석실 앱정비비서관, 매주 목 16:17)
{ "date": "YYYY-MM-DD", "summary": "한 줄", "checked": 점검한 앱 수,
  "fixed": [{"app","what","url"}], "added": [{"app","what","url"}],
  "proposals": [{"app","what"}],   // 대표님 승인 필요 — 전략기획실에 "제안 n번 해줘"
  "history": [{"date","summary"}]  // 최근 12주 }
status.json items.appcare 로 '비서들이 한 일'에 표시. 공개 저장소: 고객·매출·비밀번호 금지.

## data/day-report.json (비서실장 저녁 하루 보고, 매일 18:57)
{ "date": "YYYY-MM-DD", "at": "HH:MM", "headline": "대표님, …", "done": ["오늘 비서실이 한 일 한 줄", …],
  "tomorrow": ["HH:MM 내일 할 일", …], "approvals": ["앱: 승인할 제안 한 줄", …] }
브리핑 탭 맨 위 검은 카드로 그날만 표시. status.json items.dayreport. 공개 저장소: 일정 상세·고객·매출 금지.

## data/ek.json (이케이클린 홍보 비서, 화·목 13:17)
{ "date", "updatedAt", "blog": {keyword,title,body}, "place": {title,body}, "insta": "캡션", "areaPage": "목요일 새 동네 페이지 주소 또는 ''", "items": [{date,topic}] }
브리핑 탭 '이케이클린' 카드. status.json items.ekpromo. bids.json items[].for = link|ek|both (이케이클린 몫 표시).
