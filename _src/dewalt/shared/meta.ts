// Meta Graph API (Instagram · Threads) 호출 + 발행 순서
// metaRequest: 실제 HTTP 호출 1번 (서버 /api/publish 또는 브라우저 직접 모드에서 실행)
// publishInstagram / publishThreads: 컨테이너 생성 → 처리 대기 → 발행 순서 (휴대폰에서 실행해 서버 시간초과 방지)
import type { MetaRequest, MetaResponse } from './types.js'

export const DEFAULT_GRAPH_VERSION = 'v26.0'
const THREADS_VERSION = 'v1.0'

// 허용하는 경로만 통과 (열린 프록시가 되지 않도록)
const ALLOWED: RegExp[] = [
  /^\/[0-9]+\/media$/, // 인스타 컨테이너 생성
  /^\/[0-9]+\/media_publish$/, // 인스타 발행
  /^\/[0-9]+\/threads$/, // 스레드 컨테이너 생성
  /^\/[0-9]+\/threads_publish$/, // 스레드 발행
  /^\/[0-9]+$/, // 상태·퍼머링크·계정 확인 (GET)
  /^\/me$/, // 계정 확인 (GET)
  /^\/refresh_access_token$/, // 장기 토큰 연장 (GET)
]

/** 인스타 로그인 토큰(IG로 시작)은 graph.instagram.com, 페이스북 로그인 토큰(EAA…)은 graph.facebook.com */
export function igHost(token: string): string {
  return token.startsWith('IG') ? 'https://graph.instagram.com' : 'https://graph.facebook.com'
}

export async function metaRequest(req: MetaRequest, envToken?: string): Promise<MetaResponse> {
  const token = req.token || envToken
  if (!token) throw new Error(`${req.platform === 'instagram' ? '인스타' : '스레드'} 액세스 토큰이 없어요.`)
  if (!ALLOWED.some((re) => re.test(req.path))) throw new Error('허용되지 않은 API 경로예요: ' + req.path)
  if (req.method === 'POST' && (/^\/[0-9]+$/.test(req.path) || req.path === '/me' || req.path === '/refresh_access_token'))
    throw new Error('이 경로는 조회(GET)만 가능해요.')

  let base: string
  if (req.platform === 'threads') base = `https://graph.threads.net/${THREADS_VERSION}`
  else base = `${igHost(token)}/${req.version || DEFAULT_GRAPH_VERSION}`
  // 토큰 연장은 버전 없는 주소
  if (req.path === '/refresh_access_token')
    base = req.platform === 'threads' ? 'https://graph.threads.net' : 'https://graph.instagram.com'

  const params = new URLSearchParams({ ...req.params, access_token: token })
  const url = `${base}${req.path}`
  const res =
    req.method === 'GET'
      ? await fetch(`${url}?${params}`)
      : await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        })
  const text = await res.text()
  let j: any
  try {
    j = JSON.parse(text)
  } catch {
    j = { raw: text }
  }
  if (!res.ok || j?.error) {
    const e = j?.error ?? {}
    const msg = e.error_user_msg || e.message || text.slice(0, 200)
    throw new Error(`${req.platform === 'instagram' ? '인스타' : '스레드'} API 오류${e.code ? `(${e.code})` : ''}: ${msg}`)
  }
  return j as MetaResponse
}

// ───────────── 발행 순서 ─────────────

export type MetaCaller = (req: MetaRequest) => Promise<MetaResponse>
export interface PublishMedia {
  type: 'image' | 'video'
  url: string // 공개 URL (Cloudinary/ImgBB)
}
export interface PublishResult {
  id: string
  permalink?: string
}
type Log = (msg: string) => void

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function waitReady(
  call: MetaCaller,
  platform: 'instagram' | 'threads',
  id: string,
  base: Partial<MetaRequest>,
  log: Log,
  label: string,
): Promise<void> {
  const field = platform === 'instagram' ? 'status_code' : 'status'
  const started = Date.now()
  for (let i = 0; ; i++) {
    const r = (await call({ ...base, platform, method: 'GET', path: `/${id}`, params: { fields: platform === 'instagram' ? 'status_code,status' : 'status,error_message' } } as MetaRequest)) as any
    const s = String(r[field] ?? '')
    if (s === 'FINISHED' || s === 'PUBLISHED') return
    if (s === 'ERROR' || s === 'EXPIRED') throw new Error(`${label} 처리 실패: ${r.error_message || r.status || s}`)
    if (Date.now() - started > 5 * 60_000) throw new Error(`${label} 처리 시간이 너무 길어요(5분 초과).`)
    if (i % 3 === 0) log(`${label} 처리 중… (${Math.round((Date.now() - started) / 1000)}초)`)
    await sleep(i < 3 ? 2000 : 4000)
  }
}

export async function publishInstagram(
  call: MetaCaller,
  cfg: { userId: string; token?: string; version?: string },
  media: PublishMedia[],
  caption: string,
  log: Log,
): Promise<PublishResult> {
  if (!media.length) throw new Error('인스타그램은 사진이나 영상이 최소 1개 필요해요.')
  if (media.length > 10) throw new Error('인스타 캐러셀은 최대 10개까지예요.')
  const base = { token: cfg.token, version: cfg.version }
  const create = (params: Record<string, string>) =>
    call({ ...base, platform: 'instagram', method: 'POST', path: `/${cfg.userId}/media`, params }) as Promise<any>

  let creationId: string
  if (media.length === 1) {
    const m = media[0]
    log(m.type === 'video' ? '인스타 릴스 컨테이너 만드는 중…' : '인스타 사진 컨테이너 만드는 중…')
    const r = await create(
      m.type === 'video'
        ? { media_type: 'REELS', video_url: m.url, caption, share_to_feed: 'true' }
        : { image_url: m.url, caption },
    )
    creationId = r.id
    await waitReady(call, 'instagram', creationId, base, log, m.type === 'video' ? '인스타 영상' : '인스타 사진')
  } else {
    const children: string[] = []
    for (let i = 0; i < media.length; i++) {
      const m = media[i]
      log(`인스타 캐러셀 ${i + 1}/${media.length} 올리는 중…`)
      const r = await create(
        m.type === 'video'
          ? { media_type: 'VIDEO', video_url: m.url, is_carousel_item: 'true' }
          : { image_url: m.url, is_carousel_item: 'true' },
      )
      children.push(r.id)
    }
    for (let i = 0; i < children.length; i++) await waitReady(call, 'instagram', children[i], base, log, `인스타 ${i + 1}번째`)
    log('인스타 캐러셀 묶는 중…')
    const r = await create({ media_type: 'CAROUSEL', children: children.join(','), caption })
    creationId = r.id
    await waitReady(call, 'instagram', creationId, base, log, '인스타 캐러셀')
  }

  log('인스타 발행 중…')
  const pub = (await call({ ...base, platform: 'instagram', method: 'POST', path: `/${cfg.userId}/media_publish`, params: { creation_id: creationId } })) as any
  let permalink: string | undefined
  try {
    const p = (await call({ ...base, platform: 'instagram', method: 'GET', path: `/${pub.id}`, params: { fields: 'permalink' } })) as any
    permalink = p.permalink
  } catch {
    /* 링크 조회 실패는 무시 */
  }
  return { id: pub.id, permalink }
}

export async function publishThreads(
  call: MetaCaller,
  cfg: { userId: string; token?: string },
  media: PublishMedia[],
  text: string,
  log: Log,
): Promise<PublishResult> {
  if (media.length > 20) throw new Error('스레드 캐러셀은 최대 20개까지예요.')
  const base = { token: cfg.token }
  const create = (params: Record<string, string>) =>
    call({ ...base, platform: 'threads', method: 'POST', path: `/${cfg.userId}/threads`, params }) as Promise<any>

  let creationId: string
  if (media.length <= 1) {
    const m = media[0]
    log('스레드 글 컨테이너 만드는 중…')
    const params: Record<string, string> = !m
      ? { media_type: 'TEXT', text }
      : m.type === 'video'
        ? { media_type: 'VIDEO', video_url: m.url, text }
        : { media_type: 'IMAGE', image_url: m.url, text }
    creationId = (await create(params)).id
  } else {
    const children: string[] = []
    for (let i = 0; i < media.length; i++) {
      const m = media[i]
      log(`스레드 캐러셀 ${i + 1}/${media.length} 올리는 중…`)
      const r = await create(
        m.type === 'video'
          ? { media_type: 'VIDEO', video_url: m.url, is_carousel_item: 'true' }
          : { media_type: 'IMAGE', image_url: m.url, is_carousel_item: 'true' },
      )
      children.push(r.id)
    }
    for (let i = 0; i < children.length; i++) await waitReady(call, 'threads', children[i], base, log, `스레드 ${i + 1}번째`)
    log('스레드 캐러셀 묶는 중…')
    creationId = (await create({ media_type: 'CAROUSEL', children: children.join(','), text })).id
  }
  await waitReady(call, 'threads', creationId, base, log, '스레드 글')

  log('스레드 발행 중…')
  const pub = (await call({ ...base, platform: 'threads', method: 'POST', path: `/${cfg.userId}/threads_publish`, params: { creation_id: creationId } })) as any
  let permalink: string | undefined
  try {
    const p = (await call({ ...base, platform: 'threads', method: 'GET', path: `/${pub.id}`, params: { fields: 'permalink' } })) as any
    permalink = p.permalink
  } catch {
    /* 무시 */
  }
  return { id: pub.id, permalink }
}
