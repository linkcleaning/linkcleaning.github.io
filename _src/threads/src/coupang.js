// 쿠팡 모드 — 쿠팡파트너스 링크 + 참고 내용으로 스레드 본문 / 첫 댓글 만들기 (v19)
import { callClaude, textOf, parseJson } from './lib.js'

export const DISCLOSURE = '이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.'

export const CP_TONES = {
  friend: {
    label: '친근한 꿀템 추천',
    emoji: '😎',
    short: '반말·음슴체, 친구한테 알려주듯',
    guide: "친구한테 카톡하듯 반말과 음슴체를 섞어서. 가볍고 솔직하게. '이거 진짜 물건임', '나만 몰랐냐' 같은 리듬.",
    cta: '정보는 댓글에 남겨뒀어 👇',
  },
  expert: {
    label: '살림·청소 전문가 꿀팁',
    emoji: '🧽',
    short: '경험 많은 프로의 노하우',
    guide: "살림·청소를 오래 해 온 사람이 요령을 알려주는 말투. '~요'체지만 딱딱하지 않게. '이렇게 쓰면 훨씬 편해요' 같은 실용 꿀팁 위주.",
    cta: '제품 정보는 댓글에 정리해뒀어요 👇',
  },
  hype: {
    label: '호기심 유발 품절대란',
    emoji: '🔥',
    short: '궁금해서 댓글 열게 만드는 훅',
    guide: "첫 줄에서 궁금증을 확 끌어올리는 말투. '이거 왜 다들 쟁여두는지 알겠음', '알고 나면 못 돌아감' 같은 훅. 단, 실제로 품절이라고 단정하지 말 것.",
    cta: '뭔지 궁금하면 댓글 확인 👇',
  },
}

function systemPrompt(toneKey) {
  const t = CP_TONES[toneKey]
  return `너는 한국 스레드(Threads)에서 조회수와 댓글이 잘 나오는 상품 추천 글을 쓰는 카피라이터다.

[본문 규칙]
- 3~5줄. 한 줄마다 줄바꿈(\\n). 모바일에서 한눈에 읽히게 짧게.
- 첫 줄은 피드에서 손가락을 멈추게 하는 훅. 구체적인 상황·불편·숫자·반전 중 하나를 담는다.
- 이모지 2~4개만 자연스럽게.
- 말투: ${t.guide}
- 마지막 줄은 반드시 댓글을 열어보게 만드는 유도 문구. 예: "${t.cta}"
- 본문에 링크·URL·'쿠팡'·가격·할인율·해시태그(#)를 넣지 않는다.
- 참고 글이 주어지면 구조와 리듬만 참고하고 문장을 베끼지 않는다.
- '최저가', '품절', '의학적 효과', '100%' 같은 확인 안 된 단정 금지.
- 참고 내용에 없는 구체적 사용 경험(예: "3달째 쓰는 중", "직접 사 봤는데")을 지어내지 않는다.

[summary] 첫 댓글 맨 위에 들어갈 상품 한 줄 요약. 25자 안팎, 이모지 1개. 예: "🧴 바르고 닦기만 하는 욕실 곰팡이 젤"
[topic_tag] 이 글이 가장 많이 노출될 스레드 주제 태그 1개(# 없이). '쇼핑'처럼 넓은 것 말고 사람들이 실제로 팔로우하는 구체적 태그(예: 살림템, 자취꿀템, 청소꿀팁 — 형식만 참고).

설명 없이 JSON 객체 하나만 출력: {"body": "본문", "summary": "한 줄 요약", "topic_tag": "태그"}`
}

function cleanBody(body, toneKey, adTag) {
  let b = String(body || '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\r/g, '')
    .split('\n').map(l => l.trim())
    .filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== ''))
    .join('\n').trim()
  if (!/댓글|👇/.test(b)) b += '\n' + CP_TONES[toneKey].cta
  if (adTag && !/^\(광고\)/.test(b)) b = '(광고) ' + b
  return b
}

export function buildComment(summary, link) {
  const s = String(summary || '').replace(/https?:\/\/\S+/g, '').trim()
  return `${s}\n\n👉 ${String(link).trim()}\n\n${DISCLOSURE}`
}

export async function generateCoupang({ apiKey, reference, link, toneKey, adTag }) {
  let raw = ''
  for (let i = 0; i < 2; i++) {
    const res = await callClaude(apiKey, {
      max_tokens: 1200,
      system: systemPrompt(toneKey),
      messages: [{ role: 'user', content: `[상품명 / 참고 내용]\n${reference}` + (i ? '\n\n설명 없이 { 로 시작해 } 로 끝나는 JSON 하나만 출력.' : '') }],
    })
    raw = textOf(res)
    try {
      const out = parseJson(raw)
      const body = cleanBody(out.body, toneKey, adTag)
      const tag = String(out.topic_tag || '').replace(/^#/, '').replace(/\s+/g, '')
      return { body, tag, summary: out.summary || '', comment: buildComment(out.summary, link) }
    } catch {}
  }
  const err = new Error('AI 응답을 읽지 못했어요. 다시 눌러 주세요.')
  err.raw = raw
  throw err
}

// 스레드 글쓰기 창을 본문이 채워진 채로 여는 주소
export function threadsIntentUrl(text) {
  return 'https://www.threads.net/intent/post?text=' + encodeURIComponent(text)
}
