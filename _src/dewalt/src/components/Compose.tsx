import { useRef, useState } from 'react'
import type { Category } from '../../shared/types'
import { CATEGORY_LABEL } from '../../shared/types'
import { apiGenerate, runPublish } from '../lib/api'
import { hostMedia } from '../lib/hosting'
import { processFiles, videoWarnings, type MediaItem } from '../lib/media'
import { copyText, openInstagram, openThreads, shareMedia } from '../lib/share'
import { upsertHistory, type HistoryItem, type Settings } from '../lib/storage'
import { Btn, Section, Spinner, Toggle } from './ui'

export interface Draft {
  id: string
  category: Category
  media: MediaItem[]
  memo: string
  delivery: boolean
  visit: boolean
  igText: string
  thText: string
  generated: boolean
  igLink?: string
  thLink?: string
}

export const newDraft = (): Draft => ({
  id: Date.now().toString(36),
  category: 'repair',
  media: [],
  memo: '',
  delivery: true,
  visit: true,
  igText: '',
  thText: '',
  generated: false,
})

const CATS: { key: Category; icon: string; sub: string }[] = [
  { key: 'repair', icon: '🔧', sub: '고장 증상 · 수리 완료 인증' },
  { key: 'new', icon: '⚡', sub: '신규 공구 · 배터리 · 충전기' },
  { key: 'parts', icon: '⚙️', sub: '모터 · 스위치 · 날 · 비트' },
  { key: 'reels', icon: '🎬', sub: '작동 영상 · 현장 스케치' },
]

const MEMO_HINT: Record<Category, string> = {
  repair: '예) DCF850 임팩드라이버 기어박스 파손 수리 완료, 당일 출고 가능',
  new: '예) DCD805 브러시리스 해머드릴 신제품 입고, 5.0Ah 배터리 2개 세트',
  parts: '예) DCG405 그라인더 정품 스위치·카본브러시 재고 있음',
  reels: '예) 수리 끝난 DCF887 작동 테스트 영상, 토크 확인',
}

const QUICK: Record<Category, string[]> = {
  repair: ['당일 출고', '정품 부품 교체', '무상 점검', '배터리 진단', '택배 수리 완료'],
  new: ['재고 있음', '예약 가능', '세트 구성', '현장 추천'],
  parts: ['정품 부품', '재고 있음', '택배 발송', '모델 문의 환영'],
  reels: ['작동 테스트', '수리 전후', '현장 스케치'],
}

function footer(s: Settings, d: Draft): string {
  const lines: string[] = []
  if (d.delivery) lines.push(`📦 ${s.deliveryText || '택배 접수 · 전국 발송 가능'}`)
  if (d.visit) {
    lines.push(`📍 ${s.shopName || '디월트 광주서비스센터'}${s.address ? ` · ${s.address}` : ' · 광주광역시'}`)
    if (s.phone) lines.push(`☎ ${s.phone}`)
    if (s.hours) lines.push(`🕘 ${s.hours}`)
  }
  return lines.join('\n')
}

const len = (t: string) => Array.from(t).length

export default function Compose({
  s,
  draft,
  setDraft,
  toast,
  onHistory,
  goSettings,
}: {
  s: Settings
  draft: Draft
  setDraft: (u: (d: Draft) => Draft) => void
  toast: (m: string) => void
  onHistory: (h: HistoryItem[]) => void
  goSettings: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'' | 'media' | 'ai' | 'pub'>('')
  const [err, setErr] = useState('')
  const [log, setLog] = useState<string[]>([])
  const [targets, setTargets] = useState({ instagram: true, threads: true })
  const up = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }))

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy('media')
    setErr('')
    try {
      const items = await processFiles(files)
      setDraft((d) => ({ ...d, media: [...d.media, ...items].slice(0, 10) }))
      if (items.some((m) => m.type === 'video') && draft.category !== 'reels') up({ category: 'reels' })
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy('')
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const move = (i: number, dir: -1 | 1) =>
    setDraft((d) => {
      const m = [...d.media]
      const j = i + dir
      if (j < 0 || j >= m.length) return d
      ;[m[i], m[j]] = [m[j], m[i]]
      return { ...d, media: m }
    })

  const generate = async () => {
    if (!draft.memo.trim() && !draft.media.length) return setErr('사진이나 메모 중 하나는 넣어 주세요.')
    setBusy('ai')
    setErr('')
    try {
      const r = await apiGenerate(
        {
          provider: s.aiProvider,
          apiKey: s.aiKey.trim() || undefined,
          model: s.aiModel.trim() || undefined,
          category: draft.category,
          memo: draft.memo,
          includeDelivery: draft.delivery,
          includeVisit: draft.visit,
          shop: { name: s.shopName, address: s.address, phone: s.phone, hours: s.hours, deliveryText: s.deliveryText },
          baseHashtags: s.baseHashtags.split(/\s+/).filter(Boolean),
          images: draft.media.map((m) => m.vision).filter(Boolean).slice(0, 4),
          hasVideo: draft.media.some((m) => m.type === 'video'),
        },
        s,
      )
      const foot = footer(s, draft)
      const ig = [r.instagram, foot, r.hashtags.join(' ')].filter(Boolean).join('\n\n')
      let th = r.threads
      if (draft.delivery && !th.includes('택배')) {
        const add = '\n\n📦 택배 접수 · 전국 발송 OK'
        if (len(th + add) <= 500) th += add
      }
      up({ igText: ig, thText: th, generated: true, igLink: undefined, thLink: undefined })
      setLog([])
      setTimeout(() => document.getElementById('result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy('')
    }
  }

  const record = (status: HistoryItem['status'], links?: { ig?: string; th?: string }) => {
    const h = upsertHistory({
      id: draft.id,
      date: Date.now(),
      category: draft.category,
      memo: draft.memo,
      thumb: draft.media[0]?.thumb,
      mediaCount: draft.media.length,
      instagram: draft.igText,
      threads: draft.thText,
      igLink: links?.ig ?? draft.igLink,
      thLink: links?.th ?? draft.thLink,
      status,
    })
    onHistory(h)
  }

  const publish = async () => {
    if (!targets.instagram && !targets.threads) return
    if (targets.instagram && !draft.media.length) return setErr('인스타그램은 사진이나 영상이 꼭 있어야 해요. (스레드만 체크하면 글만 올라가요)')
    if (len(draft.thText) > 500) return setErr('스레드 글이 500자를 넘어요. 조금 줄여 주세요.')
    if (!confirm(`${[targets.instagram && '인스타그램', targets.threads && '스레드'].filter(Boolean).join(' + ')}에 지금 바로 올릴까요?`)) return
    setBusy('pub')
    setErr('')
    const lines: string[] = []
    const push = (m: string) => {
      lines.push(m)
      setLog([...lines])
    }
    try {
      let media = draft.media
      if (media.length) {
        media = await hostMedia(media, s, push)
        up({ media })
      }
      const res = await runPublish(
        s,
        targets,
        media.map((m) => ({ type: m.type, url: m.url! })),
        { instagram: draft.igText, threads: draft.thText },
        push,
      )
      const okIg = res.instagram?.ok
      const okTh = res.threads?.ok
      up({ igLink: res.instagram?.link ?? draft.igLink, thLink: res.threads?.link ?? draft.thLink })
      const allOk = (!targets.instagram || okIg) && (!targets.threads || okTh)
      if (okIg || okTh) record(allOk ? 'published' : 'partial', { ig: res.instagram?.link, th: res.threads?.link })
      toast(allOk ? '🎉 발행 완료!' : okIg || okTh ? '일부만 발행됐어요' : '발행 실패 — 아래 수동 버튼을 써 주세요')
      if (allOk && 'Notification' in window && Notification.permission === 'granted') new Notification('발행 완료', { body: '인스타·스레드에 게시물이 올라갔어요.' })
    } catch (e) {
      setErr((e as Error).message)
      push('❌ ' + (e as Error).message)
    } finally {
      setBusy('')
    }
  }

  const copy = async (which: 'ig' | 'th') => {
    const ok = await copyText(which === 'ig' ? draft.igText : draft.thText)
    toast(ok ? (which === 'ig' ? '인스타 글 복사됨' : '스레드 글 복사됨') : '복사 실패')
    if (ok && !draft.igLink && !draft.thLink) record('manual')
  }

  const share = async () => {
    if (!draft.media.length) return toast('공유할 사진이 없어요')
    void copyText(draft.igText) // 아이폰은 터치 직후에만 공유창이 열려서 기다리지 않고 바로 공유
    const r = await shareMedia(draft.media)
    if (r === 'unsupported') toast('이 브라우저는 사진 공유를 지원하지 않아요')
    else if (r === 'shared') toast('글은 복사돼 있어요 — 인스타에서 붙여넣기')
  }

  const apiReady = !!(s.igUserId || s.threadsUserId)

  return (
    <div className="space-y-4">
      {/* ① 카테고리 */}
      <Section title="① 무엇을 올릴까요?">
        <div className="grid grid-cols-2 gap-2.5">
          {CATS.map((c) => {
            const on = draft.category === c.key
            return (
              <button
                key={c.key}
                onClick={() => up({ category: c.key })}
                className={`relative overflow-hidden rounded-xl border p-3 text-left transition ${on ? 'border-dw bg-dw text-ink' : 'border-iron bg-coal'}`}
              >
                <span className="text-2xl">{c.icon}</span>
                <span className={`mt-1 block font-head text-[16px] leading-tight ${on ? '' : 'text-bone'}`}>{CATEGORY_LABEL[c.key]}</span>
                <span className={`mt-0.5 block text-[11px] leading-snug ${on ? 'text-ink/70' : 'text-ash'}`}>{c.sub}</span>
              </button>
            )
          })}
        </div>
      </Section>

      {/* ② 미디어 */}
      <Section title="② 사진 · 영상" right={<span className="text-xs text-ash">{draft.media.length}/10</span>}>
        <input ref={fileRef} type="file" accept="image/*,video/mp4,video/quicktime,.mov" multiple hidden onChange={(e) => addFiles(e.target.files)} />
        {draft.media.length > 0 && (
          <div className="no-scrollbar -mx-1 mb-3 flex gap-2.5 overflow-x-auto px-1 pb-1">
            {draft.media.map((m, i) => (
              <div key={m.id} className="relative h-32 w-[104px] shrink-0 overflow-hidden rounded-xl border border-iron bg-ink">
                {m.preview ? <img src={m.preview} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-3xl">🎬</div>}
                <span className="absolute left-1.5 top-1.5 rounded-md bg-ink/80 px-1.5 text-[11px] font-bold text-dw">
                  {i + 1}
                  {m.type === 'video' && ` ▶ ${Math.round(m.duration ?? 0)}초`}
                </span>
                <button onClick={() => up({ media: draft.media.filter((x) => x.id !== m.id) })} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink/85 text-sm">
                  ✕
                </button>
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-ink/90 to-transparent px-1 pb-1 pt-4 text-[11px]">
                  <button onClick={() => move(i, -1)} className="px-1.5 py-0.5">◀</button>
                  <span className="text-ash">{m.sizeMB.toFixed(1)}MB</span>
                  <button onClick={() => move(i, 1)} className="px-1.5 py-0.5">▶</button>
                </div>
                {videoWarnings(m).length > 0 && <div className="absolute inset-x-0 bottom-6 bg-red-600/90 px-1 text-[10px] leading-tight">{videoWarnings(m)[0]}</div>}
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy === 'media'}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-dw/50 bg-dw/5 py-5 text-[15px] font-semibold text-dw"
        >
          {busy === 'media' ? '사진 압축 중…' : draft.media.length ? '＋ 더 추가' : '📷 갤러리에서 사진 · 영상 선택'}
        </button>
        <p className="mt-2 text-[11px] leading-relaxed text-ash">사진은 자동으로 줄이고(1440px), 인스타 비율(4:5~1.91:1)에 맞게 여백을 넣어요. 첫 번째 사진이 대표 사진이에요.</p>
      </Section>

      {/* ③ 메모 + 옵션 */}
      <Section title="③ 현장 메모">
        <textarea
          value={draft.memo}
          onChange={(e) => up({ memo: e.target.value })}
          rows={3}
          placeholder={MEMO_HINT[draft.category]}
          className="w-full resize-none rounded-xl border border-iron bg-ink px-3 py-3 text-[15px] leading-relaxed outline-none focus:border-dw"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK[draft.category].map((q) => (
            <button key={q} onClick={() => up({ memo: (draft.memo.trim() ? draft.memo.trim() + ', ' : '') + q })} className="rounded-full border border-iron bg-coal px-3 py-1.5 text-[12px] text-bone/90">
              + {q}
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          <Toggle on={draft.delivery} onChange={(v) => up({ delivery: v })} label="택배 접수 · 전국 발송 가능" sub={s.deliveryText} />
          <Toggle on={draft.visit} onChange={(v) => up({ visit: v })} label="방문 수리 · 매장 위치 안내" sub={s.address || '광주광역시 (설정에서 주소 입력)'} />
        </div>
      </Section>

      {err && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-[14px] leading-relaxed text-red-200">{err}</div>}

      <button
        onClick={generate}
        disabled={!!busy}
        className="relative w-full overflow-hidden rounded-2xl bg-dw py-4 font-head text-[20px] text-ink shadow-[0_8px_24px_rgba(254,189,23,0.25)] active:bg-dw-deep disabled:opacity-60"
      >
        {busy === 'ai' ? (
          <>
            <Spinner /> AI가 사진 보고 쓰는 중…
          </>
        ) : draft.generated ? (
          '🔄 AI 글 다시 만들기'
        ) : (
          '✍️ AI 글 만들기'
        )}
      </button>

      {/* 결과 */}
      {draft.generated && (
        <div id="result" className="space-y-4 scroll-mt-4">
          <Section title="📸 인스타그램" right={<span className={`text-xs ${len(draft.igText) > 2200 ? 'text-red-400' : 'text-ash'}`}>{len(draft.igText)}/2200 · 태그 {(draft.igText.match(/#[^\s#]+/g) || []).length}/30</span>}>
            <textarea value={draft.igText} onChange={(e) => up({ igText: e.target.value })} rows={14} className="w-full rounded-xl border border-iron bg-ink px-3 py-3 text-[14px] leading-relaxed outline-none focus:border-dw" />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Btn onClick={() => copy('ig')}>📋 인스타 글 복사</Btn>
              <Btn onClick={openInstagram}>📱 인스타 앱 열기</Btn>
              <Btn onClick={share} className="col-span-2">🖼 사진 저장·공유 (글 자동 복사)</Btn>
            </div>
          </Section>

          <Section title="🧵 스레드" right={<span className={`text-xs ${len(draft.thText) > 500 ? 'font-bold text-red-400' : 'text-ash'}`}>{len(draft.thText)}/500</span>}>
            <textarea value={draft.thText} onChange={(e) => up({ thText: e.target.value })} rows={9} className="w-full rounded-xl border border-iron bg-ink px-3 py-3 text-[14px] leading-relaxed outline-none focus:border-dw" />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Btn onClick={() => copy('th')}>📋 스레드 글 복사</Btn>
              <Btn onClick={() => openThreads(draft.thText)}>📱 스레드 앱 열기</Btn>
            </div>
            <p className="mt-2 text-[11px] text-ash">‘스레드 앱 열기’는 글이 채워진 작성 화면으로 열려요. 사진은 직접 붙여 주세요.</p>
          </Section>

          {/* 자동 발행 */}
          <section className="overflow-hidden rounded-2xl border-2 border-dw bg-coal">
            <div className="hazard h-2.5" />
            <div className="p-4">
              <h2 className="font-head text-[18px] text-dw">🚀 원클릭 자동 발행</h2>
              {!apiReady ? (
                <div className="mt-2 text-[14px] leading-relaxed text-bone/85">
                  아직 API 연결 전이에요. 위의 <b className="text-dw">복사·앱 열기</b> 버튼으로 바로 올릴 수 있고, 자동 발행은
                  <button onClick={goSettings} className="mx-1 font-bold text-dw underline">설정</button>에서 연결하면 켜져요.
                </div>
              ) : (
                <>
                  <div className="mt-3 flex gap-2">
                    {(['instagram', 'threads'] as const).map((k) => (
                      <button
                        key={k}
                        onClick={() => setTargets((t) => ({ ...t, [k]: !t[k] }))}
                        className={`flex-1 rounded-xl border py-2.5 text-[14px] font-semibold ${targets[k] ? 'border-dw bg-dw/15 text-dw' : 'border-iron text-ash'}`}
                      >
                        {targets[k] ? '☑' : '☐'} {k === 'instagram' ? '인스타그램' : '스레드'}
                      </button>
                    ))}
                  </div>
                  <button onClick={publish} disabled={!!busy} className="mt-3 w-full rounded-xl bg-dw py-4 font-head text-[19px] text-ink active:bg-dw-deep disabled:opacity-60">
                    {busy === 'pub' ? (
                      <>
                        <Spinner /> 올리는 중… 화면을 끄지 마세요
                      </>
                    ) : (
                      '인스타 + 스레드 동시 발행'
                    )}
                  </button>
                </>
              )}
              {log.length > 0 && (
                <ol className="mt-3 space-y-1 rounded-xl bg-ink p-3 font-mono text-[12px] leading-relaxed text-bone/80">
                  {log.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ol>
              )}
              {(draft.igLink || draft.thLink) && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {draft.igLink && <a href={draft.igLink} target="_blank" rel="noreferrer" className="rounded-xl bg-dw/15 py-3 text-center text-[14px] font-bold text-dw">인스타 게시물 보기</a>}
                  {draft.thLink && <a href={draft.thLink} target="_blank" rel="noreferrer" className="rounded-xl bg-dw/15 py-3 text-center text-[14px] font-bold text-dw">스레드 글 보기</a>}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
