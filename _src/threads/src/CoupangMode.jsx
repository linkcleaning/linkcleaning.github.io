import { useEffect, useState } from 'react'
import { CP_TONES, generateCoupang, buildComment, threadsIntentUrl, findProduct, isPartnersLink, PARTNERS_LINK_PAGE } from './coupang.js'

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
  const [product, setProduct] = useState(() => load('td_cp_product', null))
  // 이미 올린(또는 만든) 상품 — 같은 상품 반복 방지. 11/12 첫 쿠팡 글: 결로방지 테이프
  const [used, setUsed] = useState(() => load('td_cp_used', ['결로방지 테이프']))
  const [stage, setStage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(0) // 0: 아직, 1: 스레드 열었음

  useEffect(() => save('td_cp_ref', reference), [reference])
  useEffect(() => save('td_cp_link', link), [link])
  useEffect(() => save('td_cp_tone', tone), [tone])
  useEffect(() => save('td_cp_ad', adTag), [adTag])
  useEffect(() => save('td_cp_last', result), [result])
  useEffect(() => save('td_cp_recent', recent), [recent])
  useEffect(() => save('td_cp_product', product), [product])
  useEffect(() => save('td_cp_used', used), [used])
  // 파트너스 링크를 나중에 붙여넣어도 첫 댓글에 바로 반영
  useEffect(() => {
    setResult(r => (r && r.link !== link.trim()) ? { ...r, link: link.trim(), comment: buildComment(r.summary, link) } : r)
  }, [link])

  async function paste(set) {
    try { const t = await navigator.clipboard.readText(); if (t) set(t.trim()) } catch { setError('붙여넣기가 막혔어요 — 칸을 길게 눌러 붙여넣어 주세요') }
  }

  // 상품 칸이 비어 있으면 AI가 웹검색으로 오늘 상품을 찾고 → 바로 글까지 작성
  async function generate(fresh = false) {
    setError('')
    if (!apiKey) return needKey()
    const l = link.trim()
    if (l && !/^https?:\/\//.test(l)) return setError('링크는 https:// 로 시작하는 주소를 붙여넣어 주세요')
    if (l && !/coupang\.com|coupa\.ng/.test(l) && !confirm('쿠팡 링크가 아닌 것 같아요. 그래도 만들까요?')) return
    setBusy(true)
    try {
      let ref = fresh ? '' : reference.trim()
      let prod = fresh ? null : product
      if (!ref) {
        setStage('AI가 오늘 뜨는 살림템 찾는 중…')
        const avoid = [...new Set([...used, ...recent.map(r => r.ref)])].filter(Boolean).slice(0, 15)
        prod = await findProduct({ apiKey, avoid })
        ref = prod.reference
        setProduct(prod); setReference(ref)
        if (fresh) setLink('')
      }
      setStage('스레드 글 쓰는 중…')
      const useLink = fresh ? '' : l
      const out = await generateCoupang({ apiKey, reference: ref, link: useLink, toneKey: tone, adTag })
      const r = { ...out, link: useLink, tone, ref: (prod?.name || ref).slice(0, 40), id: Date.now() }
      setResult(r); setStep(0)
      setRecent(h => [r, ...h.filter(x => x.ref !== r.ref)].slice(0, 10))
      if (prod?.name) setUsed(u => [prod.name, ...u.filter(x => x !== prod.name)].slice(0, 30))
      setTimeout(() => document.getElementById(prod && !isPartnersLink(useLink) ? 'cp-product' : 'cp-result')?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (e) { setError(e.message) } finally { setBusy(false); setStage('') }
  }

  // 상품 주소를 복사해 두고 → 쿠팡파트너스 링크 생성 화면 열기
  function openPartners() {
    copy(product.url, '상품 주소 복사 완료! 파트너스에서 붙여넣고 링크 생성')
    window.open(PARTNERS_LINK_PAGE, '_blank')
  }

  const edit = (k, v) => setResult(r => {
    const n = { ...r, [k]: v }
    if (k === 'summary') n.comment = buildComment(v, r.link)
    return n
  })

  // 첫 댓글을 미리 복사해 두고 → 본문이 채워진 스레드 글쓰기 창 열기
  async function openThreads() {
    if (!isPartnersLink(result.link) && !confirm('아직 내 파트너스 링크가 없어요. 이대로 올리면 수수료가 안 붙어요.\n그래도 열까요?')) return
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
        <p className="mt-1 font-num text-[22px] leading-tight">버튼 한 번에 상품 찾기 + 글</p>
        <p className="mt-1 break-keep text-[13px] text-white/85">상품 칸을 비워 두면 AI가 오늘 뜨는 살림템을 찾아 본문·첫 댓글까지 써요. 링크와 공정위 문구는 첫 댓글에.</p>
      </div>

      {/* AI가 고른 상품 */}
      {product && !busy && (
        <section id="cp-product" className="mt-4 rounded-[22px] bg-card p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-muted"><span className="dot bg-accent" />오늘의 상품 (AI 추천)</p>
          <p className="mt-1 break-keep text-[17px] font-bold leading-snug text-deep">{product.name}</p>
          {product.why && <p className="mt-1 break-keep text-[13.5px] text-ink">{product.why}</p>}
          <p className="mt-2 flex flex-wrap gap-1.5 text-[12px]">
            {product.price && <span className="rounded-full bg-tint px-2.5 py-0.5 font-semibold text-deep">{product.price}</span>}
            {product.rating && <span className="rounded-full bg-tint px-2.5 py-0.5 font-semibold text-deep">★ {product.rating}</span>}
            {product.reviews && <span className="rounded-full bg-tint px-2.5 py-0.5 font-semibold text-deep">리뷰 {product.reviews}</span>}
          </p>
          <p className="mt-2 break-all text-[12.5px] text-brand">{product.url}</p>
          <p className="mt-1 text-[11.5px] leading-snug text-muted">
            {product.isProductPage ? (product.verified ? '검색에서 찾은 쿠팡 상품 페이지예요.' : '상품 페이지 주소가 맞는지 열어서 확인해 주세요.') : '정확한 상품 페이지를 못 찾아 쿠팡 검색으로 연결돼요.'} 평점 4.5↑ · 리뷰 · 무료배송은 쿠팡에서 꼭 확인!
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a href={product.url} target="_blank" rel="noopener" className="rounded-full bg-tint py-3 text-center text-[14px] font-bold text-deep">① 쿠팡에서 확인</a>
            <button onClick={openPartners} className="rounded-full bg-deep py-3 text-[14px] font-bold text-white">② 파트너스 링크 만들기</button>
          </div>
          <p className="mt-2 text-[11.5px] text-muted">②를 누르면 상품 주소가 복사돼요 → 파트너스에서 붙여넣고 링크 생성 → 아래 '내 쿠팡파트너스 링크'에 붙여넣기 (댓글에 자동 반영)</p>
          <button onClick={() => generate(true)} className="mt-2 w-full rounded-full border border-line py-2.5 text-[13px] font-semibold text-deep">다른 상품 찾기</button>
        </section>
      )}

      <Title right={<span className="flex gap-1.5">{reference && <Mini onClick={() => { setReference(''); setProduct(null) }}>비우기</Mini>}<Mini onClick={() => paste(setReference)}>붙여넣기</Mini></span>}>상품명 · 참고 내용 <span className="font-normal text-muted">(비우면 AI가 찾아요)</span></Title>
      <div className="rounded-[14px] bg-card p-1">
        <textarea value={reference} onChange={e => setReference(e.target.value)} rows={4}
          placeholder={'비워 두면 AI가 오늘 뜨는 살림템을 찾아요\n\n직접 정할 땐 예) 욕실 곰팡이 젤 / 바르고 6시간 뒤 닦기만 하면 끝'}
          className="block w-full resize-none rounded-[12px] bg-transparent px-3 py-2.5 text-base leading-relaxed outline-none placeholder:text-muted/60" />
      </div>

      <Title right={<Mini onClick={() => paste(setLink)}>붙여넣기</Mini>}>내 쿠팡파트너스 링크 <span className="font-normal text-muted">(나중에 넣어도 돼요)</span></Title>
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
            <p className={`mt-2 break-all text-[14px] ${isPartnersLink(result.link) ? 'text-brand' : 'font-semibold text-danger'}`}>👉 {result.link || '(여기에 파트너스 링크 붙여넣기)'}</p>
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
                <button onClick={() => { setResult(r); setLink(r.link || ''); setStep(0) }} className="flex w-full items-center gap-2 rounded-[14px] bg-card px-4 py-2.5 text-left">
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
          <button onClick={() => generate()} disabled={busy}
            className={`${result && !busy ? 'w-[38%]' : 'w-full'} rounded-full bg-accent py-4 font-num text-[18px] text-ink transition active:scale-[.98] disabled:opacity-90`}>
            {busy ? <span className="font-body text-base font-semibold">{stage || 'AI가 글 쓰는 중…'}</span> : result ? '다시 생성' : reference.trim() ? '쿠팡 글 만들기' : 'AI가 찾아서 쿠팡 글 만들기'}
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
