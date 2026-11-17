import { useEffect, useState } from 'react'
import { DEFAULT_MODEL } from '../../shared/generate'
import { detectServer, makeMetaCaller, type ServerInfo } from '../lib/api'
import { DEFAULT_SETTINGS, saveSettings, tokenDaysLeft, type Settings } from '../lib/storage'
import { Btn, Field, Section } from './ui'

export const GUIDE_URL = './guide.html'

function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 rounded-xl bg-ink p-1">
      {options.map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)} className={`flex-1 rounded-lg py-2 text-[13px] font-semibold ${value === k ? 'bg-dw text-ink' : 'text-ash'}`}>
          {l}
        </button>
      ))}
    </div>
  )
}

function DaysBadge({ at }: { at?: number }) {
  const d = tokenDaysLeft(at)
  if (d === null) return null
  const c = d <= 7 ? 'bg-red-500 text-white' : d <= 20 ? 'bg-orange-500 text-ink' : 'bg-iron text-bone'
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${c}`}>{d > 0 ? `토큰 D-${d}` : '토큰 만료 추정'}</span>
}

export default function SettingsView({ s, setS, toast }: { s: Settings; setS: (s: Settings) => void; toast: (m: string) => void }) {
  const [srv, setSrv] = useState<ServerInfo | null>(null)
  const [test, setTest] = useState<Record<string, string>>({})
  useEffect(() => {
    detectServer().then(setSrv)
  }, [])

  const up = (p: Partial<Settings>) => {
    const n = { ...s, ...p }
    if (p.igToken !== undefined && p.igToken !== s.igToken) n.igTokenSavedAt = p.igToken ? Date.now() : undefined
    if (p.threadsToken !== undefined && p.threadsToken !== s.threadsToken) n.threadsTokenSavedAt = p.threadsToken ? Date.now() : undefined
    setS(n)
    saveSettings(n)
  }

  const runTest = async (which: 'instagram' | 'threads') => {
    setTest((t) => ({ ...t, [which]: '확인 중…' }))
    try {
      const call = await makeMetaCaller(s)
      if (which === 'instagram') {
        const igLogin = s.igToken.trim().startsWith('IG')
        // 인스타 로그인 토큰이면 /me 로 계정 ID 자동 확인, 페이스북 방식이면 입력한 ID로 확인
        const path = igLogin || !s.igUserId ? '/me' : `/${s.igUserId.trim()}`
        const r = (await call({ platform: 'instagram', method: 'GET', path, params: { fields: igLogin ? 'user_id,username' : 'id,username' }, token: s.igToken.trim() || undefined, version: s.graphVersion })) as any
        const id = String(r.user_id ?? r.id ?? '')
        if (igLogin && id && id !== s.igUserId) up({ igUserId: id })
        setTest((t) => ({ ...t, instagram: `✅ 연결됨: @${r.username ?? '?'} (ID ${id})` }))
      } else {
        const r = (await call({ platform: 'threads', method: 'GET', path: '/me', params: { fields: 'id,username' }, token: s.threadsToken.trim() || undefined })) as any
        if (r.id && String(r.id) !== s.threadsUserId) up({ threadsUserId: String(r.id) })
        setTest((t) => ({ ...t, threads: `✅ 연결됨: @${r.username ?? '?'} (ID ${r.id})` }))
      }
    } catch (e) {
      setTest((t) => ({ ...t, [which]: '❌ ' + (e as Error).message }))
    }
  }

  const refresh = async (which: 'instagram' | 'threads') => {
    try {
      const token = (which === 'instagram' ? s.igToken : s.threadsToken).trim()
      if (which === 'instagram' && !token.startsWith('IG')) throw new Error('페이스북 로그인 토큰(EAA…)은 여기서 연장이 안 돼요. 가이드의 장기 토큰 발급을 다시 해 주세요.')
      const call = await makeMetaCaller(s)
      const r = (await call({
        platform: which,
        method: 'GET',
        path: '/refresh_access_token',
        params: { grant_type: which === 'instagram' ? 'ig_refresh_token' : 'th_refresh_token' },
        token: token || undefined,
      })) as any
      if (!r.access_token) throw new Error('새 토큰을 받지 못했어요')
      up(which === 'instagram' ? { igToken: r.access_token, igTokenSavedAt: Date.now() } : { threadsToken: r.access_token, threadsTokenSavedAt: Date.now() })
      toast('토큰 60일 연장 완료')
    } catch (e) {
      toast((e as Error).message.slice(0, 60))
    }
  }

  const exportAll = () => {
    const blob = new Blob([JSON.stringify({ settings: s, history: JSON.parse(localStorage.getItem('dw-sns-history-v1') || '[]') }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `dewalt-sns-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }

  return (
    <div className="space-y-4">
      <a href={GUIDE_URL} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-dw/50 bg-dw/10">
        <div className="hazard-thin h-1.5" />
        <div className="flex items-center gap-3 p-4">
          <span className="text-3xl">📘</span>
          <div className="min-w-0">
            <div className="font-head text-[16px] text-dw">처음이세요? 연결 가이드 보기</div>
            <div className="text-[12px] text-ash">인스타·스레드 토큰 발급, Cloudinary, Vercel 배포 순서</div>
          </div>
        </div>
      </a>

      <div className="rounded-xl bg-coal px-4 py-3 text-[12px] leading-relaxed text-ash">
        🔒 키·토큰은 <b className="text-bone">이 휴대폰 브라우저에만</b> 저장돼요. 서버 모드: {srv === null ? '확인 중…' : srv.ok ? <b className="text-dw">Vercel 서버 연결됨</b> : '서버 없음 → 휴대폰에서 직접 호출'}
        {srv?.ok && srv.env && (srv.env.ai || srv.env.instagram || srv.env.threads) && (
          <> · 서버에 저장된 키: {[srv.env.ai && 'AI', srv.env.instagram && '인스타', srv.env.threads && '스레드'].filter(Boolean).join(', ')} (앱에선 비워 둬도 돼요)</>
        )}
      </div>

      <Section title="🏪 매장 정보">
        <div className="space-y-3">
          <Field label="매장 이름" value={s.shopName} onChange={(v) => up({ shopName: v })} />
          <Field label="주소" value={s.address} onChange={(v) => up({ address: v })} placeholder="광주광역시 ○○구 ○○로 00" />
          <Field label="전화번호" value={s.phone} onChange={(v) => up({ phone: v })} placeholder="062-000-0000" type="tel" />
          <Field label="영업시간" value={s.hours} onChange={(v) => up({ hours: v })} placeholder="예: 평일 08:30~18:00" />
          <Field label="택배 안내 문구" value={s.deliveryText} onChange={(v) => up({ deliveryText: v })} />
          <label className="block">
            <span className="mb-1 block text-[13px] font-semibold">기본 해시태그 (항상 포함)</span>
            <textarea value={s.baseHashtags} onChange={(e) => up({ baseHashtags: e.target.value })} rows={3} className="w-full rounded-xl border border-iron bg-ink px-3 py-2.5 text-[14px] outline-none focus:border-dw" />
          </label>
        </div>
      </Section>

      <Section title="🤖 AI 글쓰기">
        <div className="space-y-3">
          <Seg value={s.aiProvider} onChange={(v) => up({ aiProvider: v, aiModel: '' })} options={[['claude', 'Claude'], ['gemini', 'Gemini']]} />
          <Field
            label={s.aiProvider === 'claude' ? 'Claude API 키' : 'Gemini API 키'}
            secret
            value={s.aiKey}
            onChange={(v) => up({ aiKey: v.trim() })}
            placeholder={s.aiProvider === 'claude' ? 'sk-ant-…' : 'AIza…'}
            hint={s.aiProvider === 'claude' ? 'console.anthropic.com → API Keys' : 'aistudio.google.com → Get API key'}
          />
          <Field label="모델 (비우면 기본값)" value={s.aiModel} onChange={(v) => up({ aiModel: v.trim() })} placeholder={DEFAULT_MODEL[s.aiProvider]} />
        </div>
      </Section>

      <Section title="📸 인스타그램" right={<DaysBadge at={s.igTokenSavedAt} />}>
        <div className="space-y-3">
          <Field label="Instagram Business Account ID" value={s.igUserId} onChange={(v) => up({ igUserId: v.replace(/\D/g, '') })} placeholder="IG 토큰이면 연결 테스트로 자동 입력" type="tel" />
          <Field label="Instagram 액세스 토큰 (장기)" secret value={s.igToken} onChange={(v) => up({ igToken: v.trim() })} placeholder="IGAA… 또는 EAA…" hint="IG로 시작: 인스타 로그인 방식 · EAA로 시작: 페이스북 페이지 연결 방식 (둘 다 자동 인식)" />
          <div className="grid grid-cols-2 gap-2">
            <Btn onClick={() => runTest('instagram')} disabled={!s.igToken && !srv?.env?.instagram}>연결 테스트</Btn>
            <Btn onClick={() => refresh('instagram')} disabled={!s.igToken}>토큰 60일 연장</Btn>
          </div>
          {test.instagram && <div className="text-[13px] leading-relaxed">{test.instagram}</div>}
        </div>
      </Section>

      <Section title="🧵 스레드" right={<DaysBadge at={s.threadsTokenSavedAt} />}>
        <div className="space-y-3">
          <Field label="Threads 액세스 토큰 (장기)" secret value={s.threadsToken} onChange={(v) => up({ threadsToken: v.trim() })} placeholder="THAA…" hint="스레드 토큰은 인스타 토큰과 별개예요 (가이드 3단계)" />
          <Field label="Threads User ID" value={s.threadsUserId} onChange={(v) => up({ threadsUserId: v.replace(/\D/g, '') })} placeholder="연결 테스트를 누르면 자동 입력" type="tel" />
          <div className="grid grid-cols-2 gap-2">
            <Btn onClick={() => runTest('threads')} disabled={!s.threadsToken && !srv?.env?.threads}>연결 테스트</Btn>
            <Btn onClick={() => refresh('threads')} disabled={!s.threadsToken}>토큰 60일 연장</Btn>
          </div>
          {test.threads && <div className="text-[13px] leading-relaxed">{test.threads}</div>}
        </div>
      </Section>

      <Section title="☁️ 사진·영상 올릴 곳">
        <div className="space-y-3">
          <Seg value={s.hostProvider} onChange={(v) => up({ hostProvider: v })} options={[['cloudinary', 'Cloudinary (사진+영상)'], ['imgbb', 'ImgBB (사진만)']]} />
          {s.hostProvider === 'cloudinary' ? (
            <>
              <Field label="Cloud name" value={s.cloudName} onChange={(v) => up({ cloudName: v.trim() })} placeholder="예: dxxxxxx" />
              <Field label="Upload preset (Unsigned)" value={s.uploadPreset} onChange={(v) => up({ uploadPreset: v.trim() })} placeholder="예: dewalt_sns" hint="Cloudinary → Settings → Upload → Add upload preset → Signing mode: Unsigned" />
            </>
          ) : (
            <Field label="ImgBB API 키" secret value={s.imgbbKey} onChange={(v) => up({ imgbbKey: v.trim() })} hint="api.imgbb.com 에서 무료 발급 — 영상은 못 올려요" />
          )}
        </div>
      </Section>

      <Section title="🛠 고급">
        <div className="space-y-3">
          <div>
            <span className="mb-1 block text-[13px] font-semibold">API 호출 방식</span>
            <Seg value={s.apiMode} onChange={(v) => up({ apiMode: v })} options={[['auto', '자동'], ['server', 'Vercel 서버'], ['direct', '휴대폰 직접']]} />
          </div>
          <Field label="Instagram Graph API 버전" value={s.graphVersion} onChange={(v) => up({ graphVersion: v.trim() || 'v26.0' })} hint="오류에 '버전'이 나오면 최신 버전으로 바꿔 주세요" />
          <div className="grid grid-cols-2 gap-2">
            <Btn onClick={exportAll}>설정·기록 백업</Btn>
            <Btn
              kind="danger"
              onClick={() => {
                if (!confirm('저장된 키·토큰을 모두 지울까요? (기록은 남아요)')) return
                up({ ...DEFAULT_SETTINGS, shopName: s.shopName, address: s.address, phone: s.phone, hours: s.hours, igTokenSavedAt: undefined, threadsTokenSavedAt: undefined })
                toast('키·토큰 삭제됨')
              }}
            >
              키 모두 지우기
            </Btn>
            {'Notification' in window && Notification.permission === 'default' && (
              <Btn className="col-span-2" onClick={() => Notification.requestPermission()}>
                🔔 발행 완료 알림 켜기
              </Btn>
            )}
          </div>
        </div>
      </Section>
    </div>
  )
}
