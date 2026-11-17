// 서버 모드(Vercel /api/*) ↔ 직접 모드(브라우저에서 바로 호출) 자동 전환
import { generateCopy } from '../../shared/generate'
import { metaRequest, publishInstagram, publishThreads, type PublishMedia } from '../../shared/meta'
import type { GenerateRequest, GenerateResult, MetaRequest, MetaResponse } from '../../shared/types'
import type { Settings } from './storage'

export interface ServerInfo {
  ok: boolean
  env?: { ai: boolean; instagram: boolean; threads: boolean }
}

let serverInfo: ServerInfo | null = null

export async function detectServer(): Promise<ServerInfo> {
  if (serverInfo) return serverInfo
  try {
    const r = await fetch('/api/health', { cache: 'no-store' })
    const j = r.ok && (r.headers.get('content-type') || '').includes('json') ? ((await r.json()) as ServerInfo) : { ok: false }
    serverInfo = j.ok ? j : { ok: false }
  } catch {
    serverInfo = { ok: false }
  }
  return serverInfo
}

async function useServer(s: Settings): Promise<boolean> {
  if (s.apiMode === 'server') return true
  if (s.apiMode === 'direct') return false
  return (await detectServer()).ok
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const j = (await r.json().catch(() => ({ error: `서버 응답 오류 (${r.status})` }))) as any
  if (!r.ok || j?.error) throw new Error(j?.error || `서버 오류 (${r.status})`)
  return j as T
}

export async function apiGenerate(req: GenerateRequest, s: Settings): Promise<GenerateResult> {
  if (await useServer(s)) return postJson<GenerateResult>('/api/generate', req)
  return generateCopy(req, { browser: true })
}

export async function makeMetaCaller(s: Settings): Promise<(req: MetaRequest) => Promise<MetaResponse>> {
  const server = await useServer(s)
  return (req) => (server ? postJson<MetaResponse>('/api/publish', req) : metaRequest(req))
}

export async function runPublish(
  s: Settings,
  targets: { instagram: boolean; threads: boolean },
  media: PublishMedia[],
  texts: { instagram: string; threads: string },
  log: (m: string) => void,
) {
  const call = await makeMetaCaller(s)
  const result: { instagram?: { ok: boolean; link?: string; error?: string }; threads?: { ok: boolean; link?: string; error?: string } } = {}
  // 순차 호출: 인스타 → 스레드 (한쪽이 실패해도 다른 쪽은 계속)
  if (targets.instagram) {
    try {
      if (!s.igUserId) throw new Error('설정에서 Instagram Business Account ID를 넣어 주세요.')
      const r = await publishInstagram(call, { userId: s.igUserId.trim(), token: s.igToken.trim() || undefined, version: s.graphVersion }, media, texts.instagram, log)
      result.instagram = { ok: true, link: r.permalink }
      log('✅ 인스타그램 발행 완료')
    } catch (e) {
      result.instagram = { ok: false, error: (e as Error).message }
      log('❌ 인스타: ' + (e as Error).message)
    }
  }
  if (targets.threads) {
    try {
      if (!s.threadsUserId) throw new Error('설정에서 Threads User ID를 넣어 주세요.')
      const r = await publishThreads(call, { userId: s.threadsUserId.trim(), token: s.threadsToken.trim() || undefined }, media, texts.threads, log)
      result.threads = { ok: true, link: r.permalink }
      log('✅ 스레드 발행 완료')
    } catch (e) {
      result.threads = { ok: false, error: (e as Error).message }
      log('❌ 스레드: ' + (e as Error).message)
    }
  }
  return result
}
