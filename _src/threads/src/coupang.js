// 쿠팡 모드 — AI가 오늘 상품을 찾고(웹검색) 스레드 본문 / 첫 댓글까지 만들기 (v20)
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
    label: '살림 꿀팁 정리',
    emoji: '🧽',
    short: '차분하게 요령을 알려주는 말투',
    guide: "살림 요령을 정리해 알려주는 말투. '~요'체지만 딱딱하지 않게. '이렇게 쓰면 훨씬 편해요' 같은 실용 꿀팁 위주. 직업·경력·전문가라고 내세우지 않는다.",
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
- 화자는 성별을 드러내지 않는 평범한 살림하는 사람. 지어낸 개인사(주부 몇 년차, 아이 엄마 등)·직업·경력·회사·청소업체·현장 이야기는 절대 쓰지 않는다.

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

export const LINK_SLOT = '(여기에 파트너스 링크 붙여넣기)'
export const isPartnersLink = l => /^https?:\/\/(link\.coupang\.com|coupa\.ng)\//.test(String(l || '').trim())

export function buildComment(summary, link) {
  const s = String(summary || '').replace(/https?:\/\/\S+/g, '').trim()
  const l = String(link || '').trim() || LINK_SLOT
  return `${s}\n\n👉 ${l}\n\n${DISCLOSURE}`
}

// 쿠팡파트너스 '링크 생성' 화면 (상품 주소를 붙여넣으면 내 링크가 나옴)
export const PARTNERS_LINK_PAGE = 'https://partners.coupang.com/#affiliate/ws/link-to-any-page'
export const coupangSearchUrl = q => 'https://www.coupang.com/np/search?q=' + encodeURIComponent(q)

const PRODUCT_RE = /https?:\/\/(?:www\.|m\.)?coupang\.com\/vp\/products\/(\d+)/

function findSystem(avoid) {
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Seoul' })
  return `너는 한국 스레드 '살림 꿀템·꿀팁 기록' 계정의 쿠팡파트너스 상품 담당이다. 오늘은 ${today}.

할 일: web_search로 오늘 날짜·계절 기준 한국에서 반응 좋은 살림·청소·생활 상품 트렌드를 확인하고, 쿠팡에서 살 수 있는 상품 1개를 고른다.
- 조건: 쿠팡 평점 4.5 이상, 리뷰 많음, 무료배송(로켓배송 등) 상품을 우선. 가격대는 1~3만원 안팎의 부담 없는 생활용품 우선.
- 쿠팡 상품 페이지 주소(https://www.coupang.com/vp/products/숫자)를 검색 결과에서 실제로 찾은 경우에만 product_url에 넣는다. 지어내지 말고, 못 찾으면 빈 문자열.
- 남의 쿠팡파트너스 링크(link.coupang.com/...)는 절대 쓰지 않는다.
- 다음 상품(또는 같은 종류)은 피한다: ${avoid.length ? avoid.join(', ') : '없음'}
- 평점·리뷰 수·가격은 검색에서 확인한 것만 적고, 확인 못 했으면 빈 문자열. 최저가·품절 단정 금지.

검색이 끝나면 설명 없이 JSON 하나만 출력:
{"name":"쿠팡 상품명(브랜드+핵심)","search_keyword":"쿠팡에서 찾을 검색어","product_url":"","price":"","rating":"","reviews":"","why":"왜 지금 반응이 좋은지 한 줄","reference":"글 쓸 때 참고할 상품 특징 2~3줄(확인된 사실만)"}`
}

// AI가 웹검색으로 오늘의 쿠팡 상품 1개 찾기
export async function findProduct({ apiKey, avoid = [] }) {
  const tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6, user_location: { type: 'approximate', country: 'KR', timezone: 'Asia/Seoul' } }]
  const messages = [{ role: 'user', content: '오늘 올릴 쿠팡 상품 1개를 찾아 JSON으로 알려줘.' }]
  let text = ''
  const seen = new Set() // 검색 결과에 실제로 나온 쿠팡 상품 주소
  for (let i = 0; i < 4; i++) {
    const res = await callClaude(apiKey, { max_tokens: 2500, system: findSystem(avoid), messages, tools })
    for (const b of res.content || []) {
      if (b.type === 'web_search_tool_result' && Array.isArray(b.content))
        b.content.forEach(r => { const m = PRODUCT_RE.exec(r.url || ''); if (m) seen.add(m[1]) })
    }
    text = textOf(res)
    if (res.stop_reason !== 'pause_turn') break
    messages.push({ role: 'assistant', content: res.content })
  }
  let out
  try {
    const t = text.replace(/```(?:json)?/g, ''), i = t.indexOf('{'), j = t.lastIndexOf('}')
    out = JSON.parse(t.slice(i, j + 1))
  } catch {
    const err = new Error('상품을 못 골랐어요. 다시 눌러 주세요.'); err.raw = text; throw err
  }
  const name = String(out.name || '').trim()
  if (!name) throw new Error('상품을 못 골랐어요. 다시 눌러 주세요.')
  const m = PRODUCT_RE.exec(out.product_url || '')
  const verified = !!(m && seen.has(m[1]))
  const keyword = String(out.search_keyword || name).trim()
  return {
    name, keyword,
    url: m ? `https://www.coupang.com/vp/products/${m[1]}` : coupangSearchUrl(keyword),
    isProductPage: !!m, verified,
    price: String(out.price || '').trim(),
    rating: String(out.rating || '').trim(),
    reviews: String(out.reviews || '').trim(),
    why: String(out.why || '').trim(),
    reference: [name, out.why, out.reference].filter(Boolean).join('\n'),
  }
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
