import { useEffect, useState } from 'react'
import {
  THEMES, DEFAULT_APPS, todayKey, todayLabel, computeRules,
  performanceSummary, fullText, generatePost,
} from './lib.js'

// v17 — 링크 앱 스타일 가이드(카드로 꽉 채우기·큰 숫자·상태 점) 적용
const DEFAULT_PROFILE = `제주에 사는 사장님 (스레드는 회사 계정이 아니라 개인 계정)
- 직업: 제주에서 청소 일 12년째, 2016년에 청소 회사 '링크클린' 창업 (제주시·서귀포)
- 별장·세컨하우스 관리, 고소작업·외벽청소도 함
- 부산 광안리에서 케이크 가게도 운영
- 개발자가 아닌데 AI로 앱을 직접 만들어 씀: 내 일정·장부 정리 같은 뒷일용 앱, 게임·운세·공중화장실 지도 같은 공개 앱 (고객 연락은 직접 챙김)
- 아이폰 사용`
const MAX_CHARS = 500
const PROFILE_VER = 3
const DAILY_GOAL = 2 // 아침·저녁 하루 2번

const load = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v) } catch { return d } }
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
const charCount = s => [...(s || '')].length
const postText = p => fullText(p) + (p.topic_tag ? `\n\n#${p.topic_tag.replace(/^#/, '')}` : '')

const STAGE_MSG = {
  research: ['오늘 제주 날씨 찾는 중…', '제주 뉴스 살펴보는 중…', '오늘 화제 모으는 중…', '반응 좋을 소재 고르는 중…'],
  write: ['초안 3개 쓰는 중…', '채점표로 점수 매기는 중…', '1등 초안 고르는 중…'],
  edit: ['편집장이 검수하는 중…', '첫 줄 더 날카롭게…', '질문 다듬는 중…'],
}

export default function App() {
  const [apiKey, setApiKey] = useState(() => load('td_key', ''))
  const [profile, setProfile] = useState(() => load('td_profile_ver', 1) < PROFILE_VER ? (save('td_profile_ver', PROFILE_VER), DEFAULT_PROFILE) : load('td_profile', DEFAULT_PROFILE))
  const [apps, setApps] = useState(() => load('td_apps', DEFAULT_APPS))
  const [handle, setHandle] = useState(() => load('td_handle', 'linkclean_jeju'))
  const [useSearch, setUseSearch] = useState(() => load('td_search', true))
  const [history, setHistory] = useState(() => load('td_history', []))
  const length = 'short' // 길이는 '짧게'(80~180자) 하나로 고정
  const [note, setNote] = useState('')
  const [post, setPost] = useState(() => load('td_history', [])[0]?.post || null)
  const [busy, setBusy] = useState(false)
  const [tick, setTick] = useState(0)
  const [stage, setStage] = useState('write')
  const [raw, setRaw] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [sheet, setSheet] = useState(null)

  const posted = history.filter(h => h.posted)
  const { label: dateLabel } = todayLabel()
  const rules = computeRules(posted)

  useEffect(() => save('td_key', apiKey), [apiKey])
  useEffect(() => save('td_profile', profile), [profile])
  useEffect(() => save('td_handle', handle), [handle])
  useEffect(() => save('td_search', useSearch), [useSearch])
  useEffect(() => save('td_apps', apps), [apps])
  useEffect(() => save('td_history', history), [history])
  useEffect(() => {
    if (!busy) return
    const t = setInterval(() => setTick(x => x + 1), 2500)
    return () => clearInterval(t)
  }, [busy])

  const flash = m => { setToast(m); setTimeout(() => setToast(''), 1600) }

  async function generate() {
    if (!apiKey) { setSheet('settings'); flash('먼저 Claude API 키를 넣어 주세요'); return }
    // 누를 때마다 3가지 테마 중 하나를 랜덤으로 (바로 전 글과 같은 테마는 피함)
    const ids = Object.keys(THEMES)
    const pool = ids.filter(id => id !== (post?.tone || history[0]?.post?.tone))
    const theme = pool[Math.floor(Math.random() * pool.length)] || ids[0]
    setBusy(true); setError(''); setRaw(''); setTick(0)
    try {
      const out = await generatePost({
        apiKey, toneId: theme, profile, fieldNote: note, useSearch,
        onStage: s => { setStage(s); setTick(0) },
        recentHooks: posted.slice(0, 7).map(h => h.post.title || h.post.hook),
        rules, length, performance: performanceSummary(posted), publicApps: apps,
      })
      const id = Date.now()
      const p = { ...out, hid: id, tone: theme, title_all: [out.title, ...(out.title_options || [])], hook_all: [out.hook, ...(out.hook_options || [])] }
      setPost(p)
      setHistory(h => [{ id, day: todayKey(), date: dateLabel, post: p, posted: false }, ...h].slice(0, 30))
      setTimeout(() => document.getElementById('result')?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (e) {
      setError(e.message); setRaw(e.raw || '')
    } finally {
      setBusy(false)
    }
  }

  function markPosted(p, val) {
    setHistory(h => {
      if (!p.hid || !h.some(x => x.id === p.hid)) {
        if (!val) return h
        const id = p.hid || Date.now()
        return [{ id, day: todayKey(), date: dateLabel, post: { ...p, hid: id }, posted: true }, ...h].slice(0, 30)
      }
      return h.map(x => x.id === p.hid ? { ...x, posted: val, post: val ? { ...p } : x.post } : x)
    })
  }
  const removeItem = id => { if (confirm('이 글을 기록에서 지울까요?')) setHistory(h => h.filter(x => x.id !== id)) }
  const setStat = (id, k, v) => setHistory(h => h.map(x => x.id === id ? { ...x, stats: { ...x.stats, [k]: v } } : x))
  function reset() {
    setPost(null); setNote(''); setError(''); setRaw('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    flash('초기화했어요. 새 글을 만들어 보세요')
  }
    async function copy(text, msg) {
    try { await navigator.clipboard.writeText(text); flash(msg) } catch { flash('복사가 막혔어요 — 글을 길게 눌러 복사해 주세요') }
  }

  // 홈 화면 숫자
  const today = todayKey()
  const postedToday = posted.filter(h => h.day === today).length
  const withStats = posted.filter(h => h.stats && Number(h.stats.views) > 0)
  const avgReplies = withStats.length ? Math.round(withStats.reduce((s, h) => s + (Number(h.stats.replies) || 0), 0) / withStats.length * 10) / 10 : null
  const lastScore = post?.score || history.find(h => h.post?.score)?.post.score || null
  const count = post ? charCount(postText(post)) : 0

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-md px-3 pb-28 pt-[max(env(safe-area-inset-top),12px)]">
        {/* 헤더 */}
        <header className="flex items-center justify-between px-1 pb-3 pt-1">
          <div>
            <p className="text-[13px] font-medium text-muted">{dateLabel}</p>
            <h1 className="font-num text-[26px] leading-tight text-deep">오늘의 스레드<span className="text-accent">.</span> <span className="align-middle font-body text-[10px] font-medium text-muted">v17</span></h1>
          </div>
          <div className="flex gap-1.5">
            <HeadBtn onClick={reset}>초기화</HeadBtn>
            <HeadBtn onClick={() => setSheet('history')}>기록</HeadBtn>
            <HeadBtn onClick={() => setSheet('settings')}>설정</HeadBtn>
          </div>
        </header>

        {/* 대표 카드 + 숫자 카드 */}
        <section className="grid grid-cols-2 gap-2">
          <div className="col-span-2 rounded-[22px] bg-brand p-4 text-white">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold text-white/85">오늘 올린 글</p>
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">{postedToday >= DAILY_GOAL ? '오늘 완료' : postedToday === 0 ? '아침 글 차례' : '저녁 글 차례'}</span>
            </div>
            <p className="mt-2 font-num text-[48px] leading-[52px]">{postedToday}<span className="ml-1 font-body text-[15px] font-medium text-white/80">/ {DAILY_GOAL}편</span></p>
            <p className="mt-1 text-[13px] text-white/85">누를 때마다 제주 이야기 · 생활 꿀팁 · AI 앱 이야기 중 하나로 써요</p>
          </div>
          <Stat label="이번 주 청소 글" value={rules.cleaningCount} unit="/ 2편" dot={rules.allowCleaning ? 'ok' : 'today'} dotText={rules.allowCleaning ? '여유' : '이번 주 끝'} />
          <Stat label="올린 글 전체" value={posted.length} unit="편" />
          <Stat label="평균 댓글" value={avgReplies ?? '–'} unit={avgReplies === null ? '' : '개'} sub={avgReplies === null ? '기록에 반응을 적으면 보여요' : `${withStats.length}편 기준`} />
          <Stat label="최근 글 점수" value={lastScore ?? '–'} unit={lastScore ? '점' : ''} accent={!!lastScore} />
        </section>

        {/* 메모 */}
        <SectionTitle hint="선택">오늘 있었던 일 · 떠오른 생각</SectionTitle>
        <div className="rounded-[14px] bg-card p-1">
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
            placeholder="예) 아침에 바람 때문에 빨래 다시 걷음 / 오늘 AI로 견적서 앱 고쳤는데 10분 만에 끝남"
            className="block w-full resize-none rounded-[12px] bg-transparent px-3 py-2.5 text-base leading-relaxed outline-none placeholder:text-muted/60" />
        </div>
        <p className="mt-1.5 px-1 text-xs text-muted">한 줄만 적어도 글이 훨씬 '내 이야기'처럼 나와요.</p>

        {error && (
          <div className="mt-4 flex gap-2 rounded-[14px] bg-card p-4 text-sm">
            <span className="dot mt-1.5 bg-danger" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-danger">{error}</p>
              {raw && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-muted underline">AI 원문 보기 (캡처해서 보내 주세요)</summary>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-paper p-2">{raw.slice(0, 1500)}</pre>
                </details>
              )}
            </div>
          </div>
        )}

        {/* 결과 */}
        {post && !busy && (
          <section id="result" className="mt-6">
            <div className="flex items-end justify-between px-1 pb-2">
              <div>
                <p className="text-xs font-semibold text-muted">① 스레드 본문</p>
                <p className="font-num text-[18px] text-deep">{THEMES[post.tone] ? `${THEMES[post.tone].tag}. ${THEMES[post.tone].label}` : '오늘의 글'}</p>
              </div>
              <Counter count={count} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* 미리보기 */}
              <article className="col-span-2 rounded-[22px] bg-card p-4">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-deep font-num text-sm text-white">{handle.slice(0, 1).toUpperCase()}<span className="text-[#6CC456]">.</span></div>
                    <div className="mt-2 w-0.5 flex-1 rounded bg-line" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{handle} <span className="font-normal text-muted">· 방금</span></p>
                    {post.title && <p className="mt-1 break-keep text-[15.5px] font-bold leading-[1.6] text-deep">제목: {post.title}</p>}
                    <p className={`${post.title ? 'mt-3' : 'mt-1'} whitespace-pre-line break-keep text-[15.5px] leading-[1.7]`}>{post.body}</p>
                    {post.topic_tag && <p className="mt-3 flex items-center gap-2"><span className="rounded-full bg-tint px-3 py-1 text-[13px] font-bold text-deep">#{post.topic_tag.replace(/^#/, '')}</span><span className="text-[11.5px] text-muted">황금 해시태그 · 복사에 포함</span></p>}
                  </div>
                </div>
              </article>

              {/* 점수·시간 숫자 카드 */}
              <Stat label="AI 채점" value={post.score > 0 ? post.score : '–'} unit={post.score > 0 ? '점' : ''} accent={post.score > 0} sub={post.score_reason} />
              <div className="rounded-[14px] bg-card p-4">
                <p className="text-xs font-semibold text-muted">추천 시간</p>
                <p className="mt-2 break-keep text-[14px] font-semibold leading-snug">{post.best_time || '–'}</p>
              </div>

              {/* 복사 버튼 */}
              <button onClick={() => { copy(postText(post), "복사 완료! 스레드에 붙여넣기 (기록에 '올린 글'로 표시돼요)"); markPosted(post, true) }}
                className="col-span-2 rounded-full bg-deep py-4 font-num text-[18px] text-white active:scale-[.98]">스레드용 복사</button>

              {/* 사진 팁 */}
              <div className="col-span-2 rounded-[14px] bg-deep p-4 text-white">
                <p className="text-xs font-semibold text-white/75">② 추천 사진 팁</p>
                <p className="mt-1.5 break-keep text-[15px] leading-relaxed">{post.photo_tip || post.image_idea}</p>
              </div>

              {/* 첫 댓글 (앱 링크) */}
              {post.reply_starter && (
                <div className="col-span-2 rounded-[14px] bg-card p-4">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 text-xs font-semibold text-muted">
                      {post.shared_app && <span className="dot bg-accent" />}
                      {post.shared_app ? `③ 첫 댓글에 달기 · ${post.shared_app} 링크` : '③ 올리자마자 첫 댓글'}
                    </p>
                    <button onClick={() => copy(post.reply_starter, post.shared_app ? '첫 댓글 복사 완료! 내 글에 댓글로 달아 주세요' : '첫 댓글 복사 완료')}
                      className="rounded-full bg-accent px-3.5 py-1 text-xs font-bold text-ink">복사</button>
                  </div>
                  <p className="mt-1.5 break-all text-[15px] leading-relaxed">{post.reply_starter}</p>
                </div>
              )}

              {/* 오늘의 소재 */}
              {(post.trend_keyword || post.trend_reason) && (
                <div className="col-span-2 rounded-[14px] bg-card p-4">
                  <p className="text-xs font-semibold text-muted">오늘의 소재</p>
                  <p className="mt-1 font-semibold text-deep">{post.trend_keyword}</p>
                  {post.trend_reason && <p className="mt-0.5 text-[13px] leading-snug text-muted">{post.trend_reason}</p>}
                  {post.source_url && <a href={post.source_url} target="_blank" rel="noreferrer" className="mt-2 block truncate border-t border-line pt-2 text-xs text-brand underline">{post.source_title || post.source_url}</a>}
                </div>
              )}
            </div>
          </section>
        )}

        {!post && !busy && !error && (
          <div className="mt-8 px-4 text-center">
            <p className="font-num text-[20px] text-deep">버튼 하나면 오늘 글 끝.</p>
            <p className="mt-1 break-keep text-[13px] text-muted">제주 사는 이야기 · 생활 꿀팁 · AI 앱 이야기 중 하나로 500자 안에 맞춰 드려요.</p>
          </div>
        )}
      </div>

      {/* 하단 고정 버튼 */}
      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-paper via-paper/95 to-transparent px-3 pb-[max(env(safe-area-inset-bottom),14px)] pt-6">
        <div className="mx-auto max-w-md">
          <button onClick={generate} disabled={busy}
            className={`w-full rounded-full bg-accent py-4 font-num text-[19px] text-ink transition active:scale-[.98] disabled:opacity-90 ${!post && !busy ? 'pulse-ring' : ''}`}>
            {busy ? <span className="font-body text-base font-semibold">{STAGE_MSG[stage][tick % STAGE_MSG[stage].length]}</span>
              : post ? '다른 글로 다시 생성' : '오늘의 글 생성'}
          </button>
        </div>
      </div>

      {sheet === 'settings' && (
        <Sheet title="설정" onClose={() => setSheet(null)}>
          <Field label="Claude API 키" hint="이 폰에만 저장돼요 (console.anthropic.com에서 발급)">
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value.trim())} placeholder="sk-ant-..." className="input" />
          </Field>
          <Field label="스레드 아이디 (미리보기용)">
            <input value={handle} onChange={e => setHandle(e.target.value)} className="input" />
          </Field>
          <Field label="나에 대한 정보" hint="AI가 매일 이걸 보고 글을 써요">
            <textarea rows={6} value={profile} onChange={e => setProfile(e.target.value)} className="input resize-none leading-relaxed" />
          </Field>
          <Field label="링크 공개해도 되는 내 앱" hint="한 줄에 하나: 이름 | 설명 | 링크">
            <textarea rows={5} value={apps} onChange={e => setApps(e.target.value)} className="input resize-none text-sm leading-relaxed" />
          </Field>
          <p className="-mt-2 mb-4 text-xs text-muted">C 테마에서 가끔(최근 3개 글에 없을 때) 하나를 소개하고, 링크는 첫 댓글에 넣어요. 업무용 앱은 넣지 마세요.</p>
          <label className="flex items-center justify-between rounded-[14px] bg-card px-4 py-3">
            <span className="text-sm font-semibold text-deep">오늘의 웹 트렌드 검색
              <span className="block text-xs font-normal text-muted">끄면 더 빠르고 저렴해요 (계절·날씨만 사용)</span>
            </span>
            <input type="checkbox" checked={useSearch} onChange={e => setUseSearch(e.target.checked)} className="h-6 w-6 accent-[#0E5A60]" />
          </label>
          <button onClick={() => setProfile(DEFAULT_PROFILE)} className="mt-3 text-xs text-muted underline">소개 기본값으로 되돌리기</button>
        </Sheet>
      )}

      {sheet === 'history' && (
        <Sheet title={`지난 글 ${history.length}개 · 올린 글 ${posted.length}`} onClose={() => setSheet(null)}>
          {history.length === 0 && <p className="py-8 text-center text-sm text-muted">아직 만든 글이 없어요.</p>}
          <p className="mb-3 rounded-[14px] bg-tint px-3 py-2.5 text-xs leading-relaxed text-deep">
            <b>스레드용 복사</b>를 누른 글은 자동으로 <b>'올린 글'</b>이 돼요. 올린 글에만 다음 날 <b>조회·댓글·좋아요</b>를 적어 주면, AI가 반응 좋았던 패턴을 배워요. 뽑아 보기만 한 글은 ✕로 지우세요.
          </p>
          <ul className="space-y-2">
            {history.map(h => (
              <li key={h.id} className={`rounded-[14px] px-4 py-3 ${h.posted ? 'bg-card' : 'bg-card/60'}`}>
                <div className="flex items-start gap-2">
                  <button onClick={() => { setPost(h.post); setSheet(null) }} className="min-w-0 flex-1 text-left">
                    <span className="flex items-center gap-1.5 text-xs text-muted">
                      <span className={`dot ${h.posted ? 'bg-leaf' : 'bg-line'}`} />
                      {h.posted ? '올림' : '뽑기만'} · {h.date} · {THEMES[h.post.tone]?.tag}. {THEMES[h.post.tone]?.label}
                    </span>
                    <span className={`mt-0.5 block truncate font-semibold ${h.posted ? '' : 'text-muted'}`}>{h.post.title || h.post.hook}</span>
                  </button>
                  <button aria-label="삭제" onClick={() => removeItem(h.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted active:bg-paper">✕</button>
                </div>
                {h.posted ? (
                  <>
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      {[['views', '조회'], ['replies', '댓글'], ['likes', '좋아요']].map(([k, l]) => (
                        <label key={k} className="flex items-center gap-1 rounded-[10px] bg-paper px-2 py-1.5">
                          <span className="shrink-0 text-[11px] font-semibold text-muted">{l}</span>
                          <input inputMode="numeric" value={h.stats?.[k] ?? ''} placeholder="-" onChange={e => setStat(h.id, k, e.target.value.replace(/\D/g, ''))}
                            className="w-full min-w-0 bg-transparent text-right font-num text-[17px] outline-none" />
                        </label>
                      ))}
                    </div>
                    <button onClick={() => markPosted(h.post, false)} className="mt-1.5 text-[11px] text-muted underline">올린 글 표시 취소</button>
                  </>
                ) : (
                  <button onClick={() => markPosted(h.post, true)} className="mt-2 rounded-full bg-tint px-3 py-1 text-xs font-semibold text-deep">실제로 올렸으면 누르기</button>
                )}
              </li>
            ))}
          </ul>
          {history.length > 0 && <button onClick={() => { if (confirm('기록을 모두 지울까요?')) setHistory([]) }} className="mt-4 text-xs text-danger underline">기록 전체 삭제</button>}
        </Sheet>
      )}

      {toast && <div className="fixed left-1/2 top-[max(env(safe-area-inset-top),20px)] z-50 -translate-x-1/2 rounded-full bg-deep px-5 py-2.5 text-sm font-medium text-white">{toast}</div>}
    </div>
  )
}

function HeadBtn({ children, onClick }) {
  return <button onClick={onClick} className="rounded-full bg-card px-3 py-2 text-[13px] font-semibold text-deep active:scale-95">{children}</button>
}

function SectionTitle({ children, hint }) {
  return <h2 className="mb-2 mt-6 break-keep px-1 text-[14px] font-bold text-deep">{children} {hint && <span className="text-xs font-normal text-muted">({hint})</span>}</h2>
}

function Stat({ label, value, unit, sub, dot, dotText, accent }) {
  return (
    <div className="rounded-[14px] bg-card p-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className={`mt-2 font-num text-[28px] leading-8 ${accent ? 'text-accent' : 'text-ink'}`}>{value}{unit && <span className="ml-1 font-body text-[13px] font-medium text-muted">{unit}</span>}</p>
      {dot && <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted"><span className={`dot ${dot === 'ok' ? 'bg-leaf' : 'bg-accent'}`} />{dotText}</p>}
      {sub && <p className="mt-1 line-clamp-2 break-keep text-[11.5px] leading-snug text-muted">{sub}</p>}
    </div>
  )
}

function Counter({ count }) {
  const pct = Math.min(100, count / MAX_CHARS * 100)
  const over = count > MAX_CHARS
  return (
    <div className="w-24 shrink-0 text-right">
      <span className={`font-num text-[17px] ${over ? 'text-danger' : 'text-ink'}`}>{count}<span className="font-body text-xs font-medium text-muted"> / {MAX_CHARS}자</span></span>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
        <div className={`h-full ${over ? 'bg-danger' : count >= 350 ? 'bg-leaf' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="mb-4 block">
      <span className="text-sm font-semibold text-deep">{label}</span>
      {hint && <span className="ml-1 text-xs text-muted">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-deep/40" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="mx-auto max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-[22px] bg-paper px-4 pb-[max(env(safe-area-inset-bottom),20px)] pt-3">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-num text-[20px] text-deep">{title}</h3>
          <button onClick={onClose} className="rounded-full bg-card px-3 py-1.5 text-sm font-semibold text-deep">닫기</button>
        </div>
        {children}
      </div>
    </div>
  )
}
