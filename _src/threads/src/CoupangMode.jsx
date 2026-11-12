import { useEffect, useState } from 'react'
import { CP_TONES, generateCoupang, buildComment, threadsIntentUrl } from './coupang.js'

const MAX_CHARS = 500
const load = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v) } catch { return d } }
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
const len = s => [...(s || '')].length
const withTag = (body, tag) => body + (tag ? `\n\n#${tag}` : '')

export default function CoupangMode({ apiKey, needKey, copy, handle }) {
  const [reference, setReference] = useState(() => load('td_cp_ref', ''))
  const [link, setLink] = useState(() => load('td_cp_link', ''))
  const [tone, setTone] = useState(() => load('td_cp_tone', 'friend'))
  const [adTag, setAdTag] = useState(() => load('td_cp_ad', true))
  const [result, setResult] = useState(() => load('td_cp_last', null))
  const [recent, setRecent] = useState(() => load('td_cp_recent', []))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(0) // 0: 아직, 1: 스레드 열었음

  useEffect(() => save('td_cp_ref', reference), [reference])
  useEffect(() => save('td_cp_link', link), [link])
  useEffect(() => save('td_cp_tone', tone), [tone])
  useEffect(() => save('td_cp_ad', adTag), [adTag])
  useEffect(() => save('td_cp_last', result), [result])
  useEffect(() => save('td_cp_recent', recent), [recent])

  async function paste(set) {
    try { const t = await navigator.clipboard.readText(); if (t) set(t.trim()) } catch { setError('붙여넣기가 막혔어요 — 칸을 길게 눌러 붙여넣어 주세요') }
  }

  async function generate() {
    setError('')
    if (!apiKey) return needKey()
    if (!reference.trim()) return setError('상품명이나 참고 내용을 적어 주세요')
    if (!/^https?:\/\//.test(link.trim())) return setError('쿠팡파트너스 링크(https://link.coupang.com/...)를 붙여넣어 주세요')
    if (!/coupang\.com|coupa\.ng/.test(link) && !confirm('쿠팡 링크가 아닌 것 같아요. 그래도 만들까요?')) return
    setBusy(true)
    try {
      const out = await generateCoupang({ apiKey, reference: reference.trim(), link: link.trim(), toneKey: tone, adTag })
      const r = { ...out, link: link.trim(), tone, ref: reference.trim().slice(0, 40), id: Date.now() }
      setResult(r); setStep(0)
      setRecent(h => [r, ...h.filter(x => x.link !== r.link || x.ref !== r.ref)].slice(0, 10))
      setTimeout(() => document.getElementById('cp-result')?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const edit = (k, v) => setResult(r => {
    const n = { ...r, [k]: v }
    if (k === 'summary') n.comment = buildComment(v, r.link)
    return n
  })

  // 첫 댓글을 미리 복사해 두고 → 본문이 채워진 스레드 글쓰기 창 열기
  async function openThreads() {
    try { await navigator.clipboard.writeText(result.comment) } catch {}
    setStep(1)
    window.open(threadsIntentUrl(withTag(result.body, result.tag)), '_blank')
  }

  const fullBody = result ? withTag(result.body, result.tag) : ''

  return (
    <>
      {/* 입력 */}
      <div className="mt-4 rounded-[22px] bg-brand p-4 text-white">
        <p className="text-xs font-semibold text-white/85">쿠팡파트너스 글</p>
        <p className="mt-1 font-num text-[22px] leading-tight">링크 하나로 본문 + 첫 댓글</p>
        <p className="mt-1 break-keep text-[13px] text-white/85">본문엔 링크 없이 궁금하게, 링크와 공정위 문구는 첫 댓글에 넣어요.</p>
      </div>

      <Title right={<Mini onClick={() => paste(setReference)}>붙여넣기</Mini>}>상품명 · 참고할 인기 글</Title>
      <div className="rounded-[14px] bg-card p-1">
        <textarea value={reference} onChange={e => setReference(e.target.value)} rows={4}
          placeholder={'예) 욕실 곰팡이 젤 / 바르고 6시간 뒤 닦기만 하면 끝, 냄새 적음\n\n스레드에서 반응 좋은 글을 길게 눌러 복사해 와도 돼요'}
          className="block w-full resize-none rounded-[12px] bg-transparent px-3 py-2.5 text-base leading-relaxed outline-none placeholder:text-muted/60" />
      </div>

      <Title right={<Mini onClick={() => paste(setLink)}>붙여넣기</Mini>}>내 쿠팡파트너스 링크</Title>
      <input value={link} onChange={e => setLink(e.target.value.trim())} inputMode="url" autoCapitalize="off" autoCorrect="off"
        placeholder="https://link.coupang.com/a/..." className="input" />

      <Title>말투</Title>
      <div className="grid gap-2">
        {Object.entries(CP_TONES).map(([k, t]) => (
          <button key={k} onClick={() => setTone(k)}
            className={`flex items-center gap-3 rounded-[14px] border-2 px-4 py-3 text-left ${tone === k ? 'border-accent bg-accent-soft' : 'border-transparent bg-card'}`}>
            <span className="text-xl">{t.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold text-deep">{t.label}</span>
              <span className="block text-xs text-muted">{t.short}</span>
            </span>
            <span className={`dot ${tone === k ? 'bg-accent' : 'bg-line'}`} />
          </button>
        ))}
      </div>
      <label className="mt-2 flex items-center justify-between rounded-[14px] bg-card px-4 py-3">
        <span className="text-sm font-semibold text-deep">본문 첫머리에 (광고) 표시
          <span className="block text-xs font-normal text-muted">공정위 권장 · 끄면 댓글에만 표시돼요</span>
        </span>
        <input type="checkbox" checked={adTag} onChange={e => setAdTag(e.target.checked)} className="h-6 w-6 accent-[#0E5A60]" />
      </label>

      {error && <p className="mt-4 flex gap-2 rounded-[14px] bg-card p-4 text-sm font-semibold text-danger"><span className="dot mt-1.5 bg-danger" />{error}</p>}

      {/* 결과 */}
      {result && !busy && (
        <section id="cp-result" className="mt-6">
          <div className="flex items-end justify-between px-1 pb-2">
            <div>
              <p className="text-xs font-semibold text-muted">① 스레드 본문 <span className="font-normal">(눌러서 고칠 수 있어요)</span></p>
              <p className="font-num text-[18px] text-deep">{CP_TONES[result.tone]?.emoji} {CP_TONES[result.tone]?.label}</p>
            </div>
            <span className={`font-num text-[17px] ${len(fullBody) > MAX_CHARS ? 'text-danger' : 'text-ink'}`}>{len(fullBody)}<span className="font-body text-xs font-medium text-muted"> / {MAX_CHARS}자</span></span>
          </div>

          <article className="rounded-[22px] bg-card p-4">
            <div className="flex gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-deep font-num text-sm text-white">{handle.slice(0, 1).toUpperCase()}<span className="text-[#6CC456]">.</span></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{handle} <span className="font-normal text-muted">· 방금</span></p>
                <textarea value={result.body} onChange={e => edit('body', e.target.value)} rows={Math.max(4, result.body.split('\n').length + 1)}
                  className="mt-1 block w-full resize-none bg-transparent text-[15.5px] leading-[1.7] outline-none" />
                {result.tag && <p className="mt-2 flex items-center gap-2"><span className="rounded-full bg-tint px-3 py-1 text-[13px] font-bold text-deep">#{result.tag}</span><span className="text-[11.5px] text-muted">황금 해시태그 · 본문에 포함</span></p>}
              </div>
            </div>
          </article>

          <div className="mt-2 rounded-[14px] bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-xs font-semibold text-muted"><span className="dot bg-accent" />② 첫 댓글 (스레드에 추가)</p>
              <button onClick={() => copy(result.comment, '댓글 복사 완료! 두 번째 칸에 붙여넣기')} className="rounded-full bg-accent px-3.5 py-1 text-xs font-bold text-ink">댓글 복사</button>
            </div>
            <input value={result.summary} onChange={e => edit('summary', e.target.value)} className="mt-2 w-full bg-transparent text-[15px] font-semibold outline-none" />
            <p className="mt-2 break-all text-[14px] text-brand">👉 {result.link}</p>
            <p className="mt-2 text-[12.5px] leading-snug text-muted">{'이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.'}</p>
          </div>

          {/* 올리는 순서 */}
          <div className="mt-2 rounded-[14px] bg-deep p-4 text-white">
            <p className="text-xs font-semibold text-white/75">올리는 순서</p>
            <ol className="mt-1.5 space-y-1 text-[14px] leading-relaxed">
              <li className={step >= 1 ? 'text-white/50 line-through' : ''}>1. 아래 <b>스레드에서 열기</b> → 본문이 채워져요 (댓글은 자동 복사)</li>
              <li>2. 글쓰기 창의 <b>스레드에 추가</b> 누르고 → <b>붙여넣기</b></li>
              <li>3. 확인하고 <b>게시</b></li>
            </ol>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={() => copy(fullBody, '본문 복사 완료')} className="rounded-full bg-card py-3.5 text-[15px] font-bold text-deep active:scale-[.98]">본문 복사</button>
            <button onClick={() => copy(result.comment, '댓글 복사 완료')} className="rounded-full bg-card py-3.5 text-[15px] font-bold text-deep active:scale-[.98]">댓글 복사</button>
          </div>
          <p className="mt-2 px-1 text-xs text-muted">스레드 앱이 안 열리거나 본문이 비어 있으면, 복사 버튼으로 붙여넣어 주세요.</p>
        </section>
      )}

      {/* 최근 쿠팡 글 */}
      {recent.length > 1 && !busy && (
        <>
          <Title>최근 쿠팡 글</Title>
          <ul className="space-y-1.5">
            {recent.slice(0, 5).map(r => (
              <li key={r.id}>
                <button onClick={() => { setResult(r); setLink(r.link); setStep(0) }} className="flex w-full items-center gap-2 rounded-[14px] bg-card px-4 py-2.5 text-left">
                  <span className="dot bg-accent" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{r.summary || r.ref}</span>
                  <span className="shrink-0 text-xs text-muted">{new Date(r.id).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* 하단 고정 버튼 */}
      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-paper via-paper/95 to-transparent px-3 pb-[max(env(safe-area-inset-bottom),14px)] pt-6">
        <div className="mx-auto flex max-w-md gap-2">
          {result && !busy && (
            <button onClick={openThreads} className="flex-1 rounded-full bg-deep py-4 font-num text-[18px] text-white active:scale-[.98]">스레드에서 열기</button>
          )}
          <button onClick={generate} disabled={busy}
            className={`${result && !busy ? 'w-[38%]' : 'w-full'} rounded-full bg-accent py-4 font-num text-[18px] text-ink transition active:scale-[.98] disabled:opacity-90`}>
            {busy ? <span className="font-body text-base font-semibold">AI가 글 쓰는 중…</span> : result ? '다시 생성' : '쿠팡 글 만들기'}
          </button>
        </div>
      </div>
    </>
  )
}

function Title({ children, right }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between px-1">
      <h2 className="text-[14px] font-bold text-deep">{children}</h2>
      {right}
    </div>
  )
}

function Mini({ children, onClick }) {
  return <button onClick={onClick} className="rounded-full bg-tint px-3 py-1 text-xs font-semibold text-deep active:scale-95">{children}</button>
}
