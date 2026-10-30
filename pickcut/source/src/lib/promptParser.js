// ═════════════════════════════════════════════════════════════
// promptParser.js — 자연어 문장 → 편집 명령(ops) 변환기
//
// 예) "배경 흐리게 하고 조금 더 밝게"
//   → [{ type: 'bgBlur', amount: 1 }, { type: 'brightness', amount: 0.5 }]
//
// 지금은 '키워드 사전' 방식(오프라인, 무료, 즉시 응답)입니다.
// 나중에 LLM(Claude/Gemini API)으로 바꿀 때도 '출력 모양(ops 배열)'만
// 똑같이 맞추면 편집 엔진·화면 코드는 그대로 쓸 수 있습니다.
// → 파일 맨 아래 parsePromptWithLLM() 참고
// ═════════════════════════════════════════════════════════════

/**
 * 명령 사전. 새 기능을 추가하려면 여기에 한 덩어리만 추가하세요.
 *   type     : 편집 엔진(editEngine.js)이 알아듣는 명령 이름
 *   label    : 화면에 보여줄 이름
 *   match    : 이 표현이 문장에 있으면 해당 명령으로 인식 (정규식)
 *   sign     : +1(올리기) / -1(내리기). 같은 type을 반대로 쓸 때 사용
 */
const COMMANDS = [
  { type: 'bgBlur', label: '배경 흐림', match: /배경.*(흐리|블러|날려|뭉개)|아웃포커스|인물\s*모드|보케/ },
  { type: 'subjectPop', label: '피사체 분리', match: /피사체.*(분리|강조|살려)|누끼|주인공.*강조|배경.*(흑백|어둡)/ },
  { type: 'brightness', sign: 1, label: '밝게', match: /밝게|화사|환하게|밝혀/ },
  { type: 'brightness', sign: -1, label: '어둡게', match: /어둡게|차분하게|무디게/ },
  { type: 'contrast', sign: 1, label: '대비 ↑', match: /대비.*(높|강|올)|쨍하게|선명한\s*색/ },
  { type: 'contrast', sign: -1, label: '대비 ↓', match: /대비.*(낮|약|내)|부드럽게|소프트/ },
  { type: 'saturation', sign: 1, label: '채도 ↑', match: /채도.*(높|올)|색.*(진하게|생생)|비비드/ },
  { type: 'saturation', sign: -1, label: '채도 ↓', match: /채도.*(낮|내)|색.*(빼|연하게)|물빠진/ },
  { type: 'grayscale', label: '흑백', match: /흑백|모노|무채색/ },
  { type: 'warmth', sign: 1, label: '따뜻하게', match: /따뜻|따듯|노을|골든\s*아워|웜/ },
  { type: 'warmth', sign: -1, label: '차갑게', match: /차갑|시원하게|쿨톤|푸르게/ },
  { type: 'vintage', label: '필름 느낌', match: /필름|빈티지|레트로|옛날\s*사진/ },
  { type: 'sharpen', label: '선명하게', match: /선명하게|또렷|샤프|디테일/ },
  { type: 'vignette', label: '비네팅', match: /비네팅|가장자리.*어둡|테두리.*어둡/ },
];

// 강도를 나타내는 말 → 배율
const INTENSITY = [
  { match: /아주|엄청|많이|확|훨씬|완전|강하게|진짜/, value: 1.7 },
  { match: /조금|살짝|약간|은은|약하게|덜/, value: 0.5 },
];

// 전체 되돌리기 명령 (편집 훅에서 따로 처리)
const RESET = /원래대로|원본으로|처음으로|초기화|다\s*취소/;

/**
 * 문장을 '절(clause)' 단위로 쪼갭니다.
 * "배경 흐리게 하고, 조금 밝게" → ["배경 흐리게", "조금 밝게"]
 * 이렇게 해야 '조금'이 '밝게'에만 적용되고 '배경 흐림'에는 영향이 없습니다.
 */
function splitClauses(text) {
  return text
    .split(/,|\.|그리고|그 다음|다음에|하고|해주고|해 주고|\+|&/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function readIntensity(clause) {
  for (const it of INTENSITY) if (it.match.test(clause)) return it.value;
  return 1;
}

/**
 * 메인 함수: 문장 → { ops, labels, reset, understood }
 */
export function parsePrompt(text) {
  const input = (text || '').trim();
  if (RESET.test(input)) return { ops: [], labels: ['원본으로'], reset: true, understood: true };

  const ops = [];
  const labels = [];
  for (const clause of splitClauses(input)) {
    const amount = readIntensity(clause);
    for (const cmd of COMMANDS) {
      if (!cmd.match.test(clause)) continue;
      // 같은 절에서 '배경 어둡게'가 피사체 분리와 '어둡게' 둘 다 걸리지 않도록,
      // 배경을 언급한 절에서는 밝기 명령을 건너뜁니다.
      if (cmd.type === 'brightness' && /배경/.test(clause)) continue;
      ops.push({ type: cmd.type, amount: amount * (cmd.sign ?? 1) });
      labels.push(amount > 1 ? `${cmd.label}+` : amount < 1 ? `${cmd.label}(약)` : cmd.label);
    }
  }
  return { ops, labels, reset: false, understood: ops.length > 0 };
}

/** 입력창 위에 보여줄 추천 문장 (탭하면 바로 실행) */
export const SUGGESTIONS = [
  '배경 흐리게',
  '피사체 분리',
  '조금 더 밝게',
  '따뜻한 노을 느낌',
  '필름 카메라처럼',
  '흑백으로',
  '선명하게',
  '원래대로',
];

/* ─────────────────────────────────────────────────────────────
 * [확장] LLM으로 문장 해석하기 — 키워드 사전으로 못 알아듣는 문장 대응
 *
 * 브라우저에서 API 키를 직접 쓰면 키가 노출되므로, 반드시 서버
 * (예: Cloudflare Workers)를 거쳐 호출하세요. 서버는 아래처럼 지시합니다:
 *
 *   "사용자의 사진 편집 요청을 JSON 배열로만 답하라.
 *    가능한 type: bgBlur, subjectPop, brightness, contrast, saturation,
 *    grayscale, warmth, vintage, sharpen, vignette.
 *    amount는 -2 ~ 2 사이 숫자."
 *
 * export async function parsePromptWithLLM(text) {
 *   const res = await fetch('/api/parse-edit', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ text }),
 *   });
 *   const ops = await res.json();           // [{ type, amount }, ...]
 *   return { ops, labels: ops.map(o => o.type), reset: false, understood: ops.length > 0 };
 * }
 *
 * 사용 예: 키워드로 못 알아들었을 때만 LLM 호출 → 비용 절약
 *   let r = parsePrompt(text);
 *   if (!r.understood) r = await parsePromptWithLLM(text);
 * ───────────────────────────────────────────────────────────── */
