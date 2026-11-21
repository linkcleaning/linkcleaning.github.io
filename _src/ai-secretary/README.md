# AI 비서실 소스 (배포본: /ai-secretary)
- App.tsx 단일 파일 React 앱. 빌드: esbuild(entry.tsx, lucide-react는 stub로 alias) + Tailwind 3 CLI(tailwind.config.js, tw-in.css)
- 배포 폴더 ai-secretary/ 에 assets/app.js, assets/app.css, index.html(버전 꼬리표 /v.js data-v)
- 버전 올릴 때 index.html 의 data-v 와 맨 아래 자동 갱신 스크립트의 CUR 값을 같이 바꾼다(다르면 앱이 새로고침을 반복하지 않도록 세션당 1번만 시도).
- 매일 아침 예약 작업(Claude)이 ai-secretary/data/today.json 을 새로 써서 push → 앱이 브리핑 맨 위에 표시
  스키마: { date, generatedAt, headline, todo[], fieldMemo[], issues[{title,desc,source,url}], golden[{kw,reason}], blog{keyword,title,body}?, threads{text,tags[1개 주제태그]} } — 저녁 스레드는 저녁 홍보 작업 담당이라 쓰지 않음
  ✍️ blog(블로그 초안)·이케이클린 blog·칼럼·개인 블로그 글은 반드시 _src/ai-secretary/BLOG_PLAYBOOK.md 5단계 규칙(클릭되는 제목·첫 3초 2줄·한눈에 정리·AI 냄새 지우기·자연스러운 마무리)을 따른다 (대표님 승인 11/19).
  🤖 모든 글·페이지는 _src/ai-secretary/AI_SEARCH_PLAYBOOK.md(AI 검색 노출 지침, 대표님 신신당부 11/20)도 따른다 — 손님이 AI에게 묻는 질문 문장을 제목·소제목에, 그 아래 첫 문장이 답, 링크클린 정체성(이름·2016·제주 전 지역·064-763-4545) 일관되게.
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

### rank-meeting.json — 순위 하락 회의 (11/17, 대표님 상시 지시)
- 대표님 지시: "구글 순위가 떨어지면 비서실에서 회의해서 왜 떨어졌는지, 다시 올리려면 어떻게 할지 알려주고 조치까지. 네이버도."
- 아침 근무가 구글 순위(google.json)를 적은 뒤, 어제보다 web·map이 떨어진 키워드와 순위노트(허브 rank.data)의 네이버 플레이스 하락을 찾아 회의한다: ① 원인(증거로 확인한 것만, 아니면 '추정') ② 다시 올릴 방법 1~3개 ③ 조치(그날 바로: today.json golden·threads, keywords.json focus 맨 앞에 그 키워드 → 낮 근무 청소팁·소식·동네 페이지·칼럼이 사용 / 대표님 손 필요한 것은 승인 항목).
- 형식: {"date","at","note","items":[{engine(google|naver),kw,what,from,to,cause:[],actions:[{who,what,when,status}]}]}. 전날 '예정' 조치는 다음 날 회복 여부를 적는다. status 키: rankmeeting.
- 보고: 아침 근무 SendUserMessage에 "📉 순위 하락 회의" 묶음, 저녁 하루 보고에 한 줄.

## 🗂 비서진 회의록 (대표님 요청 11/20: "회의를 요청하면 비서실장 보고 칸에 회의 내용·결론을 따로")
- ai-secretary/data/meetings.json = {"updatedAt","items":[{id,date,at,kind:"request"(대표님 요청)|"regular"(정기),title,request,attendees:[],discussion:[],conclusion(한두 문장 — 무엇을 하기로 했는지),actions:[{who,what,when,status}],approvals:[대표님 확인 필요한 것]}]} 최근 30개, 최신이 맨 앞. 앱 브리핑 맨 위 '🗂 비서진 회의 결과' 카드에 그대로 뜬다.
- **모든 회의는 끝나면 여기에 회의록을 남긴다**: 순위 하락 회의(아침), AI 노출 점검·회의(월·목), 어사이드 네이버 회의, 대표님이 대화에서 "회의해 줘"라고 요청한 회의(kind "request", request 에 대표님 말씀 그대로). 같은 날 같은 회의는 한 항목으로 갱신. 회의할 거리가 없던 정기 회의는 남기지 않는다. 고객 정보·전화번호·매출·건강 정보 금지(공개 저장소).

### status.json — 못 한 일 설명 (대표님 11/20: "못함·어디 저장만 남기면 무슨 말인지 모르겠다")
- 근무가 done:false 로 남길 때는 items.<키>.fix = {"why":"왜 못 했나(쉬운 말 한 줄)","act":"비서실이 언제 어떻게 처리하나","you":"대표님 할 일 — 없으면 '없어요.', 선택이면 '(선택) '으로 시작"} 를 함께 쓴다.
- '대기열', '권한' 같은 내부 말만 쓰지 않는다. 앱은 fix 가 없으면 note 로 짐작해 설명한다(explainFail).
- 🧯 못 한 일 처리 근무(매일 14:37·18:37)가 done:false 항목을 다시 시도하고(홈페이지 대기열 올리기 등), 끝내 못 한 것은 fix 를 채운다.

### 블로그 사진 넣기 (대표님 11/21, 시험 성공)
- 대표님이 사진을 비서실장 대화에 보내면: 위치 정보(EXIF)를 지우고 긴 변 1600px JPG로 줄여 ai-secretary/data/blogphotos/<큐 id>/1.jpg… 에 올리고, draft-queue.json 해당 항목에 photos [{url:"https://linkcleaning.github.io/ai-secretary/data/blogphotos/<id>/N.jpg",caption}] 를 넣는다(본문 [사진 N] 순서와 맞춤). 07:43 어사이드 근무가 drafts 에 실어 주면 어사이드가 사진까지 넣어 임시저장한다.
- 공개 주소이므로 얼굴·집 주소·차량 번호·고객 물건 이름이 보이는 사진은 쓰지 않는다(대표님께 다시 요청).

### 📸 대표님이 사진 + 회사 이름을 주면 블로그 글 쓰기 (대표님 11/21)
- 대표님 말씀: "사진이 준비되면 비서진에 넣어서 발행할 수 있게. 링크클린·이케이클린 중 한 곳을 알려주면 그곳에 맞게 작성."
- 받는 것: 사진 여러 장 + "링크클린" 또는 "이케이클린" (+ 있으면 동네·청소 종류·한 줄 메모). 동네·종류를 모르면 사진으로 짐작하지 말고 한 번만 묻는다.
- 쓰기: BLOG_PLAYBOOK.md 5단계 + naver-patterns.json 규칙(있으면). 사진에 보이는 것과 대표님이 말한 사실만 쓰고 현장 일화·가격·통계는 지어내지 않는다. 사진 순서대로 [사진 N: 설명] 자리를 만든다(받은 사진 수만큼, 모자라면 자리만 더).
  - 링크클린: 12년 현장 베테랑 어조, 첫 문단 "제주에서 12년째 현장을 다니고 있는 링크클린입니다" 류, 1,800~2,500자, 소제목(## ) 4~6개, 질문형 소제목 1개 이상, 끝 "[명함 이미지 · 스마트플레이스 지도]", 전화·가격 없이, 블로그 blog.naver.com/linkcleaning.
  - 이케이클린: 서귀포 본사 여성기업의 다정한 상담 어조, 1,500~2,000자, 링크클린 이름·번호·문장·사진 섞지 않기, 끝 "[이케이클린 명함 · 지도]", 블로그 blog.naver.com/ekclean.
- 사진: EXIF 지우고 긴 변 1600px → ai-secretary/data/blogphotos/<id>/N.jpg (얼굴·집 주소·차량 번호 보이면 쓰지 않고 다시 요청).
- 보내기:
  - 링크클린 → draft-queue.json 에 {id, blog, title, body, tags, photos, status:"pending"} 추가 → 다음 날 08:00 어사이드가 사진까지 넣어 임시저장(대표님이 바로 원하면 어사이드 입력 문장 한 줄을 드림). 대표님은 확인하고 발행만.
  - 이케이클린 → 어사이드 계정('청소전문업체링크클린')에서는 ekclean 블로그에 글쓰기가 안 됨(11/20 확인). 그래서 제목·본문을 대화에 바로 보내고(복사용), 사진은 순서 번호와 함께 SendUserFile 로 돌려줌 → 대표님이 이케이클린 계정으로 직접 발행. 나중에 이케이클린 네이버 계정을 어사이드에 함께 로그인하면 링크클린과 같은 방식으로 바꾼다.
- 보고: 제목·첫 3줄·사진 몇 장이 어디에 들어가는지 짧게.
