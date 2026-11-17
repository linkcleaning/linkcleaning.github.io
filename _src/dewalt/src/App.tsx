import { useCallback, useEffect, useRef, useState } from 'react'
import Compose, { newDraft, type Draft } from './components/Compose'
import History from './components/History'
import SettingsView from './components/SettingsView'
import { Toast } from './components/ui'
import { loadHistory, loadSettings, tokenDaysLeft, type HistoryItem, type Settings } from './lib/storage'

type Tab = 'compose' | 'history' | 'settings'

function Dot({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${on ? 'bg-dw/15 text-dw' : 'bg-iron/60 text-ash'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-dw' : 'bg-ash/60'}`} />
      {label}
    </span>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('compose')
  const [s, setS] = useState<Settings>(loadSettings)
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory)
  const [draft, setDraftState] = useState<Draft>(newDraft)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const timer = useRef<number>(0)

  const toast = useCallback((m: string) => {
    setToastMsg(m)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToastMsg(null), 2200)
  }, [])
  const setDraft = useCallback((u: (d: Draft) => Draft) => setDraftState(u), [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [tab])

  const igOn = !!s.igUserId
  const thOn = !!s.threadsUserId || !!s.threadsToken
  const aiOn = !!s.aiKey
  const minDays = Math.min(...[tokenDaysLeft(s.igTokenSavedAt), tokenDaysLeft(s.threadsTokenSavedAt)].filter((x): x is number => x !== null), 99)

  const reuse = (h: HistoryItem) => {
    setDraftState({ ...newDraft(), category: h.category, memo: h.memo, igText: h.instagram, thText: h.threads, generated: true })
    setTab('compose')
    toast('글을 불러왔어요 — 사진만 다시 넣어 주세요')
  }

  const today = new Date()
  const dateStr = `${today.getMonth() + 1}월 ${today.getDate()}일 ${'일월화수목금토'[today.getDay()]}요일`

  return (
    <div className="mx-auto min-h-dvh max-w-[520px] pb-28">
      {/* 상단 */}
      <header className="safe-top relative overflow-hidden bg-ink px-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12px] text-ash">{dateStr}</div>
            <h1 className="mt-0.5 font-head text-[26px] leading-[1.1] text-bone">
              광주 <span className="text-dw">디월트</span> AS
              <span className="ml-1.5 align-middle text-[13px] font-body font-bold tracking-widest text-ash">SNS</span>
            </h1>
          </div>
          <div className="flex flex-col items-end gap-1 pt-1">
            <div className="flex gap-1">
              <Dot on={aiOn} label="AI" />
              <Dot on={igOn} label="인스타" />
              <Dot on={thOn} label="스레드" />
            </div>
            {minDays <= 10 && (
              <button onClick={() => setTab('settings')} className="whitespace-nowrap rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
                토큰 만료 D-{Math.max(0, minDays)} · 연장하기
              </button>
            )}
          </div>
        </div>
      </header>
      <div className="hazard h-2" />

      <main className="px-4 pt-4">
        {tab === 'compose' && (
          <Compose s={s} draft={draft} setDraft={setDraft} toast={toast} onHistory={setHistory} goSettings={() => setTab('settings')} />
        )}
        {tab === 'history' && <History list={history} setList={setHistory} toast={toast} reuse={reuse} />}
        {tab === 'settings' && <SettingsView s={s} setS={setS} toast={toast} />}
        {tab === 'compose' && draft.generated && (
          <button
            onClick={() => {
              if (confirm('지금 글을 비우고 새로 작성할까요?')) setDraftState(newDraft())
            }}
            className="mt-4 w-full rounded-xl border border-iron py-3 text-[14px] text-ash"
          >
            ＋ 새 게시물 작성
          </button>
        )}
      </main>

      {/* 하단 탭 */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-iron bg-ink/95 backdrop-blur">
        <div className="mx-auto grid max-w-[520px] grid-cols-3">
          {(
            [
              ['compose', '✍️', '작성'],
              ['history', '🗂', `기록${history.length ? ` ${history.length}` : ''}`],
              ['settings', '⚙️', '설정'],
            ] as [Tab, string, string][]
          ).map(([k, i, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`relative flex flex-col items-center gap-0.5 pb-1 pt-2.5 text-[12px] font-semibold ${tab === k ? 'text-dw' : 'text-ash'}`}>
              {tab === k && <span className="absolute inset-x-8 top-0 h-[3px] rounded-b bg-dw" />}
              <span className="text-[20px] leading-none">{i}</span>
              {l}
            </button>
          ))}
        </div>
      </nav>
      <Toast msg={toastMsg} />
    </div>
  )
}
