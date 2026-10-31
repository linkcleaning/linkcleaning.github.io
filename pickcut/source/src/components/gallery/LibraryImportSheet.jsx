// ═════════════════════════════════════════════════════════════
// LibraryImportSheet — [아이폰 앱 전용] 사진첩에서 기간으로 불러오기
//
// 사진을 하나하나 고를 필요 없이 "오늘", "최근 7일", "10월 24일~25일"처럼
// 기간만 고르면 그 사이에 찍은 사진을 전부 불러와 분석합니다.
// 이미 불러온 사진은 다시 불러오지 않습니다.
// ═════════════════════════════════════════════════════════════
import { useState } from 'react';

const DAY = 24 * 60 * 60 * 1000;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** 미리 정해둔 기간 */
const PRESETS = [
  { key: 'today', label: '오늘', range: () => [startOfDay(new Date()), Date.now()] },
  { key: 'yesterday', label: '어제', range: () => [startOfDay(new Date()) - DAY, startOfDay(new Date())] },
  { key: '3d', label: '최근 3일', range: () => [startOfDay(new Date()) - 2 * DAY, Date.now()] },
  { key: '7d', label: '최근 7일', range: () => [startOfDay(new Date()) - 6 * DAY, Date.now()] },
  { key: '30d', label: '최근 30일', range: () => [startOfDay(new Date()) - 29 * DAY, Date.now()] },
];

/** <input type="date"> 값("2026-10-24") ↔ 날짜 */
const toInput = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fromInput = (v) => {
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
};

export default function LibraryImportSheet({ onImport, onPickFiles, onClose, remaining }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [from, setFrom] = useState(toInput(Date.now() - 6 * DAY));
  const [to, setTo] = useState(toInput(Date.now()));

  const run = async (fromTs, toTs) => {
    setBusy(true);
    setMessage(null);
    try {
      const r = await onImport(fromTs, toTs);
      if (r.denied) {
        setMessage('사진 접근이 꺼져 있어요. 아이폰 설정 → 픽컷 → 사진 → "전체 접근"으로 바꿔주세요.');
      } else if (r.found === 0) {
        setMessage('이 기간에 찍은 사진이 없어요.');
      } else if (r.added === 0) {
        setMessage(r.already > 0 ? '이 기간 사진은 이미 모두 불러왔어요.' : '더 불러올 자리가 없어요. 정리한 뒤 다시 시도하세요.');
      } else {
        onClose(); // 불러오기 시작 → 갤러리에서 진행 상황 표시
        return;
      }
    } catch (err) {
      setMessage(`불러오지 못했어요. (${err.message})`);
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/70" onClick={busy ? undefined : onClose}>
      <div className="pb-safe w-full rounded-t-3xl bg-panel p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
        <h2 className="text-lg font-bold">사진첩에서 불러오기</h2>
        <p className="mb-4 mt-1 text-xs text-white/50">
          고른 기간에 찍은 사진을 전부 불러와 분석해요 · 남은 자리 {remaining}장
        </p>

        <div className="mb-4 grid grid-cols-3 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              disabled={busy}
              onClick={() => run(...p.range())}
              className="rounded-xl bg-white/10 py-3 text-sm font-semibold active:bg-white/20 disabled:opacity-40"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* 날짜 직접 고르기 */}
        <p className="mb-1.5 text-sm font-semibold">날짜 직접 고르기</p>
        <div className="mb-2 flex items-center gap-2">
          <input
            id="lib-from"
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-line bg-ink px-3 py-2.5 text-base"
          />
          <span className="text-white/50">~</span>
          <input
            id="lib-to"
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-line bg-ink px-3 py-2.5 text-base"
          />
        </div>
        <button
          disabled={busy || !from || !to}
          onClick={() => run(fromInput(from), fromInput(to) + DAY)}
          className="mb-3 w-full rounded-2xl bg-mark py-3.5 font-bold text-ink active:opacity-80 disabled:opacity-40"
        >
          {busy ? '사진첩 확인 중…' : '이 기간 사진 불러오기'}
        </button>

        {message && <p className="mb-3 rounded-xl bg-white/10 p-3 text-sm leading-relaxed">{message}</p>}

        <button
          disabled={busy}
          onClick={onPickFiles}
          className="w-full py-2 text-sm text-white/60 underline underline-offset-4 disabled:opacity-40"
        >
          사진 직접 골라서 올리기
        </button>
      </div>
    </div>
  );
}
