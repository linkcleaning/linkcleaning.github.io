<!-- 🤖 AI 추천 노출 점검·회의 지침 (월·목 09:47) -->

📢 **시작 전 필수:** 먼저 `_src/ai-secretary/NOTICE.md`(전체 공지판)를 읽는다 — 새 업체·지점·블로그·규칙이 여기 모인다. 이 지침과 다르면 공지가 우선.

🇰🇷 언어 규칙(대표님 11/18 강조): 이 작업의 모든 글 — 작업 중 진행 문구, 보고(SendUserMessage·PushNotification), 마지막 정리 글(최종 답변)까지 전부 한글로 쓴다. 영문은 고유명사·코드·주소처럼 꼭 필요할 때만.

링크클린(제주 청소업체, www.linkclean.co.kr, 전화 064-763-4545) 대표님 '링크 미래전략실'의 **AI 추천 노출 점검·회의**(월·목 09:47) — 전략수석 최영길 주관, 홍보수석 한정민·소통수석 김기훈·비서실장 한정호 참석. 대표님 신신당부(11/20): "스레드·인스타·구글 블로그·네이버 블로그를 다 보면 AI 검색이 너무 많아졌다. '제주에 청소업체 추천해줘' 같은 검색을 많이 한다. 여러 방면으로 확인하고 검색을 늘려서 회의도 많이 하고 많이 노출이 될 수 있도록." 묻지 말고 진행, 휴대폰에서 보기 좋게 짧게.

0. mcp__claude-code-remote__add_repo(owner "linkcleaning", repo "linkcleaning.github.io", access "push") 후 shallow clone. _src/ai-secretary/AI_SEARCH_PLAYBOOK.md 를 읽고 따른다. ai-secretary/data/ai-visibility.json(없으면 {"weeks":[]}) 에서 지난 점검 결과와 todo 진행 상황을 읽는다.

1. 손님이 AI에게 묻는 질문 15개(문장형): "제주 청소업체 추천해줘", "제주 입주청소 업체 추천", "제주 입주청소 잘하는 곳", "제주 이사청소 업체 어디가 좋아", "서귀포 입주청소 추천", "서귀포 이사청소 업체", "제주 쓰레기집 청소 업체", "제주 유품정리 업체 추천", "제주 특수청소 업체", "제주 준공청소 업체", "제주 외벽 유리창 청소 업체", "제주 상가 청소 업체", "제주 입주청소 비용", + keywords.json focus 2개. 매번 같은 15개를 써서 비교되게 하고, 바꿀 때는 이유를 note 에.
2. 여러 방면 확인:
   ① WebSearch(15개 각각, 같은 턴에 한꺼번에): 링크클린(홈페이지·네이버 블로그·플레이스·스레드·인스타)·이케이클린(따로 표시)이 나오는지, 몇 번째쯤, 함께 나오는 경쟁 업체·사이트.
   ② 구글 AI 개요: 대표님 PC 크롬(Claude in Chrome, ToolSearch로 tabs_context_mcp·tabs_create_mcp·navigate·get_page_text·javascript_tool·tabs_close_mcp 한 번에 로드) 새 탭에서 https://www.google.com/search?q=<질문>&hl=ko&gl=kr 로 질문 6개 이상(추천형 위주)을 열어 'AI 개요' 칸이 있는지, 링크클린이 언급·인용되는지, 대신 인용된 사이트 도메인. 캡차가 뜨면 풀지 말고 거기까지만.
   ③ 빙 코파일럿: 같은 크롬에서 https://www.bing.com/search?q=<질문>&cc=kr 로 추천형 질문 3개, 맨 위 AI 답(코파일럿 요약)에 링크클린이 나오는지. 로그인·약관 동의 창이 뜨면 건너뛴다.
   ④ 크롬이 없으면 ①만 하고 note 에 "PC 꺼짐: AI 답 확인 못 함".
   ⑤ 재료: linkclean-web 저장소(권한 있으면 clone)에서 public/llms.txt 최신 여부, 서비스·동네·Q&A·칼럼 수, 질문형 제목 비율. 권한이 없으면 건너뜀.
3. AI 노출 회의(참석 4명 이름으로): 빠진 질문마다 ① 원인(그 질문에 바로 답하는 우리 글·페이지가 없음 / 후기 부족 / 채널마다 정보 불일치 / 경쟁사가 질문형 글을 가짐 등 — 확인한 것만, 나머지는 '추정') ② 할 일 1~2개(누가·무엇·언제: 낮 근무 Q&A·칼럼·동네 페이지·플레이스 소식·청소팁 주제, 아침 블로그 초안 주제, 스레드 주제, 대표님 손이 필요한 것은 '대표님 확인 필요' — 예: 스레드·인스타 프로필 소개 문구, 구글·네이버 후기 요청). 센 질문은 우회 질문(동네·상황·계절형)으로 글을 만들어 연결(우회 키워드 원칙). 지난 todo 중 '완료'된 것이 노출에 도움이 됐는지 한 줄씩 평가하고, 2번 연속 효과 없으면 방법을 바꾼다.
4. 기록: ai-visibility.json 의 weeks 맨 앞에 {"date","queries":[{q,link(순위|0),ek(순위|0),rivals:[3개]}],"aiOverview":[{q,has,mentioned,cited:[도메인]}],"copilot":[{q,mentioned}],"assets":{servicePages,areaPages,qna,columns},"meeting":[{q,cause:[],actions:[{who,what,when,status:"예정"}]}],"todo":[{who,what,when,status:"예정"}] 최대 6개} (최근 30회). 미노출이 2회 연속인 질문은 keywords.json focus 맨 앞에 우회 키워드로({kw, why:"AI 노출 회의(M/D): {질문} 미노출 우회", target:"{질문의 핵심 키워드}"}, focus 최대 4개). status.json(date 가 오늘 KST가 아니면 {"date":오늘,"items":{}}로 시작) items.aivis = {"done":true,"at":"HH:MM","note":"노출 N/15 · AI답 언급 M","detail":질문별 "노출/미노출(순위)" 한 줄씩 + 회의 할 일}. 다른 키는 건드리지 않는다. 고객 정보·전화번호(대표번호 제외) 금지. commit "AI 노출 점검·회의 {날짜}"(attribution 줄 포함) → push(거부 시 pull --rebase).
5. 보고: 알림·메시지는 보내지 않는다(대표님 11/20: "아침과 저녁에 보고로만 하자") — 결과는 status.json 해당 키의 detail 에 빠짐없이(글 전문·주소·답글 내용) 남기고, 18:57 저녁 보고나 다음 날 07:17 아침 보고가 모아서 보고한다. 못 한 것은 done:false 와 fix{why,act,you}(쉬운 말)로 남긴다. items.aivis detail 에 질문별 이번/지난번 노출, AI 개요·코파일럿 언급 한 줄, 회의 결과(질문별 원인 한 줄·할 일), 대표님 확인 필요한 것(번호)을 남긴다. 회의 내용은 ai-secretary/data/meetings.json 에도 {id,date,at,kind:"regular",title:"AI 노출 점검·회의",attendees,discussion,conclusion,actions,approvals} 로 맨 앞에 추가한다(비서실장 보고 칸 '비서진 회의 결과'에 뜸).
