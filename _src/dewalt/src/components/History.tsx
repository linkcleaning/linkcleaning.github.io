import { useMemo, useState } from 'react'
import { CATEGORY_LABEL, type Category } from '../../shared/types'
import { copyText, openThreads } from '../lib/share'
import { saveHistory, type HistoryItem } from '../lib/storage'
import { Btn } from './ui'

const STATUS: Record<HistoryItem['status'], [string, string]> = {
  published: ['발행 완료', 'bg-dw text-ink'],
  partial: ['일부 발행', 'bg-orange-500 text-ink'],
  manual: ['수동(복사)', 'bg-iron text-bone'],
}

function fmt(t: number) {
  const d = new Date(t)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function History({
  list,
  setList,
  toast,
  reuse,
}: {
  list: HistoryItem[]
  setList: (l: HistoryItem[]) => void
  toast: (m: string) => void
  reuse: (h: HistoryItem) => void
}) {
  const [open, setOpen] = useState<string | null>(null)
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [q, setQ] = useState('')

  const shown = useMemo(
    () =>
      list.filter(
        (h) => (filter === 'all' || h.category === filter) && (!q.trim() || (h.memo + h.instagram + h.threads).toLowerCase().includes(q.trim().toLowerCase())),
      ),
    [list, filter, q],
  )

  const del = (id: string) => {
    if (!confirm('이 기록을 지울까요?')) return
    const l = list.filter((h) => h.id !== id)
    saveHistory(l)
    setList(l)
  }

  const copy = async (t: string, m: string) => toast((await copyText(t)) ? m : '복사 실패')

  return (
    <div className="space-y-3">
      <div className="plate rounded-2xl p-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="font-head text-[34px] leading-none text-dw">{list.length}</div>
            <div className="mt-1 text-xs text-ash">저장된 게시물 · 발행 {list.filter((h) => h.status === 'published').length}건</div>
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 모델명·내용 검색" className="w-40 rounded-xl border border-iron bg-ink px-3 py-2 text-[13px] outline-none focus:border-dw" />
        </div>
        <div className="no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1">
          {(['all', 'repair', 'new', 'parts', 'reels'] as const).map((c) => (
            <button key={c} onClick={() => setFilter(c)} className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold ${filter === c ? 'bg-dw text-ink' : 'border border-iron text-ash'}`}>
              {c === 'all' ? '전체' : CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 && (
        <div className="rounded-2xl border border-dashed border-iron py-14 text-center text-[14px] leading-relaxed text-ash">
          아직 기록이 없어요.
          <br />
          발행하거나 글을 복사하면 여기에 자동 저장돼요.
        </div>
      )}

      {shown.map((h) => {
        const isOpen = open === h.id
        const [st, stc] = STATUS[h.status]
        return (
          <div key={h.id} className="plate overflow-hidden rounded-2xl">
            <button onClick={() => setOpen(isOpen ? null : h.id)} className="flex w-full gap-3 p-3 text-left">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-ink">
                {h.thumb ? <img src={h.thumb} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-2xl">🧵</div>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className={`rounded px-1.5 py-0.5 font-bold ${stc}`}>{st}</span>
                  <span className="text-dw">{CATEGORY_LABEL[h.category]}</span>
                  <span className="ml-auto text-ash">{fmt(h.date)}</span>
                </div>
                <div className="mt-1 line-clamp-2 text-[13px] leading-snug text-bone/90">{h.memo || h.instagram.split('\n')[0]}</div>
              </div>
            </button>
            {isOpen && (
              <div className="space-y-3 border-t border-iron p-3">
                <div>
                  <div className="mb-1 text-[12px] font-bold text-dw">인스타그램</div>
                  <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-xl bg-ink p-3 font-body text-[13px] leading-relaxed">{h.instagram}</pre>
                </div>
                <div>
                  <div className="mb-1 text-[12px] font-bold text-dw">스레드</div>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-ink p-3 font-body text-[13px] leading-relaxed">{h.threads}</pre>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Btn onClick={() => copy(h.instagram, '인스타 글 복사됨')}>📋 인스타 글</Btn>
                  <Btn onClick={() => copy(h.threads, '스레드 글 복사됨')}>📋 스레드 글</Btn>
                  {h.igLink && (
                    <a href={h.igLink} target="_blank" rel="noreferrer" className="rounded-xl bg-dw/15 py-3 text-center text-[14px] font-bold text-dw">
                      인스타 게시물
                    </a>
                  )}
                  {h.thLink && (
                    <a href={h.thLink} target="_blank" rel="noreferrer" className="rounded-xl bg-dw/15 py-3 text-center text-[14px] font-bold text-dw">
                      스레드 글
                    </a>
                  )}
                  <Btn onClick={() => openThreads(h.threads)}>📱 스레드로 다시</Btn>
                  <Btn kind="dark" onClick={() => reuse(h)}>♻️ 재활용</Btn>
                  <Btn kind="danger" onClick={() => del(h.id)} className="col-span-2">
                    기록 삭제
                  </Btn>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
