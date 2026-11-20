<!-- 📣 저녁 홍보 근무 지침 (매일 20:47) — 예약 작업이 이 파일을 읽고 그대로 수행한다. 작업 PIN 은 예약 작업 지시에만 있다(공개 저장소). 고칠 때는 이 파일만 고치면 된다. -->

링크클린(제주 청소업체, linkclean.co.kr, 대표 청소 경력 12년, 2016년 설립) 저녁 홍보 통합 작업. 하루 한 번 이 작업 하나로: (A) '현장홍보' 앱 대기열 게시, (B) 구글 리뷰 답글 초안, (C) 스레드 댓글 답글·맞팔·초안, (S) 살림기록소 계정 게시·이웃 소통, (D) 결과 보고를 한다. 대표님이 미리 승인한 반복 작업이니 A, S, C의 '내 글 댓글 답글·맞팔'은 묻지 말고 진행한다. B의 리뷰 답글과 C의 새 글·남의 글 댓글은 초안만 만들고 대표님이 "올려"라고 답하면 그때 올린다. 응답·보고는 모두 한글, 휴대폰에서 보기 좋게 짧게. 대표번호는 064-763-4545만 사용(050·010 번호는 홍보에 쓰지 않음). 네이버(블로그·카페·플레이스)는 브라우저에서 막혀 있으니 접속하지 않는다. 대표님 방침: 알림이 너무 많아 헷갈리니 이 작업은 **문제가 있을 때만 알림**(D 참고).

## ✈️ 여행 모드 (KST 2026-11-18~2026-11-20만 — 대표님 일본 여행, PC는 켜져 있음. 2026-11-21부터는 이 절 전체를 무시하고 평소대로)
- A·B·C·S 작업은 평소대로 한다.
- D 보고: SendUserMessage·PushNotification은 문제가 있을 때만(게시 실패·로그아웃된 채널·PC 꺼짐·내장 브라우저 꺼짐·살림기록소 로그인 필요·이상한 작업 취소·쿠팡 첫 구매) 각 1번. "플레이스 글 준비됨" 알림과 리뷰 답글·댓글 초안 보고는 보내지 않는다 — 다듬은 네이버 플레이스 [제목]/[본문]과 초안들은 status.json items.evening 의 detail 에 남겨 두고(저녁 보고가 다음 날 '돌아오시면 올릴 것'에 모음), 초안은 대표님이 21일 이후 답하면 올린다. 릴스·사진 첨부가 안 돼 '📎 직접 올릴 것'으로 남긴 경우는 알림 없이 status 에만 남긴다.
- 카카오 선물 글은 없다(저녁 보고가 쿠팡 글로 대신 준비). 쿠팡 파트너스가 'Access Denied'로 막히면(11/17 밤 PC 크롬에서 한 번 막혔다가 쿠키 삭제·재로그인으로 풀림) 쿠팡 글과 클릭 기록은 건너뛰고 일반 글·릴스만 올리며, 이 경우는 알림을 보내지 않고 status note에만 "쿠팡 차단"으로 남긴다.

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

## D. 보고
- SendUserMessage 1번(이 대화에 기록으로 남김): ① 게시 결과(처리한 현장 메모, 채널별 성공/건너뜀과 이유, 핵심 키워드·태그 한 줄, 남은 대기 건수) ② 게시했으면 "🟢 네이버 플레이스 (직접 올려 주세요)" 아래 다듬은 [제목]·[본문]을 각각 따로 ③ 리뷰 답글 초안 ④ 댓글 초안 ⑤ 단 답글·맞팔 요약 ⑥ 살림기록소 결과(올린 것 한 줄 — 저녁 글 포함, 쿠팡 링크 준비 여부 + 어제 쿠팡 클릭·구매·수익 한 줄 + 최근 글 조회수 중앙값 한 줄 + 못 한 것과 이유 + '📎 직접 올릴 것'이 있으면 주소·캡션) — 없는 항목은 빼고 번호. 초안이 있으면 끝에 "올릴 초안만 번호로 답해 주세요 (예: 3,4 올려)". 대표님이 답하면 해당 항목만 올리고 결과를 한 줄씩.
- PushNotification은 **문제가 있을 때만** 1번: 게시 실패·로그아웃된 채널·PC 꺼짐·내장 브라우저 꺼짐·살림기록소 로그인 필요·이상한 작업을 취소한 경우, 또는 대표님이 네이버 플레이스에 직접 올릴 글이 생긴 경우("📣 저녁 홍보: 플레이스 글 준비됨" 등 한 줄), 또는 쿠팡 첫 구매가 생긴 날("💰 살림기록소 첫 구매!"). 그 외(맡긴 현장 없음·댓글만 단 날·링크 글 없는 날)에는 알림 없이 조용히 끝낸다.
- A에서 스레드를 게시했으면 send_later(delay_minutes 30)로 이 세션에 "스레드 댓글 확인"을 예약하고, 그때 최신 글 댓글에 답글을 단다(묻지 말고, 알림 없이).

## E. 맨 마지막: 비서실 업무 현황 기록 (앱 첫 화면 '비서들이 한 일')
- mcp__claude-code-remote__add_repo(owner "linkcleaning", repo "linkcleaning.github.io", access "push")로 붙이고 shallow clone.
- ai-secretary/data/status.json: date가 오늘(KST)이 아니면 {"date": 오늘, "items": {}}로 새로 시작. items.evening = {"done": true/false, "at": "HH:MM", "note": "15자 이내 — 예: '현장 1건 5곳 게시', '맡긴 현장 없음·댓글만', 'PC 꺼짐'"}. 맡긴 현장이 없어도 C를 했으면 done:true. items.salim 은 S에서 쓴 대로 둔다. 다른 키는 건드리지 않는다.
- 고객 이름·전화번호·매출은 쓰지 않는다. python으로 JSON 확인 → git commit -m "비서실 현황: 저녁 홍보"(attribution 줄 포함) → push, 거부되면 git pull --rebase 후 다시 push.