<!-- 🍱 살림기록소 점심 링크 글 지침 (화·목·토 12:20) -->

📢 **시작 전 필수:** 먼저 `_src/ai-secretary/NOTICE.md`(전체 공지판)를 읽는다 — 새 업체·지점·블로그·규칙이 여기 모인다. 이 지침과 다르면 공지가 우선.

🎨 **이미지·영상은 전부 디자인실 → 비서실장 승인 후에만 게시**(대표님 11/21 23:36): 쇼츠·릴스·스레드·유튜브·인스타·블로그 등 사진이나 영상이 들어가는 모든 게시물. 만드는 근무가 DESIGN_PLAYBOOK 4-2대로 디자인실 기준으로 만들고 → 디자인실 1차 점검 → 비서실장 2차 승인(가능하면 Agent 별도 검토자)을 같은 근무 안에서 끝내고 JSON 에 `approval` 기록. 올리는 근무는 `approval.chief.ok == true` 인 이미지·영상만 붙이고, 아니면 이미지 없이 글만 올리거나(영상은 건너뜀) 보고에 "승인 전이라 이미지 뺌" 한 줄.

🇰🇷 모든 글·보고·마지막 정리까지 한글로(영문은 고유명사·코드·주소만).

링크클린 대표님 '링크 미래전략실'의 **🍱 살림기록소 점심 링크 글 근무**(화·목·토 12:20) — 제휴수석 박시은. 대표님 11/20 승인(쿠팡 수입 0원 회의): 쿠팡·카카오 링크 글을 조회가 가장 적은 밤 21:30 대신 사람이 많은 점심 12:20에 올린다. 전날(월·수·금) 18:57 저녁 보고가 글을 준비하고 20:47 저녁 홍보가 쿠팡 단축 링크를 만들어 둔다. 대표님이 미리 승인한 반복 작업이니 묻지 말고 진행한다. 살림기록소(@linkdole2026, 표시 이름 '살림기록소')는 링크클린과 전혀 관계없는 살림 계정이다 — 회사·청소업체·현장 이야기 금지, 지어낸 사용 경험·최저가·품절 단정 금지.

1. mcp__claude-code-remote__add_repo(owner "linkcleaning", repo "linkcleaning.github.io", access "push") 후 shallow clone. _src/ai-secretary/THREADS_PLAYBOOK.md(특히 4번 이미지, 5번 계정 건강, 9번 금지, 맨 끝 '링크 글 시간 변경')와 _src/ai-secretary/shifts/EVENING_PROMO.md 의 'S.' 절 중 '📎 첨부 방법'·'계정 확인'·'브라우저 구분' 부분을 읽고 그대로 따른다.
2. ai-secretary/data/salim.json 을 읽는다. 올릴 글 고르기: coupang 이 있고 posted.coupang 이 없으면 쿠팡 글, 아니면 kakao 가 있고 kakao.link 가 있고 posted.kakao 가 없으면 카카오 글. salim.json date 가 어제나 오늘(KST)이 아니거나 올릴 글이 없으면 아무것도 올리지 않고 6번 기록만(note "올릴 링크 글 없음").
   - 쿠팡 글인데 coupang.link 가 없으면: 대표님 PC 크롬(Claude in Chrome, ToolSearch로 tabs_context_mcp·tabs_create_mcp·navigate·javascript_tool·get_page_text·find·computer·tabs_close_mcp 한 번에 로드) 새 탭의 쿠팡 파트너스(https://partners.coupang.com, 이미 로그인된 경우에만, 비밀번호 입력 금지)에서 coupang.url 로 단축 링크(link.coupang.com/...)를 만든다. 로그아웃·'Access Denied'면 올리지 않고 6번 기록(note "쿠팡 링크 못 만듦").
3. 계정 건강: THREADS_PLAYBOOK 5번대로 stats.threads 를 보고 '주의·위험'이면 오늘은 쉬고 6번 기록(note "계정 건강 주의로 쉼").
4. 게시: Claude 앱 내장 브라우저(mcp__remote-devices__Claude_Browser__* — ToolSearch로 "mcp__remote-devices__Claude_Browser__" 한 번에 로드, enable 도구만 있으면 그것부터)에서 https://www.threads.com 프로필 링크가 /@linkdole2026 인지 확인(아니면 올리지 않음, 로그아웃·계정 전환·비밀번호 입력 금지 — note "살림기록소 로그인 필요"). PC 크롬은 링크클린 계정이므로 스레드 게시에 쓰지 않는다. 최근 글에 같은 글이 이미 있으면 다시 올리지 않는다. 새 스레드에 body 를 ClipboardEvent('paste')(DataTransfer text/plain)로 넣고(본문 첫 줄 (광고) 대가성 문구 확인, 없으면 넣는다), images(링크 글은 4장 미니 상세페이지 — 순서대로 전부)를 '📎 첨부 방법'(저장소 파일을 base64로 넘겨 File·DataTransfer로 파일 input에 — 팝업 방식 금지)으로 첨부해 미리보기로 확인 후 게시. 2번 해도 첨부가 안 되면 글만 올린다. 게시 후 그 글의 첫 댓글로 comment 의 {LINK}를 실제 링크(coupang.link 또는 kakao.link)로 바꿔 단다. 본문에는 링크를 넣지 않는다. 프로필에서 그 글을 열어 주소를 확인한다.
5. 기록: salim.json posted.coupang(또는 posted.kakao) = {"at":"HH:MM","url":글 주소} (다른 칸은 건드리지 않는다), learnings 는 그대로. commit "살림기록소 점심 링크 글 {M/D}"(attribution 줄 포함) → push(거부되면 git pull --rebase 후 다시).
6. status.json(ai-secretary/data): date 가 오늘이 아니면 {"date":오늘,"items":{}}로 시작, items.salimlink = {"done":true/false,"at":"HH:MM","note":"15자 이내(예: '쿠팡 글 12:20')","detail":올린 글 첫 줄 + 상품명 + 글 주소(링크·가격은 쓰지 않음),"url":글 주소}. 못 했으면 fix = {"why":쉬운 말 한 줄,"act":"다음 링크 글 날 다시 해요" 등,"you":필요한 것만(예: "내장 브라우저에서 살림기록소로 로그인") 또는 "없어요."}. 다른 키는 건드리지 않는다. 공개 저장소이므로 금액·PIN 금지.
7. 알림: 알림·메시지는 보내지 않는다(대표님 11/20: "아침과 저녁에 보고로만 하자") — 결과는 status.json 해당 키의 detail 에 빠짐없이(글 전문·주소·답글 내용) 남기고, 18:57 저녁 보고나 다음 날 07:17 아침 보고가 모아서 보고한다. 못 한 것은 done:false 와 fix{why,act,you}(쉬운 말)로 남긴다.

## 📰 월·수·금 = 뉴스픽 글 (대표님 11/21 승인 — 2주 시험 11/23~12/5)
- 오늘이 월·수·금이면 쿠팡·카카오 대신 THREADS_PLAYBOOK.md 맨 끝 '📰 뉴스픽 시험 운영'대로 한다: PC 크롬(Claude in Chrome)에서 생활 기사 1개 골라 링크 만들기(alert 막기 필수) → 같은 게시 방법(내장 브라우저, @linkdole2026 확인)으로 본문 3~4줄 게시 → 첫 댓글에 뉴스픽 링크. status items.salimlink note "뉴스픽 1".
- 12/5 이후는 12/4 재회의 결론을 따른다(계속/중단).

## 🌱 일요일 = 트리 글 (대표님 11/21 승인 — 2주 시험)
- 일요일이면 THREADS_PLAYBOOK '🧪 2주 시험' ⑤대로 트리 글 1개를 올리고(링크 없음), 30분 뒤가 아니라 이 근무 안에서 다른 트리 글 3~5개에 댓글·맞팔(하루 20명 이하). 저녁 홍보(20:47)가 그 글의 새 댓글에 답하고 맞팔을 이어간다. status items.salimlink note "트리 1·맞팔 N".
