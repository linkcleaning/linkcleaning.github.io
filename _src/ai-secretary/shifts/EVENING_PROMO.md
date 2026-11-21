<!-- 📣 저녁 홍보 근무 지침 (매일 20:47) — 예약 작업이 이 파일을 읽고 그대로 수행한다. 작업 PIN 은 예약 작업 지시에만 있다(공개 저장소). 고칠 때는 이 파일만 고치면 된다. -->

📢 **시작 전 필수:** 먼저 `_src/ai-secretary/NOTICE.md`(전체 공지판)를 읽는다 — 새 업체·지점·블로그·규칙이 여기 모인다. 이 지침과 다르면 공지가 우선.

🎨 **이미지·영상은 전부 디자인실 → 비서실장 승인 후에만 게시**(대표님 11/21 23:36): 쇼츠·릴스·스레드·유튜브·인스타·블로그 등 사진이나 영상이 들어가는 모든 게시물. 만드는 근무가 DESIGN_PLAYBOOK 4-2대로 디자인실 기준으로 만들고 → 디자인실 1차 점검 → 비서실장 2차 승인(가능하면 Agent 별도 검토자)을 같은 근무 안에서 끝내고 JSON 에 `approval` 기록. 올리는 근무는 `approval.chief.ok == true` 인 이미지·영상만 붙이고, 아니면 이미지 없이 글만 올리거나(영상은 건너뜀) 보고에 "승인 전이라 이미지 뺌" 한 줄.

링크클린(제주 청소업체, linkclean.co.kr, 대표 청소 경력 12년, 2016년 설립) 저녁 홍보 통합 작업. 하루 한 번 이 작업 하나로: (A) '현장홍보' 앱 대기열 게시, (B) 구글 리뷰 답글 초안, (C) 스레드 댓글 답글·맞팔·초안, (S) 살림기록소 계정 게시·이웃 소통, (D) 결과 보고를 한다. 대표님이 미리 승인한 반복 작업이니 A, S, C의 '내 글 댓글 답글·맞팔'은 묻지 말고 진행한다. B의 리뷰 답글과 C의 새 글·남의 글 댓글은 초안만 만들고 대표님이 "올려"라고 답하면 그때 올린다. 응답·보고는 모두 한글, 휴대폰에서 보기 좋게 짧게. 대표번호는 064-763-4545만 사용(050·010 번호는 홍보에 쓰지 않음). 네이버(블로그·카페·플레이스)는 브라우저에서 막혀 있으니 접속하지 않는다. 대표님 방침: 알림이 너무 많아 헷갈리니 이 작업은 **알림을 보내지 않는다**(대표님 11/20 "아침과 저녁 보고로만" — D 참고).

## A-1. 대기열 확인 (사용자 PC의 Claude in Chrome)
- Chrome 도구를 ToolSearch로 한 번에 로드(tabs_context_mcp, tabs_create_mcp, navigate, computer, find, javascript_tool, get_page_text, tabs_close_mcp). 새 탭에서 작업하고 끝나면 닫는다. 연결되지 않으면 할 수 있는 부분(초안)만 한다.
- https://linkclean-promo.han0829.workers.dev/api/jobs?status=pending&pin={작업 PIN} 를 열어 JSON 확인. 비어 있으면 A는 건너뛴다.
- 처리 순서: urgent:true 작업 먼저 createdAt 오름차순, 그다음 일반 작업. 하루 최대 2건까지.
- job.texts: placeTitle, place, insta, threads, google, daangnTitle, daangn, kakaoTitle, kakao. job.photos: 사진 URL 목록(CORS 허용). memo가 "[청소팁]"으로 시작하면 낮 근무가 만든 카드 이미지 글이다(현장 후기처럼 바꾸지 말 것).
- 먼저 사진을 실제로 열어 보고 글이 사진과 맞는지, 이상하거나 스팸 같은 내용이 아닌지 확인. 이상하면 게시하지 말고 POST /api/jobs/{id}/cancel?pin={작업 PIN} 후 보고.
- 글에 사진에 없는 사실(날짜·시간·금액 등 지어낸 내용)이 있으면 그 부분만 자연스럽게 빼고 올린다.

## A-2. 키워드·해시태그 조사 후 본문 보강 (게시 전에 꼭)
- job.memo와 사진으로 핵심 조합을 정한다: 지역(시·읍면동) × 청소 종류 × 대상.
- WebSearch로 그 조합의 실제 검색어·연관 검색어·계절 이슈를 조사한다.
- Chrome으로 Instagram 해시태그 검색과 Threads 검색에서 후보 태그의 게시물 수·최근 활동을 확인해, 너무 큰 태그와 거의 안 쓰이는 태그는 빼고 '검색량 적당 + 지역/서비스 관련' 태그를 고른다.
- 채널별 반영 (사실은 그대로, 키워드만 자연스럽게, 도배 금지):
  · 네이버 플레이스(대표님이 직접 올림 — 게시하지 않고 다듬은 글만 전달): 제목 40자 이내, 제목과 본문 첫 줄에 "시+동+청소종류", 본문에 연관 키워드 2~4개를 문장 속에, 해시태그 없이, 350~600자, 마지막은 무료견적 안내.
  · Instagram: 첫 문장에 지역+서비스 키워드, 해시태그 5개 이하.
  · Threads: 대화체·장사 티 없는 말투, 첫 문장에 '제주(또는 동네 이름) + 청소 종류'를 자연스럽게 딱 1번, 본문에 해시태그·전화번호·URL·홍보 문구 금지, 마지막 줄은 가벼운 질문. 주제 태그 1개: 현장 글은 '청소 주제'와 '제주도'를 번갈아(직전 글과 다른 쪽). '제주살이'는 일상 글 전용.
  · 구글 비즈니스: 해시태그·전화번호·URL 없이, 첫 문장에 "지역+서비스", 연관 키워드 2~3개를 문장으로.
  · 당근: 제목과 첫 줄에 동네 이름+서비스, 해시태그 없이 동네 이웃 말투.
  · 카카오톡 채널: 제목에 지역+서비스, 본문 끝에 해시태그 3~5개.

## A-3. 게시 (로그인된 브라우저 그대로, 비밀번호 입력 금지 — 로그아웃된 채널은 건너뛰고 보고)
사진 넣는 요령: 대부분 사이트는 페이지에서 fetch(사진URL)→Blob→File→DataTransfer로 input[type=file].files 에 넣고 change 이벤트. 파일 입력이 클릭할 때 생기는 사이트(당근·카카오)는 HTMLInputElement.prototype.click 을 잠깐 가로채 files를 넣는다. Instagram·Threads는 CSP로 fetch가 막히므로: 페이지에 임시 버튼을 만들고(onclick에서 window.open('https://linkclean-promo.han0829.workers.dev/relay.html?u='+사진URL들을 콤마로 이어 encodeURIComponent 없이, 'relay','popup,width=300,height=200')), message 이벤트로 e.data.relayFiles(File 배열)를 받아 저장 → 그 버튼을 computer 도구로 find ref 클릭(실제 클릭이어야 팝업 허용) → 게시 창을 열고 파일 input에 넣는다. Instagram은 '새로운 게시물 만들기' → '게시물'을 누르면 대화상자 안에 multiple 파일 input이 생기므로 거기에 넣으면 여러 장 게시 가능(자르기에서 '원본' 비율 선택). 팝업이 막히면 아래 S의 '📎 첨부 방법'(base64 직접 넘기기)을 쓴다.
 1) Instagram (linkcleaning): 사진 + 다듬은 insta 글.
 2) Threads (linkcleaning — 게시 전 프로필 링크가 /@linkcleaning인지 확인, 쿠팡 계정 linkdole2026으로 로그인돼 있으면 스레드는 건너뛰고 보고): 사진 최대 2장 + 다듬은 threads 글. 본문은 contenteditable에 ClipboardEvent('paste')(DataTransfer text/plain)로. 주제 태그는 '커뮤니티 또는 주제' 칸 클릭 후 입력, 드롭다운 항목을 실제 클릭. 링크는 본문에 넣지 않는다. 스레드는 다른 채널보다 마지막에(가능하면 21:00 이후에) 올린다.
 3) 구글 비즈니스 프로필: https://business.google.com/locations → 링크클린 줄의 '게시물 만들기' 아이콘 → 대화상자는 같은 출처 iframe이라 iframe.contentDocument의 input[type=file]에 iframe의 DataTransfer/File로 사진 1장 → 설명에 다듬은 google 글 → 버튼 '전화 걸기' → 게시.
 4) 당근 비즈프로필: https://bizprofile.daangn.com/biz_accounts/58003/manager/posts/new/ → 사진(+ 클릭 → '내 컴퓨터에서 선택', click 가로채기) → 제목 daangnTitle, 본문 daangn → 다음(JS로 '다음' 버튼 click) → 예약상품 '첨부하지 않기' → 태그 '작업 사례' → 완료.
 5) 카카오톡 채널 소식: https://business.kakao.com/space/24961/channel/_xfxdrxmM/posts 에서 새 소식(카드형, 사진 여러 장) → 제목 kakaoTitle, 본문 kakao → 발행.
- 각 채널 게시 후 앱 탭에서 fetch로 POST https://linkclean-promo.han0829.workers.dev/api/jobs/{id}/posted?pin={작업 PIN} (JSON {"channel":"insta","ok":true,"note":"사용 키워드·태그"}). 모든 채널 처리 후 POST /api/jobs/{id}/done?pin={작업 PIN}.
- 한 채널이 2번 시도해도 안 되면 건너뛰고 다음 채널로. 같은 글을 두 번 올리지 않도록 게시 전에 그 채널 최근 게시물을 확인.

## B. 구글 리뷰 답글 초안
- business.google.com(또는 google.com "링크클린" 관리자 패널 "리뷰 읽기")을 연다. 답글 없는 리뷰가 있으면 리뷰마다 짧고 따뜻한 답글 초안. 없으면 생략.

## C. 스레드 (@linkcleaning)
- https://www.threads.com/activity 에서 내 글에 새로 달린 댓글을 찾아 짧고 친근한 답글을 묻지 말고 바로 단다(영업 티 없이). 이미 답한 댓글은 건너뛴다. 새 팔로워는 맞팔한다.
- 아침 근무가 이미 아침 스레드를 올리므로 새 글 초안은 만들지 않는다.
- 제주 계정의 글 1~2개를 골라 이웃처럼 자연스러운 댓글 초안(영업 티 없이) + 대상 글 요약.

## S. 살림기록소 계정 운영 (@linkdole2026, 표시 이름 '살림기록소' — 쿠팡 스레드·인스타, 매일) — 제휴수석 박시은
- 대표님 결정(11/17): 쿠팡 수익 0원·클릭 거의 없음 → 계정부터 키우고, "최대한 클릭이 많을 글로" 수입을 낸다. 링크클린과 전혀 관계없는 '살림 꿀템·꿀팁 기록' 계정으로 보여야 한다(회사·청소업체·현장·직업 이야기 금지, 지어낸 사용 경험 금지). 대표님이 미리 승인한 반복 작업이니 묻지 말고 올린다. 링크 글은 월=쿠팡, 수·금=카카오톡 선물하기 큐레이터(12월까지, 대표님 11/17 결정).
- 시간표(대표님 11/18 결정 "일반 글을 아침·저녁으로 올리다가 쿠팡 글"): 아침 일반 글은 07:17 아침 근무가 올리고(salim.json morning — 이 작업에서는 올리지 않는다), 이 작업은 20:50쯤 저녁 일반 글 general[0] 만 올린다. ⏰ 링크 글(쿠팡·카카오)은 이 작업에서 올리지 않는다 — 대표님 11/20 승인(쿠팡 회의: 링크 글 조회 14~15회, 밤 21:30이 가장 약한 시간): 다음 날 12:20 '🍱 살림기록소 점심 링크 글' 근무가 올린다. 이 작업은 쿠팡 단축 링크만 미리 만들어 salim.json coupang.link 에 저장해 둔다.
- 📘 스레드 운영 지침서 — 쿠팡 스레드(살림기록소)에 특히 적용(대표님 11/18 지시 "영상보다 더 완벽하게 스레드를 유지, 특히 쿠팡 스레드에"): 저장소 _src/ai-secretary/THREADS_PLAYBOOK.md 를 읽고 따른다 — 4번: 링크 글(쿠팡·카카오)은 salim.json 의 images 2장을 스레드 본문과 함께 첨부(아래 '📎 첨부 방법', 2번 시도해도 안 되면 글만 올리고 '📎 직접 올릴 것'에 남김), 일반 글에 images 가 있으면 함께. 5번 계정 건강: 게시 전에 살림기록소 최근 글 5개의 조회수·좋아요·댓글을 읽어 salim.json stats.threads 에 기록(최근 30일), 주의·위험이면 지침서대로 링크 글을 쉰다. 6번 인지 작업: 추천 탭·검색(살림템·자취꿀템·겨울살림 등 생활 전반)에서 글 8~10개를 실제로 열어 읽고 좋아요 3~5개(이웃 댓글은 아래 이웃 소통 규칙대로). 8번: 쿠팡 파트너스에 들어갔을 때 사이트(지면) 정보에 스레드·인스타 주소가 등록돼 있는지 한 번 확인해 없으면 status note·보고에 "쿠팡 지면 등록 필요"(등록은 대표님). 1번 청소용품 편중 금지(대표님 11/18). 9번 금지 사항(남의 사진·AI 가짜 실사·지어낸 후기·외부 자동화 도구)은 그대로 지킨다.
- 브라우저 구분: 링크클린 계정은 대표님 PC 크롬(Claude in Chrome), 살림기록소는 **Claude 앱 내장 브라우저**(mcp__remote-devices__Claude_Browser__* — ToolSearch로 "mcp__remote-devices__Claude_Browser__" 한 번에 로드, 도구가 enable__mcp__remote-devices__Claude_Browser 하나뿐이면 그것부터). 크롬의 스레드·인스타 계정은 절대 바꾸지 않는다. 내장 브라우저가 없거나 연결이 안 되면 S는 건너뛰고 보고에 "내장 브라우저 꺼짐".
- 📎 첨부 방법(대표님 11/18 밤 "릴스가 안 올라가고 쿠팡 글 사진이 빠졌다" — 내장 브라우저는 relay.html 팝업과 파일 선택 창이 막혀서 실패했다): 내장 브라우저에서는 relay.html 팝업 방식을 쓰지 않는다. 대신 이 세션에 clone한 저장소의 파일(ai-secretary/data/salim/ 아래 png·mp4)을 python으로 base64 문자열로 읽어, javascript_tool로 페이지에 직접 넘긴다: base64 글자 30만 자 이하씩 나눠 window.__up=(window.__up||'')+'…' 로 여러 번 이어 붙이고(시작 전 window.__up='' 로 비움), 마지막 호출에서 atob → Uint8Array → new File([바이트], 파일이름, {type:'image/png' 또는 'video/mp4'}) 를 만들어 DataTransfer 에 담아 게시 창의 input[type=file] 의 .files 로 넣고 input·change 이벤트(bubbles:true)를 보낸다. 파일 input이 처음엔 없으면 사진/미디어 버튼을 누를 때 생기는 input을 찾거나, HTMLInputElement.prototype.click 을 잠깐 가로채 그 input에 files를 넣는다(파일 선택 창은 열리지 않게). 이미지 여러 장은 한 DataTransfer 에 함께. 릴스 MP4는 넘기기 전에 ffmpeg로 720x1280·-c:v libx264 -preset veryfast -crf 28·소리 없음으로 줄여(3MB 이하) 넘긴다. 첨부 후 화면(스크린샷)으로 미리보기에 사진·영상이 실제로 보이는지 확인하고 나서 게시한다.
- 첨부가 2번 시도해도 안 되면: 일반 글·링크 글은 글만 올리고(링크 글의 첫 댓글 링크는 그대로), 릴스는 올리지 않는다. 대신 status.json items.salim 의 detail 맨 앞에 "📎 직접 올릴 것: 릴스 https://linkcleaning.github.io/ai-secretary/data/salim/날짜.mp4 (캡션 전문) / 쿠팡 글 사진 https://linkcleaning.github.io/ai-secretary/data/salim/… .png" 처럼 대표님이 휴대폰으로 받아 올릴 수 있는 주소와 캡션을 남기고, note 에 "릴스 수동" 또는 "사진 수동"을 넣는다. 첨부 실패만으로는 알림을 보내지 않는다(저녁 보고가 모아 보고).
- 계정 확인: 내장 브라우저에서 https://www.threads.com 의 내 프로필 링크가 /@linkdole2026 인지, https://www.instagram.com 의 내 프로필이 linkdole2026 인지 확인. 다르면(예: linkcleaning) 그 채널은 올리지 않고 보고에 "살림기록소로 로그인 필요"(로그아웃·계정 전환·비밀번호 입력 금지).
- 저장소 linkcleaning.github.io 의 ai-secretary/data/salim.json(저녁 보고 18:57이 만든 오늘 글)을 읽는다. date가 오늘이 아니면 게시는 건너뛰고 보고(클릭 기록·계정 건강 기록은 그래도 한다). posted에 이미 기록된 것은 다시 올리지 않고, 올리기 전 그 채널 최근 글도 확인해 중복을 막는다. morning(내일 아침 글)은 건드리지 않는다.
- 스레드 저녁 일반 글: general[0] 을 20:50쯤 올린다(본문은 contenteditable에 ClipboardEvent('paste')로, 주제 태그는 '커뮤니티 또는 주제' 칸 입력 후 드롭다운 실제 클릭, 없으면 생략).
- 쿠팡 링크 준비(coupang이 있을 때): 대표님 PC 크롬에서 쿠팡 파트너스(https://partners.coupang.com, 이미 로그인된 경우에만 — 로그아웃이면 건너뛰고 보고)의 링크 생성 화면에 coupang.url 을 넣어 파트너스 단축 링크(link.coupang.com/...)를 만들어 salim.json coupang.link 에 저장한다. 게시는 하지 않는다(다음 날 12:20 점심 링크 글 근무가 올림).
- 카카오 선물 글: 이 작업에서는 올리지 않는다(다음 날 12:20 점심 링크 글 근무가 kakao.link 가 있으면 올림).
- 클릭 기록(매일): 크롬 쿠팡 파트너스(로그인돼 있을 때) https://partners.coupang.com/#affiliate/ws 의 일별 실적(차트·리포트)에서 최근 7일 날짜별 클릭 수·구매 건수만 읽어 salim.json "stats" 에 {"YYYY-MM-DD":{"click":N,"buy":N}} 로 덮어쓴다(최근 60일, stats.threads 는 건드리지 않고 같이 둔다). 공개 저장소이므로 금액(수익·합산 금액)은 쓰지 않고, 금액은 보고 메시지에만 쓴다.
- 인스타 릴스: 저장소의 reel.file(ai-secretary/data/salim/날짜.mp4)을 위 '📎 첨부 방법'(720x1280으로 줄여 base64로 넘기기)으로 내장 브라우저 인스타 '새로운 게시물 만들기'의 파일 input에 넣고 릴스로 공유, 캡션 reel.caption. 2번 시도해도 안 되면 올리지 말고 '📎 직접 올릴 것'에 남긴다.
- 이웃 소통(계정 키우기): 내장 브라우저 스레드에서 최근 24시간 살림·생활·인테리어·자취·겨울 생활·선물 고민 글 중 반응 있는 글 3~5개에 짧고 자연스러운 공감 댓글 1개씩(링크·홍보·쿠팡·카카오 언급 금지, 같은 계정 하루 1개, 정치·사건사고·광고 글 피함). 내 글 새 댓글에는 답글, 새 팔로워는 맞팔.
- salim.json posted 에 {threads1(저녁 글 {at,url}), reel, neighbors:N, at} 기록(posted.coupang·posted.kakao 는 점심 링크 글 근무 몫이라 건드리지 않는다) — 아침 근무가 쓴 posted.morning 은 지우지 않는다 → commit·push(거부 시 pull --rebase — 저녁 보고 세션이 kakao.link 를 먼저 push 했을 수 있음). status.json items.salim = {"done","at","note":"15자 이내(예: '저녁글·쿠팡1·릴스·댓글4')","detail":('📎 직접 올릴 것'이 있으면 맨 앞에) 올린 저녁 글·링크 글 첫 줄과 주소}.
- 내장 브라우저 작업이 끝나면 내가 연 탭만 닫는다(로그인은 그대로 둔다).

## Y. 유튜브 쇼츠
> ✅ **비서실장 승인된 영상만 올린다**: 살림은 salim.json reel.approval.chief.ok == true, 링크클린은 shorts-queue 항목 approval.chief.ok == true. 아니면 올리지 않고 items.youtube note 에 "승인 전이라 안 올림"(DESIGN_PLAYBOOK 4-1).
> 🎨 11/21~ 디자인실 기준: 제목은 salim.json reel.title(없으면 DESIGN_PLAYBOOK 9번 규칙으로 직접 — 증상·질문+결과 25자 안팎, #shorts 끝에). 영상이 DESIGN_PLAYBOOK 기준표(베이지 바탕·작은 글자·정지 화면)에 어긋나 보이면 올리지 말고 reel_maker.cjs 로 다시 만든 뒤 올린다.
(대표님 11/21 "둘 다" 승인) — 대표님 PC 크롬(Claude in Chrome)
- 크롬에는 구글 계정이 둘: **han0829**(크롬 프로필 주인 — 링크클린·동요 채널) / **linkdole**(살림기록소 채널). **구글 로그아웃·크롬 동기화 끄기 절대 금지**(11/21 로그아웃 사고). 계정은 유튜브 오른쪽 위 프로필 → '계정 전환'으로만 바꾸고, 끝나면 그대로 둔다. 로그인이 풀렸으면 올리지 않고 note "유튜브 로그인 필요"(비밀번호 입력 금지).
- 채널: 🏠 살림기록소 = https://studio.youtube.com/channel/UCXCPV0Sw4Ol5jLyFPCHPweQ (linkdole) / 🧹 링크클린 = https://studio.youtube.com/channel/UCU-LswJateZiU3u5ah_12Rg (han0829). 스튜디오 주소를 열었는데 다른 채널이 보이거나 권한 없음이면 계정 전환 후 다시.
- 올리는 법: 새 탭에서 해당 스튜디오 → 오른쪽 위 '만들기' → '동영상 업로드' 창의 input[type=file] 에, 저장소 mp4를 페이지 안에서 `fetch('https://linkcleaning.github.io/ai-secretary/data/…mp4')` → Blob → File → DataTransfer 로 넣고 change 이벤트(파일 선택 창은 열지 않는다; push 직후라 404면 30초 간격 최대 5번 재시도). 세로 60초 이하라 자동으로 Shorts. 제목(100자 이내, 끝에 #shorts) · 설명 · '아동용 아님' 선택 · 공개 → 게시. 게시 후 '동영상 링크'를 기록. 같은 영상이 이미 올라가 있으면 다시 올리지 않는다.
- 🏠 살림기록소 쇼츠(매일): 오늘 salim.json reel.file 을 그대로. 제목 = 릴스 첫 장 문구(예: "겨울 실내 빨래 쉰내, 이것부터 바꾸세요 #shorts"), 설명 = reel.caption + "\n\n스레드·인스타 @linkdole2026". (광고) 링크 글 날이어도 유튜브 설명에는 쿠팡 링크를 넣지 않는다. salim.json posted.yt = {url,at}.
- 🧹 링크클린 쇼츠(화·금): ai-secretary/data/shorts-queue.json items 중 used:false 맨 앞 1개(대표님이 보낸 현장 영상을 비서실이 다듬어 둔 것 — README '🎬 링크클린 현장 쇼츠' 참고). 제목·설명·태그는 그 항목 그대로(설명 끝 "제주 청소 문의 064-763-4545 · www.linkclean.co.kr"). 올린 뒤 used:true, url 기록. 대기열이 비었으면 건너뛰고 저녁 보고에 "🎬 링크클린 쇼츠 대기열 비었어요 — 현장 영상 보내 주세요" 한 줄(note).
- 유튜브 정책(2026.7 양산형 콘텐츠 강화): 같은 틀만 바꿔 찍어 내는 영상은 수익화 심사에서 불리 — 살림 쇼츠는 매번 주제·첫 장 문구·구성을 바꾸고, 링크클린 쇼츠는 실제 현장 영상만.
- status.json items.youtube = {"done","at","note":"살림1·링크클린1 처럼","detail":"제목 · 링크 줄마다"}.

## D. 보고 — 알림 없음
- 알림·메시지는 보내지 않는다(대표님 11/20: "아침과 저녁에 보고로만 하자") — 결과는 status.json 해당 키의 detail 에 빠짐없이(글 전문·주소·답글 내용) 남기고, 18:57 저녁 보고나 다음 날 07:17 아침 보고가 모아서 보고한다. 못 한 것은 done:false 와 fix{why,act,you}(쉬운 말)로 남긴다.
- 이 근무는 저녁 보고(18:57) 뒤에 돌기 때문에, 결과는 ai-secretary/data/night-report.json 에 통째로 {"date":오늘,"at":"HH:MM","posted":[채널별 성공/건너뜀과 이유 한 줄씩],"naverPlace":{"title","body"}(대표님이 직접 올리거나 앱에서 승인할 플레이스 글, 없으면 null),"reviewDrafts":[리뷰 답글 초안],"commentDrafts":[{target,text}],"replies":[단 답글·맞팔 요약],"salim":[살림기록소 결과 한 줄씩 — 저녁 글 첫 줄·주소, 쿠팡 링크 준비, 어제 쿠팡 클릭·구매(금액은 쓰지 않음), 최근 조회수 중앙값, 📎 직접 올릴 것],"problems":[문제 한 줄씩 + 대표님 할 일]} 로 써 두면 다음 날 07:17 아침 보고가 '🌙 어젯밤'으로 보고한다. 공개 저장소이므로 고객 이름·전화번호·금액 금지.
- A에서 스레드를 게시했으면 send_later(delay_minutes 30)로 이 세션에 "스레드 댓글 확인"을 예약하고, 그때 최신 글 댓글에 답글을 단다(묻지 말고, 알림 없이).

## E. 맨 마지막: 비서실 업무 현황 기록 (앱 첫 화면 '비서들이 한 일')
- mcp__claude-code-remote__add_repo(owner "linkcleaning", repo "linkcleaning.github.io", access "push")로 붙이고 shallow clone.
- ai-secretary/data/status.json: date가 오늘(KST)이 아니면 {"date": 오늘, "items": {}}로 새로 시작. items.evening = {"done": true/false, "at": "HH:MM", "note": "15자 이내 — 예: '현장 1건 5곳 게시', '맡긴 현장 없음·댓글만', 'PC 꺼짐'"}. 맡긴 현장이 없어도 C를 했으면 done:true. items.salim 은 S에서 쓴 대로 둔다. 다른 키는 건드리지 않는다.
- 고객 이름·전화번호·매출은 쓰지 않는다. python으로 JSON 확인 → git commit -m "비서실 현황: 저녁 홍보"(attribution 줄 포함) → push, 거부되면 git pull --rebase 후 다시 push.