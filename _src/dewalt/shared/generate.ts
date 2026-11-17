// AI 카피라이팅 생성 — 서버(/api/generate)와 브라우저 직접 모드가 같은 코드를 씀
import type { Category, GenerateRequest, GenerateResult } from './types.js'
import { CATEGORY_LABEL } from './types.js'

export const DEFAULT_MODEL = {
  claude: 'claude-sonnet-5-5',
  gemini: 'gemini-2.5-flash',
} as const

const CATEGORY_GUIDE: Record<Category, string> = {
  repair:
    '수리 사례. 고장 증상 → 원인 진단 → 정품 부품으로 수리 → 테스트 완료 순서로 쓴다. 사진 속 파손 부위·교체 부품이 보이면 구체적으로 언급한다. "빠른 출고", "정품 부품" 신뢰 포인트 강조.',
  new:
    '신제품 입고 소개. 제품 모델명, 핵심 스펙(전압·토크·브러시리스 여부 등은 메모나 사진에서 확인된 것만), 어떤 현장에 좋은지, 재고/입고 소식을 알린다. 확인되지 않은 스펙은 지어내지 않는다.',
  parts:
    '정품 부속·소모품 판매 안내. 부품 이름(모터, 스위치, 하우징, 기어, 카본브러시, 날, 비트 등)과 맞는 모델, 정품을 써야 하는 이유(수명·안전·AS 보증), 재고 문의 방법을 안내한다.',
  reels:
    '짧은 작동 영상/현장 스케치 릴스용. 첫 줄은 스크롤을 멈추게 하는 짧은 훅. 영상에서 볼 포인트를 2~3줄로. 짧고 리듬감 있게.',
}

function buildPrompt(r: GenerateRequest): string {
  const extras: string[] = []
  if (r.includeDelivery) extras.push(`- 택배 접수 안내를 자연스럽게 언급: "${r.shop.deliveryText || '택배 접수 · 전국 발송 가능'}"`)
  if (r.includeVisit)
    extras.push(
      `- 방문 수리/매장 위치 안내를 자연스럽게 언급: ${r.shop.name || '광주 디월트 AS센터'}${r.shop.address ? ` (${r.shop.address})` : ' (광주광역시)'}`,
    )

  return `너는 '${r.shop.name || '광주 디월트 공식 AS센터'}'의 SNS 담당 카피라이터다. 고객은 주로 현장 기술자·인테리어·설비·건설 사장님들이다.

[카테고리] ${CATEGORY_LABEL[r.category]}
[작성 방향] ${CATEGORY_GUIDE[r.category]}
[현장 메모] ${r.memo.trim() || '(메모 없음 — 사진만 보고 작성)'}
[첨부] 사진 ${r.images.length}장${r.hasVideo ? ' + 영상(첫 장면 캡처 포함)' : ''}
${extras.length ? '[스레드 글에 꼭 포함 — 인스타는 하단 안내가 자동으로 붙으니 본문에서 반복하지 말 것]\n' + extras.join('\n') : ''}

사진이 있으면 먼저 사진을 꼼꼼히 본다: 공구 종류, 보이는 모델명(DCF850, DCD796 같은 표기), 파손 부위, 부품, 현장 분위기. 사진·메모로 확인되지 않은 사실(가격, 재고 수량, 보증 기간 등)은 절대 지어내지 않는다.

두 가지 글을 만든다.

1) instagram (인스타그램 피드 본문)
- 전문적이고 신뢰감 있는 톤. 정품 부품 사용, 신속한 AS를 강조.
- 첫 줄은 한눈에 들어오는 제목 줄(이모지 1개 + 핵심 한 문장).
- 2~4줄씩 문단을 나누고 문단 사이 빈 줄. 이모지는 줄 앞 포인트로 적당히(🔧 ✅ ⚡ 📦 📍 등).
- 본문 400~900자. 해시태그는 본문에 넣지 않는다(따로 hashtags에).
- 마지막 줄은 문의 유도(DM·전화·방문).

2) hashtags (인스타 해시태그 배열)
- 기본 태그를 반드시 포함: ${r.baseHashtags.join(' ')}
- 여기에 제품 모델명·공구 종류·증상 기반 태그 8~12개 추가 (예: #DCF850 #디월트임팩드라이버 #임팩수리 #기어박스수리).
- 모두 '#'로 시작, 띄어쓰기 없이, 중복 없이, 전체 25개 이하.

3) threads (스레드 글)
- 공백 포함 450자 이내 (절대 500자 넘기지 않기).
- 친근한 소통형 말투. 예시 느낌: "사장님들, 오늘 현장에서 이거 고장 나면 진짜 답 없죠? 광주 디월트 AS센터에서 바로 살려냈습니다!"
- 광고 전단 느낌 말고 사람이 직접 쓴 느낌. 이모지는 1~3개만.
- 마지막은 댓글을 부르는 질문으로 끝낸다 (예: "여러분은 임팩 기어 몇 년 쓰셨어요?").
- 해시태그는 넣지 않거나 맨 끝에 1개만.

반드시 아래 JSON 한 개만 출력한다. 코드블록·설명 없이.
{"instagram":"...","hashtags":["#..."],"threads":"..."}`
}

function parseJson(text: string): GenerateResult {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end < 0) throw new Error('AI 응답을 읽지 못했어요. 다시 시도해 주세요.')
  const obj = JSON.parse(text.slice(start, end + 1)) as Partial<GenerateResult>
  return {
    instagram: String(obj.instagram ?? '').trim(),
    hashtags: Array.isArray(obj.hashtags) ? obj.hashtags.map(String) : [],
    threads: String(obj.threads ?? '').trim(),
  }
}

/** 해시태그 정리: # 붙이기, 공백 제거, 중복 제거, 30개 제한(인스타 한도) */
export function cleanHashtags(tags: string[], base: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of [...base, ...tags]) {
    for (const piece of String(raw).split(/[\s,]+/)) {
      const t = piece.replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '')
      if (!t) continue
      const key = t.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push('#' + t)
    }
  }
  return out.slice(0, 30)
}

async function callClaude(r: GenerateRequest, key: string, browser: boolean): Promise<string> {
  const content: unknown[] = r.images.map((data) => ({
    type: 'image',
    source: { type: 'base64', media_type: 'image/jpeg', data },
  }))
  content.push({ type: 'text', text: buildPrompt(r) })
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
  }
  if (browser) headers['anthropic-dangerous-direct-browser-access'] = 'true'
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: r.model || DEFAULT_MODEL.claude,
      max_tokens: 2500,
      messages: [{ role: 'user', content }],
    }),
  })
  const j = (await res.json()) as any
  if (!res.ok) throw new Error(`Claude 오류(${res.status}): ${j?.error?.message ?? '알 수 없음'}`)
  return (j.content ?? []).map((c: any) => c.text ?? '').join('')
}

async function callGemini(r: GenerateRequest, key: string): Promise<string> {
  const parts: unknown[] = r.images.map((data) => ({ inline_data: { mime_type: 'image/jpeg', data } }))
  parts.push({ text: buildPrompt(r) })
  const model = r.model || DEFAULT_MODEL.gemini
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.8 },
      }),
    },
  )
  const j = (await res.json()) as any
  if (!res.ok) throw new Error(`Gemini 오류(${res.status}): ${j?.error?.message ?? '알 수 없음'}`)
  return (j.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? '').join('')
}

/** Threads 500자 한도 맞추기 */
export function fitThreads(text: string, limit = 500): string {
  const chars = Array.from(text)
  if (chars.length <= limit) return text
  return chars.slice(0, limit - 1).join('').trimEnd() + '…'
}

export async function generateCopy(r: GenerateRequest, opts: { browser: boolean; fallbackKey?: string }): Promise<GenerateResult> {
  const key = r.apiKey || opts.fallbackKey
  if (!key) throw new Error('AI API 키가 없어요. 설정 탭에서 입력해 주세요.')
  const text = r.provider === 'gemini' ? await callGemini(r, key) : await callClaude(r, key, opts.browser)
  const out = parseJson(text)
  out.hashtags = cleanHashtags(out.hashtags, r.baseHashtags)
  out.threads = fitThreads(out.threads)
  return out
}
