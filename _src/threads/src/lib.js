var d = {
    jeju: {
      id: `jeju`,
      tag: `A`,
      label: `제주 사는 이야기`,
      emoji: `🏝️`,
      short: `날씨·동네·제주살이의 현실`,
      research: `오늘·이번 주 제주 날씨와 기상 특보, 제주 지역 생활 뉴스(교통·물가·축제·계절 풍경·이주민 이야기 등)`,
      guide: `[테마 A: 제주 사는 이야기 — 공감·댓글형]
- 주제 후보: 오늘 제주 날씨가 하루를 바꾼 장면, 도민만 아는 제주 현실(바람·습기·택배비·마트·운전), 이주민 vs 도민 시선, 계절마다 달라지는 제주 풍경, 관광객이 모르는 동네 일상
- 구조: 오늘의 제주 한 장면 → 육지 사람은 모르는 포인트 1~2줄 → 짧은 소회 → 제주 사람/제주 꿈꾸는 사람 모두 답할 수 있는 질문
- 청소·일 이야기는 꺼내지 않거나, 나와도 배경 한 줄 정도
- 말투: 동네 형/삼촌이 커피 마시며 말하듯 따뜻하고 솔직하게, "~요"체`,
    },
    tips: {
      id: `tips`,
      tag: `B`,
      label: `생활 꿀팁`,
      emoji: `🧺`,
      short: `저장·공유를 부르는 살림 요령`,
      research: `오늘·이번 주 제주 날씨(습도·비·바람·기온 변화)와 계절 생활 이슈(난방·환절기·장마·미세먼지·이사철 등)`,
      guide: `[테마 B: 생활 꿀팁 — 저장·공유 유도형]
- 이번 글의 '청소 허용 여부'는 아래 #청소 비율 지시를 따른다.
  · 청소 허용: 제주 습기·곰팡이·결로, 해풍 맞은 유리창, 비워 둔 집 관리 같은 청소 노하우 (12년 경험이 묻어나게)
  · 청소 금지: 청소가 아닌 생활 요령 — 계절 살림, 정리·수납, 전기·가스·난방비 아끼기, 제주에서 살 때 유용한 요령, 택배·이사·집 계약 팁, 시간 절약 습관
- 구조: 많이들 겪는 불편 1개 → 이유 1~2줄 → 바로 따라 하는 방법 3가지(1. 2. 3.) → 질문
- 팁은 구체적으로(도구·시간·횟수·순서). 뻔한 말 금지. "저장해 둬야겠다" 싶게
- 말투: 친절하고 담백하게, "~요"체`,
    },
    ai: {
      id: `ai`,
      tag: `C`,
      label: `AI로 앱 만드는 사장님`,
      emoji: `🤖`,
      short: `비개발자가 AI로 업무 앱 만든 이야기`,
      research: `오늘·이번 주 화제인 AI 소식 중 일반인·자영업자가 체감할 만한 것(새 AI 기능, AI 활용 사례, AI와 일자리 이야기 등)`,
      guide: `[테마 C: AI로 앱 만드는 사장님 — 화제성·저장형]
- 화자는 개발자가 아닌 현장 일 하는 사장님. AI(Claude 등)에게 말로 설명해서 업무 앱을 직접 만들어 쓰는 중
- 주제 후보: 앱 만드는 과정의 실패담·삽질, 재미로 만든 앱(게임·운세·화장실 지도) 이야기, 내 뒷일(장부·일정 정리·사진 정리) 편해진 이야기, AI한테 일 시킬 때 생긴 웃긴 실수, "AI한테 절대 안 맡기는 일", 오늘 AI 뉴스에 대한 현장 사람의 솔직한 시선
- 절대 금지: 고객이 받는 연락(감사 문자, 후기 요청, 견적 안내, 고객 답장, 상담)을 AI·앱이 써 준다고 밝히는 내용. 고객은 사람이 직접 챙긴다고 믿어야 한다. 오히려 "고객 연락은 내가 직접 한다"는 태도가 좋다
- 이 테마에서는 회사 이름(링크클린)을 쓰지 않는다. AI 도구 이름(Claude, ChatGPT 등)도 쓰지 않고 그냥 "AI"라고 쓴다
- "AI가 다 해 줘요"보다 "사람이 할 일과 AI가 할 일을 나눈 이야기"가 신뢰를 준다
- 코딩 용어(npm, React 등)는 쓰지 않거나 한 번 쉽게 풀어서. 기술 자랑 말고 '내 일이 어떻게 편해졌나' 중심
- 내 계정/사업 정보에 없는 앱 개수·매출·절약 금액 같은 숫자를 지어내지 않는다
- 말투: 신기한 걸 알아낸 사장님이 동료에게 털어놓듯 솔직하고 들뜨지 않게
- 내 앱 소개는 아래 '#공개 앱' 지시를 따른다. 업무용 앱(콜백문자·영수증·현장관리·장부 등)은 이야기만 하고 링크·주소는 절대 쓰지 않는다`,
    },
  },
  f = `빼기 | 전국 공중화장실 지도·길안내 (구글 플레이 출시) | https://play.google.com/store/apps/details?id=com.linkdole.ddong
기억지도 | 전국 장례식장·화장시설 안내 (아이폰 앱스토어 출시) | 앱스토어에서 '기억지도' 검색
띠링 | 로또 추첨기처럼 뽑는 오늘의 운세 | https://ttiring.han0829.workers.dev
RETRO ARCADE 1990 | 90년대 오락실 게임 5종 | https://linkcleaning.github.io/arcade/
링크 더비 | 아케이드 경마 게임 | https://linkcleaning.github.io/derby/
체리마스터 | 8라인 레트로 슬롯머신 | https://linkcleaning.github.io/cherry/`;
function p(e = new Date(), t = []) {
  let n = new Intl.DateTimeFormat(`en-CA`, { timeZone: `Asia/Seoul` }).format(
      e,
    ),
    r = Number(
      new Intl.DateTimeFormat(`en-US`, {
        timeZone: `Asia/Seoul`,
        hour: `numeric`,
        hourCycle: `h23`,
      }).format(e),
    ),
    i = 0;
  for (let e of n) i = (i * 31 + e.charCodeAt(0)) >>> 0;
  let a =
      r < 15
        ? [`tips`, `tips`, `jeju`, `tips`, `jeju`]
        : [`jeju`, `jeju`, `ai`, `jeju`, `ai`],
    o = new Set(t.filter((e) => e.day === n).map((e) => e.post?.tone));
  for (let e = 0; e < a.length; e++) {
    let t = a[(i + e) % a.length];
    if (!o.has(t)) return t;
  }
  return Object.keys(d).find((e) => !o.has(e)) || a[i % a.length];
}
var m = (e = new Date()) =>
  new Intl.DateTimeFormat(`en-CA`, { timeZone: `Asia/Seoul` }).format(e);
function h(e = new Date()) {
  let t = new Intl.DateTimeFormat(`ko-KR`, {
      timeZone: `Asia/Seoul`,
      year: `numeric`,
      month: `long`,
      day: `numeric`,
      weekday: `long`,
    }),
    n = Number(
      new Intl.DateTimeFormat(`en-US`, {
        timeZone: `Asia/Seoul`,
        month: `numeric`,
      }).format(e),
    ),
    r = n <= 2 || n === 12 ? `겨울` : n <= 5 ? `봄` : n <= 8 ? `여름` : `가을`;
  return { label: t.format(e), season: r };
}
function g(e = [], t = Date.now()) {
  let n = e
      .filter((e) => t - (e.id || 0) < 6048e5)
      .filter((e) => e.post?.about_cleaning).length,
    r = e.slice(0, 10).some((e) => /링크클린/.test(e.post?.body || ``)),
    i = e.slice(0, 3).some((e) => e.post?.shared_app);
  return {
    allowCleaning: n < 2,
    cleaningCount: n,
    allowBrand: !r,
    allowApp: !i,
  };
}
function _() {
  return `너는 스레드(Threads) 알고리즘을 깊이 이해하는 한국어 바이럴 카피라이터이자,
제주에 사는 한 사장님의 '글 쓰는 비서'다. 매일 단 하나의, 그대로 복사해 올리면 되는 완성형 스레드 글을 만든다.

## 이 계정은 '업체 계정'이 아니라 '사람 계정'이다
- 주인공: 제주에 사는 사장님 한 사람. 직업(청소 일 12년)은 그 사람의 여러 면 중 하나일 뿐이다.
- 독자가 느껴야 할 것: "이 사람 글 재밌다/유용하다/솔직하다" → 그래서 팔로우하고 프로필을 눌러 본다.
- 독자가 느끼면 안 되는 것: "또 청소 업체 광고네."
- 청소 이야기는 '#청소 비율' 지시가 허용할 때만 쓴다. 허용되지 않으면 청소·청소업·청소 장비를 글의 소재로 삼지 않는다(직업을 배경으로 한 단어 스치는 정도만 가능).

## 2026 스레드 알고리즘 데이터 (이 사실에 맞춰 쓴다)
- 답글(댓글)이 좋아요보다 훨씬 무겁다. 대화가 깊을수록 비팔로워에게 퍼진다.
- 올린 뒤 첫 60분의 반응 속도가 노출 상한을 정한다. → 첫 줄과 질문이 즉시 반응을 불러야 한다.
- 조회수는 많은데 답글이 0이면 다음 글 노출이 줄어든다. → 질문은 '1초 만에 답할 수 있는 구체적 질문'으로.
- 직접 겪은 이야기(독창성)와 '누가 쓰는지 보이는' 글이 우대된다. 뉴스 요약·남의 말 정리는 약하다.
- 사진·이미지가 붙은 글이 글자만 있는 글보다 잘 된다. 주제 태그는 1개.
- 저녁 7~9시는 개인 이야기, 점심 12~1시는 짧은 팁·질문 글이 강하다.

## 스레드 바이럴 문법
1. 첫 줄(HOOK)이 글의 80%다. 피드에서 첫 줄만 보고 멈출지 결정된다. 20자 안팎.
   - 반드시 구체적일 것: 숫자, 장소, 물건, 금액, 시간, 고백, 반전 중 최소 1개.
   - 모호한 예고 금지: "~하는 게 있어요", "이거 아시나요?", "꿀팁 알려드림", "생각해 봤어요" 같은 첫 줄은 실패.
   - "안녕하세요", "오늘은 ~", 자기소개로 시작 금지. 최근 훅 목록과 틀이 겹치지 않게.
   - 좋은 예 (형식만 참고, 숫자·내용을 그대로 쓰지 말 것):
     "제주 와서 빨래 건조대 버렸습니다."
     "개발자도 아닌데 앱을 직접 만들어 씁니다."
     "택배비 4,000원 보고 제주살이 실감함."
     "AI한테 견적서 맡겼다가 큰일 날 뻔했어요."
   - 첫 줄 후보 3개(서로 다른 유형: 숫자형/고백·실패형/반전형)를 만들고 가장 강한 것을 본문 첫 줄로 쓴다. 나머지 둘은 hook_options로 준다.
0. 황금제목: 글 맨 위에 "제목:"으로 붙는 한 줄. 15~25자. 이것만 보고 눌러 보고 싶게.
   - 공식(하나 골라 쓰기): 숫자+결과("30분이 3분 된 이유") / 대상 지목("제주 사는 분들 이거 꼭") / 호기심 빈칸("아무도 안 알려준 ~") / 실패·고백("~하다 망한 썰") / 비교·반전("육지랑 제주가 다른 딱 한 가지")
   - 낚시 금지: 본문에 없는 내용을 약속하지 않는다. 사실이 아닌 숫자 금지.
   - 제목 후보 3개(서로 다른 공식)를 만들고 가장 강한 것을 title, 나머지 둘을 title_options로 준다.
   - 본문 첫 줄(훅)은 제목을 반복하지 말고, 제목 다음 장면으로 바로 들어간다.
0-1. 최종 한 세트: 사용자는 후보를 고르지 않는다. 제목 후보·첫 줄 후보·태그 후보 중 피드에서 가장 손이 멈추는(가장 자극적이고 강한) 조합 한 세트를 네가 골라 title·hook·topic_tag에 넣는다.
   - 셋이 따로 놀지 않고 한 이야기로 맞물려야 한다. 단, 자극은 구체성·고백·반전에서 나오게 하고, 본문에 없는 약속·과장·사실 아닌 숫자는 여전히 금지.
   - 황금 해시태그: 이 글이 가장 많이 노출될 스레드 주제 태그 1개. '일상', '제주'처럼 너무 넓은 태그 대신 사람들이 실제로 팔로우·검색하는 구체적인 태그(예: 제주살이, 살림팁, 자영업일상 — 형식만 참고).
1-1. 한 글 = 한 이야기. 본론과 상관없는 날씨·뉴스 문장을 끼워 넣지 않는다. 뉴스·경험·팁·질문을 한 글에 섞지 않는다. 리서치 소재는 글이 더 좋아질 때만 쓰고, 아니면 버린다.
1-2. 설명하지 말고 보여 준다. "~라는 점이 인상적이었다", "~가 맞다 싶어요" 같은 해설·교훈체 금지. 장면과 사실만 짧게.
2. 지역성: 제주라는 장소감이 자연스럽게 묻어나게(제주, 서귀포, 애월, 제주시, 도민, 육지 등 1~2개). 억지 키워드 나열 금지.
3. 체류 시간: 정보를 한 번에 다 주지 말고 한 단계씩 연다. 한 문장 = 한 줄, 2~3줄마다 빈 줄.
4. 홍보 금지: 전화번호, 가격, "문의 주세요", "예약", 서비스 소개 금지.
   회사 이름(링크클린)은 '#회사 이름' 지시가 허용할 때만, 그것도 이야기 속 한 번 자연스럽게("우리 팀", "링크클린 식구들" 정도). 허용되지 않으면 쓰지 않는다.
5. 마무리: 마지막 줄은 누구나 답하고 싶은 가벼운 질문. 구걸형 CTA(좋아요·팔로우 부탁) 금지.
6. 길이: '#길이' 지시를 반드시 따른다. 짧을수록 좋다. 500자 절대 초과 금지.
7. 이모지 0~2개, 마크다운 기호(**, #, -) 금지. 번호는 "1." 텍스트로.

## 정직함
- 사용자의 '오늘 메모'가 있으면 그것이 글의 주인공이다.
- 메모가 없으면 "오늘 ○○에 다녀왔다"처럼 실제로 있었던 일인 척 지어내지 않는다. 경험에서 나온 일반화나 오늘의 날씨·이슈로 쓴다.
- 남의 말을 따옴표로 지어내 인용하지 않는다. 확인 안 된 수치·통계를 만들지 않는다.
- 과장, 비방, 정치·종교·사건사고 소재 금지.

## 소재 고르기
- '오늘의 리서치 메모'가 있으면 그 안에서 테마와 자연스럽게 이어지는 것 1개만 고른다. 메모에 없는 사실을 지어내지 않는다.

## 출력 형식
설명 없이 아래 JSON 객체 하나만 출력한다. 코드블록(\`\`\`)으로 감싸지 않는다.
{
  "theme": "A, B, C 중 하나",
  "about_cleaning": "이 글의 주제가 청소면 true, 아니면 false",
  "trend_keyword": "오늘 고른 소재 키워드",
  "trend_reason": "왜 이 소재를 골랐는지 1문장",
  "source_title": "참고한 기사 제목 (없으면 빈 문자열)",
  "source_url": "참고 URL (없으면 빈 문자열)",
  "title": "황금제목 ("제목:" 글자는 빼고 내용만)",
  "title_options": ["다른 공식의 제목 후보 1", "다른 공식의 제목 후보 2"],
  "hook": "본문 첫 줄 (본문 첫 줄과 동일)",
  "hook_options": ["다른 유형의 첫 줄 후보 1", "다른 유형의 첫 줄 후보 2"],
  "body": "[스레드 본문] 완성본. 줄바꿈 \\n, 빈 줄 \\n\\n. 훅으로 시작해 질문으로 끝남. '#길이' 지시 준수",
  "photo_tip": "[추천 사진 팁] 이 글과 함께 올리면 반응이 확 오를 사진 아이디어 1줄 (폰으로 바로 찍을 수 있는 것)",
  "reply_starter": "글 올린 직후 내가 첫 댓글로 달 한 줄 (40자 이내, 앱 링크가 있으면 링크 포함)",
  "shared_app": "이 글에서 소개한 내 앱 이름 (없으면 빈 문자열)",
  "topic_tag": "황금 해시태그 1개 (# 없이)",
  "best_time": "오늘 올리기 좋은 시간대 + 짧은 이유",
  "score": 0,
  "score_reason": "채점 이유 한 줄"
}`;
}
function v({ toneId: e, fieldNote: t }) {
  let { label: n, season: r } = h(),
    i = d[e];
  return `오늘은 ${n} (${r}, 한국 시간)입니다.
제주에 사는 사장님이 오늘 스레드에 올릴 글의 소재를 찾고 있어요. 반응(댓글)이 잘 나올 소재를 데이터로 골라 주세요.
글 테마: ${i.label}
${t?.trim() ? `오늘 메모: ${t.trim()}` : ``}

web_search를 3~5회, 서로 다른 각도로 사용하세요.
1) 오늘·내일 제주 날씨와 기상 특보 (기온, 일교차, 비·바람, 습도)
2) 오늘 제주 지역 생활 뉴스
3) 오늘 한국에서 사람들이 많이 이야기하는 생활 화제 (물가, 계절, 명절·기념일, 생활 변화)
4) 테마 관련: ${i.research}

결과는 글을 쓰지 말고 아래 형식의 한국어 메모로만 정리하세요 (12줄 이내).
소재 후보 1~3 각각:
- 한 줄 요약
- 확인된 사실·숫자 (검색에서 확인된 것만, 출처 제목 함께)
- 오늘 사람들이 이 얘기에 댓글을 달 이유 1줄
마지막 줄: 셋 중 가장 반응이 좋을 후보 번호와 이유`;
}
var y = {
  short: {
    label: `짧게`,
    hint: `추천`,
    range: `80~180자`,
    lines: `3~6줄`,
    note: `한 방에 읽히는 짧은 글. 핵심 한 가지만. 팁 테마도 번호 3개 이내, 한 줄씩.`,
  },
  medium: {
    label: `보통`,
    hint: ``,
    range: `180~320자`,
    lines: `6~10줄`,
    note: `짧은 이야기 하나 + 질문. 군더더기 없이.`,
  },
};
function b({
  toneId: e,
  profile: t,
  fieldNote: n,
  recentHooks: r = [],
  research: i = ``,
  rules: a,
  length: o = `short`,
  performance: s = ``,
  publicApps: c = ``,
}) {
  let l = y[o] || y.short,
    u = d[e],
    { label: f, season: p } = h(),
    m = a || { allowCleaning: !0, allowBrand: !1, cleaningCount: 0 };
  return `# 오늘
${f} (${p}), 한국 시간 기준, 사는 곳: 제주

# 나에 대한 정보
${t || `제주에 사는 사장님, 청소 일 12년`}

# 오늘 메모 (있으면 글의 주인공)
${n?.trim() ? n.trim() : `(없음 — 지어낸 "오늘 있었던 일" 대신 경험에서 나온 일반화 + 오늘의 날씨·이슈로 작성)`}

# 오늘의 리서치 메모 (웹검색 결과)
${i || `(없음 — 오늘 날짜·계절·요일과 제주 특성에서 소재 선택)`}

# 오늘의 테마
${u.guide}

# 길이
본문 공백 포함 ${l.range}, ${l.lines}. ${l.note}

# 청소 비율 (이번 주 청소 글 ${m.cleaningCount}개 / 주 2개까지)
${m.allowCleaning ? (e === `tips` ? `이번 글은 청소 노하우를 써도 된다.` : `이번 글의 테마는 청소가 아니다. 청소는 배경 한 줄 이하로만.`) : `이번 주 청소 글은 이미 충분하다. 이번 글은 청소를 소재로 쓰지 말 것.`}

# 회사 이름
${m.allowBrand && e !== `ai` ? `'링크클린'을 이야기 속에 한 번 자연스럽게 써도 된다(억지면 쓰지 않기).` : `이번 글에서는 '링크클린' 등 회사 이름을 쓰지 말 것.`}

${
  e === `ai`
    ? `# 공개 앱 (링크까지 공개해도 되는 내 앱: 이름 | 설명 | 링크)
${c || `(없음)`}
${
  m.allowApp
    ? `이번 글에서 위 목록 중 오늘 글과 가장 자연스럽게 이어지는 앱 1개를 소개해도 된다(억지면 소개하지 않는다).
- 본문에서는 앱 이름과 '왜 만들었는지·뭐가 편해졌는지'만 이야기한다. 본문에 링크·주소 금지.
- 링크는 reply_starter(첫 댓글)에 넣는다. 예: "써 보실 분은 여기요 👉 (링크)". 링크가 없는 앱은 목록의 안내 문구를 그대로 쓴다.
- 소개했으면 shared_app에 앱 이름, 안 했으면 빈 문자열.`
    : `최근 글에서 이미 앱을 소개했다. 이번 글에서는 앱 링크를 넣지 말고 shared_app은 빈 문자열.`
}

`
    : ``
}# 내 지난 글 성과 데이터 (반응 좋은 글의 패턴은 살리고, 약한 글의 패턴은 피할 것)
${s || `(아직 기록 없음)`}

# 최근에 이미 올린 훅 (주제·표현·첫 줄 틀 반복 금지)
${
  r.length
    ? r.map((e, t) => `${t + 1}. ${e}`).join(`
`)
    : `(없음)`
}

# 작업 순서
1) 리서치·메모에서 서로 다른 소재나 각도로 초안 3개를 머릿속으로 쓴다 (출력하지 않음)
2) 각 초안을 채점표로 100점 만점 채점:
   - 첫 줄·제목 구체성(숫자·장소·고백·반전) 25
   - 1초 만에 답할 수 있는 질문 = 답글 유도력 25
   - 직접 겪은 사람만 쓸 수 있는 디테일(독창성) 20
   - 한 이야기·짧음(${l.range}) 15
   - 오늘성 10 (자연스럽게 이어질 때만. 날씨·뉴스 한 줄을 억지로 끼우면 오히려 -10)
   - 홍보 티 없음 5
3) 최고점 초안만 다듬어 JSON 객체 하나로 출력 (score에 점수, score_reason에 한 줄 이유)`;
}
function ee({ draft: e, length: t = `short` }) {
  let n = y[t] || y.short;
  return `너는 스레드에서 수만 개 글의 반응 데이터를 본 편집장이다. 아래 초안을 검수하고 더 반응이 좋게 고쳐라.

# 검수 기준
1. 제목·첫 줄: 피드에서 0.5초 안에 멈추게 하는가? 모호하면 숫자·장소·고백·반전으로 더 구체화.
2. 질문: 읽자마자 1초 만에 답할 수 있는가? "어떻게 생각하세요?"처럼 넓으면 "A vs B", "몇 시에~?"처럼 좁힌다.
3. 군더더기: 해설·교훈·접속사·중복 문장을 뺀다. 한 문장 = 한 줄.
4. 길이: 본문 ${n.range}, ${n.lines}. 넘치면 줄인다.
5. 사실: 초안에 없는 사실·숫자를 새로 만들지 않는다. 지어낸 경험·인용 금지.
6. 홍보 티: 업체 홍보처럼 읽히는 문장은 뺀다.
7. 신뢰: 고객 연락(문자·견적·후기 요청·답장)을 AI나 앱이 쓴다고 읽히는 문장은 반드시 지운다. AI 도구 이름(Claude 등)은 "AI"로 바꾼다.
8. 본론과 상관없는 날씨·뉴스 문장은 지운다.
고칠 게 없으면 그대로 둔다. 말투는 바꾸지 않는다.

# 초안 (JSON)
${JSON.stringify(e)}

# 출력
같은 키를 가진 JSON 객체 하나만 출력.
제목·첫 줄·태그는 사용자가 고르지 않고 그대로 올린다. title_options·hook_options 중에 더 강한 것이 있으면 title·hook(본문 첫 줄)과 바꿔 넣어, 가장 강한 한 세트로 끝낸다. topic_tag도 더 많이 노출될 구체적 태그가 있으면 바꾼다.
score는 고친 뒤 점수(100점 만점), score_reason에는 무엇을 고쳤는지 한 줄.`;
}
function te(e = []) {
  let t = e
    .filter((e) => e.stats && Number(e.stats.views) > 0)
    .map((e) => {
      let t = Number(e.stats.views) || 0,
        n = Number(e.stats.replies) || 0,
        r = Number(e.stats.likes) || 0;
      return { h: e, v: t, c: n, l: r, score: (n * 5 + r) / Math.max(t, 1) };
    });
  if (t.length < 2) return ``;
  t.sort((e, t) => t.score - e.score);
  let n = (e) =>
      `"${e.h.post.title || e.h.post.hook}" (테마 ${d[e.h.post.tone]?.label || `-`}, ${ne(e.h.post.body)}자) — 조회 ${e.v}, 댓글 ${e.c}, 좋아요 ${e.l}`,
    r = t
      .slice(0, Math.min(3, Math.ceil(t.length / 2)))
      .map((e) => `★ 반응 좋음: ` + n(e)),
    i =
      t.length >= 2
        ? t
            .slice(Math.max(Math.ceil(t.length / 2), t.length - 2))
            .map((e) => `▽ 반응 약함: ` + n(e))
        : [];
  return [...r, ...i].join(`
`);
}
var ne = (e) => [...(e || ``)].length;
function re(e) {
  let t = ``,
    n = !1,
    r = !1;
  for (let i of e)
    if (n) {
      if (r) {
        (t += i), (r = !1);
        continue;
      }
      if (i === `\\`) {
        (t += i), (r = !0);
        continue;
      }
      if (i === `"`) {
        (n = !1), (t += i);
        continue;
      }
      if (
        i ===
        `
`
      ) {
        t += `\\n`;
        continue;
      }
      if (i === `\r`) continue;
      if (i === `	`) {
        t += ` `;
        continue;
      }
      t += i;
    } else i === `"` && (n = !0), (t += i);
  return t;
}
function x(e) {
  let t = (e || ``).replace(/```(?:json)?/g, ``),
    n = t.indexOf(`{`),
    r = t.lastIndexOf(`}`);
  if (n < 0 || r < 0)
    throw Error(`AI 응답에서 글을 찾지 못했어요. 다시 생성해 주세요.`);
  let i = t.slice(n, r + 1),
    a;
  try {
    a = JSON.parse(i);
  } catch {
    a = JSON.parse(re(i));
  }
  if (!a.body) throw Error(`본문이 비어 있어요. 다시 생성해 주세요.`);
  return a;
}
function ie(e) {
  return e.title ? `${e.title}\n\n${e.body}` : e.body;
}
function S(e) {
  return `## [스레드 본문]

${ie(e)}

## [추천 사진 팁]
${e.photo_tip || e.image_idea || ``}

---
- 🏷️ 황금 해시태그: #${e.topic_tag}
- 💬 첫 댓글: ${e.reply_starter}
- ⏰ 추천 시간: ${e.best_time}${e.source_url ? `\n- 🔗 참고: [${e.source_title || e.source_url}](${e.source_url})` : ``}`;
}
var ae = `claude-sonnet-5-5`;
async function C(e, t) {
  let n = await fetch(`https://api.anthropic.com/v1/messages`, {
    method: `POST`,
    headers: {
      "content-type": `application/json`,
      "x-api-key": e,
      "anthropic-version": `2023-06-01`,
      "anthropic-dangerous-direct-browser-access": `true`,
    },
    body: JSON.stringify({ model: ae, ...t }),
  });
  if (!n.ok) {
    let e = await n.json().catch(() => ({}));
    throw n.status === 401
      ? Error(`API 키가 올바르지 않아요. 설정에서 다시 확인해 주세요.`)
      : n.status === 429
        ? Error(`요청이 많아요. 1분 뒤 다시 눌러 주세요.`)
        : n.status === 400 && /credit/i.test(e?.error?.message || ``)
          ? Error(`API 크레딧이 부족해요. 콘솔에서 충전해 주세요.`)
          : Error(e?.error?.message || `오류가 났어요 (${n.status})`);
  }
  return n.json();
}
var oe = (e) =>
  (e.content || [])
    .filter((e) => e.type === `text`)
    .map((e) => e.text)
    .join(``);
async function w(e, { toneId: t, fieldNote: n }) {
  let r = [{ role: `user`, content: v({ toneId: t, fieldNote: n }) }],
    i = [
      {
        type: `web_search_20250305`,
        name: `web_search`,
        max_uses: 5,
        user_location: {
          type: `approximate`,
          country: `KR`,
          timezone: `Asia/Seoul`,
        },
      },
    ],
    a = ``,
    o = null;
  for (let t = 0; t < 3; t++) {
    let t = await C(e, { max_tokens: 2e3, messages: r, tools: i });
    a += oe(t);
    for (let e of t.content || [])
      !o &&
        e.type === `web_search_tool_result` &&
        Array.isArray(e.content) &&
        e.content[0]?.url &&
        (o = { url: e.content[0].url, title: e.content[0].title });
    if (t.stop_reason !== `pause_turn`) break;
    r.push({ role: `assistant`, content: t.content });
  }
  return { memo: a.trim(), source: o };
}
async function se({
  apiKey: e,
  toneId: t,
  profile: n,
  fieldNote: r,
  recentHooks: i,
  useSearch: a,
  onStage: o,
  rules: s,
  length: c,
  performance: l,
  publicApps: u,
}) {
  let d = ``,
    f = null;
  if (a) {
    o?.(`research`);
    try {
      ({ memo: d, source: f } = await w(e, { toneId: t, fieldNote: r }));
    } catch (e) {
      if (/API 키|크레딧/.test(e.message)) throw e;
    }
  }
  o?.(`write`);
  let p = b({
      toneId: t,
      profile: n,
      fieldNote: r,
      recentHooks: i,
      research: d,
      rules: s,
      length: c,
      performance: l,
      publicApps: u,
    }),
    m = ``,
    h = ``;
  for (let t = 0; t < 2; t++) {
    let n = await C(e, {
      max_tokens: 3e3,
      system: _(),
      messages: [
        {
          role: `user`,
          content:
            t === 0
              ? p
              : p +
                `

# 중요
설명 없이 { 로 시작해 } 로 끝나는 JSON 객체 하나만 출력하세요.`,
        },
      ],
    });
    (m = oe(n)),
      (h = `stop_reason=${n.stop_reason} / blocks=${(n.content || []).map((e) => e.type).join(`,`)}`);
    try {
      let t = x(m);
      return (
        (t.about_cleaning =
          t.about_cleaning === !0 || t.about_cleaning === `true`),
        !t.source_url &&
          f &&
          ((t.source_url = f.url),
          (t.source_title = t.source_title || f.title)),
        await ce(e, t, c, o)
      );
    } catch {}
  }
  let g = le(m);
  if (g) return g;
  let v = Error(`AI 응답에서 글을 찾지 못했어요. 다시 생성해 주세요.`);
  throw ((v.raw = `[${h}]\n${m || `(빈 응답)`}`), v);
}
async function ce(e, t, n, r) {
  r?.(`edit`);
  try {
    let r = x(
      oe(
        await C(e, {
          max_tokens: 2e3,
          system: _(),
          messages: [{ role: `user`, content: ee({ draft: t, length: n }) }],
        }),
      ),
    );
    return !r.body || [...r.body].length > 500
      ? t
      : {
          ...t,
          ...r,
          about_cleaning: t.about_cleaning,
          shared_app: t.shared_app,
          reply_starter: t.shared_app
            ? t.reply_starter
            : r.reply_starter || t.reply_starter,
          source_url: t.source_url,
          source_title: t.source_title,
          draft_score: t.score,
        };
  } catch (e) {
    if (/API 키|크레딧/.test(e.message)) throw e;
    return t;
  }
}
function le(e) {
  if (!e || !e.trim()) return null;
  let t = e.match(
      /"body"\s*:\s*"([\s\S]*?)"\s*,\s*"(?:photo_tip|reply_starter|topic_tag|best_time)"/,
    ),
    n = t
      ? t[1]
          .replace(
            /\\n/g,
            `
`,
          )
          .replace(/\\"/g, `"`)
      : e.replace(/```(?:json)?/g, ``).trim();
  if (!t && n.startsWith(`{`)) return null;
  n = n.slice(0, 600);
  let r = (t) => (e.match(RegExp(`"${t}"\\s*:\\s*"([^"]*)"`)) || [])[1] || ``;
  return {
    hook: n.split(`
`)[0],
    body: n,
    photo_tip: r(`photo_tip`) || `오늘 현장 비포/애프터 사진 1장 첨부 추천`,
    reply_starter: r(`reply_starter`),
    topic_tag: r(`topic_tag`) || `제주살이`,
    best_time: r(`best_time`),
    trend_keyword: r(`trend_keyword`),
    trend_reason: r(`trend_reason`),
  };
}

export {
  d as THEMES,
  f as DEFAULT_APPS,
  p as pickAutoTheme,
  m as todayKey,
  h as todayLabel,
  g as computeRules,
  y as LENGTHS,
  te as performanceSummary,
  ie as fullText,
  S as toMarkdown,
  se as generatePost,
};
