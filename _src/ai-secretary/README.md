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

### stories.json (11/17)
대표님 현장 한 줄 썰. `{"note","items":[{"date","text","used"}]}` — 저녁 보고 대화에 "썰: …"로 답하면 맨 앞에 추가, 목요일 아침 근무가 '청소 12년 차의 솔직 고백 #N' 블로그·스레드에 쓰고 used:true. 공개 저장소이므로 고객 이름·상세 주소·연락처 금지.

### salim.json (11/17)
살림기록소(@linkdole2026) 글·릴스. 저녁 보고가 general[0]=살림 팩트체크 O/X #N, general[1]=공감·꿀팁, coupang(월수금), reel(먼지씨 vs 악당 EP.N, data/salim/날짜.mp4, 캐릭터 SVG는 data/salim/char/) 작성. 저녁 홍보가 posted·stats({날짜:{click,buy}}, 금액 없음) 기록.

### grants.json (11/17, v31)
제주 소상공인 지원사업(입찰과 별도). 형식은 bids.json 과 같음 `{"date","updatedAt","note","items":[{title,org,kind(지원금|융자|교육|컨설팅|판로|기타),deadline,amount,url,why,for(link|ek|both),new,found}]}`. 아침 근무 월·목 갱신, 앱 브리핑 '소상공인 지원사업' 카드.

### status.json items — detail/url (11/17, v32)
각 업무 키에 `"detail"`(올린 글 전문·단 댓글/답글 목록, 여러 줄 가능)과 `"url"`(올린 게시물 주소)을 넣으면 앱 '비서들이 한 일'에서 "내용 보기"로 펼쳐 보인다. 새 키 `replies` = 스레드 댓글 답글(평일 13:17 낮 근무, 주말 20:47 저녁 홍보). 공개 저장소이므로 남의 계정 이름은 @아이디까지만, 전화번호·고객 정보 금지.

### office.html (11/17, v33)
전략기획실 버튼·서랍 링크는 이제 앱 안의 ai-secretary/office.html(조직도·수석실 업무·status.json 완료 표시)로 열림 — Claude 앱으로 넘어가 화면이 남는 문제 해결. 비서실장 대화만 Claude 아티팩트(4WTtTbpRQy1YjG4MWyNboC)로 연결. 수석실 업무를 바꾸면 office.html 의 NOW 도 같이 고칠 것.
