// ═════════════════════════════════════════════════════════════
// PromptEditor — [핵심 화면 2] 말로 하는 사진 편집
//
// 화면 구성 (인스타그램 스토리 편집 화면과 같은 배치)
//   ┌ 상단 바: ← 뒤로 · ↶ 되돌리기 · 저장
//   │ 적용된 편집 칩들 (× 로 하나씩 빼기)
//   │
//   │      사진 (꾹 누르고 있으면 원본 비교)
//   │
//   │ 추천 문장 칩 (가로 스크롤)
//   └ 입력창 [🎤][ 어떻게 바꿔볼까요? ][↑]
//
// 슬라이더가 하나도 없습니다. 모든 편집은 '문장' 하나로 합니다.
// ═════════════════════════════════════════════════════════════
import { useState } from 'react';
import { usePromptEditor } from '../../hooks/usePromptEditor';
import { SUGGESTIONS } from '../../lib/promptParser';
import PromptBar from './PromptBar';

export default function PromptEditor({ photo, watermark, onBack }) {
  const { history, resultUrl, busy, ready, message, submit, undo, removeStep, save } =
    usePromptEditor(photo, watermark);
  const [peeking, setPeeking] = useState(false); // 원본 비교 중인지

  // 보여줄 이미지: 비교 중이거나 편집 전이면 원본, 아니면 결과
  const shownUrl = peeking || !resultUrl ? photo.url : resultUrl;

  return (
    <div className="relative flex h-full flex-col bg-black">
      {/* ── 상단 바 ── */}
      <header className="pt-safe absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/70 to-transparent px-3 pb-6">
        <div className="flex items-center justify-between">
          <IconButton onClick={onBack} label="갤러리로">
            <path d="M15 18l-6-6 6-6" />
          </IconButton>
          <div className="flex items-center gap-2">
            <IconButton onClick={undo} label="되돌리기" disabled={history.length === 0}>
              <path d="M9 14L4 9l5-5" />
              <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
            </IconButton>
            <button
              onClick={save}
              className="h-10 rounded-full bg-white px-4 text-sm font-bold text-ink active:opacity-80"
            >
              저장
            </button>
          </div>
        </div>

        {/* 적용된 편집 목록 = 레이어처럼 하나씩 뺄 수 있음 */}
        {history.length > 0 && (
          <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto">
            {history.map((h) => (
              <span
                key={h.id}
                className="flex shrink-0 items-center gap-1 rounded-full bg-white/15 py-1 pl-3 pr-1 text-xs backdrop-blur"
              >
                {h.labels.join(' · ')}
                <button
                  onClick={() => removeStep(h.id)}
                  className="grid h-5 w-5 place-items-center rounded-full text-white/70 active:bg-white/20"
                  aria-label={`${h.labels.join(', ')} 빼기`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </header>

      {/* ── 사진 영역: 꾹 누르면 원본 보기 ── */}
      <main
        className="relative flex flex-1 select-none items-center justify-center overflow-hidden"
        onPointerDown={() => resultUrl && setPeeking(true)}
        onPointerUp={() => setPeeking(false)}
        onPointerLeave={() => setPeeking(false)}
        onContextMenu={(e) => e.preventDefault()} // 길게 누를 때 '이미지 저장' 메뉴 막기
      >
        <img
          src={shownUrl}
          alt="편집 중인 사진"
          draggable={false}
          className={`max-h-full max-w-full object-contain transition duration-300 ${busy ? 'scale-[0.98] opacity-60' : ''}`}
        />

        {/* 편집 중 표시 */}
        {(busy || !ready) && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-sm">
              <span className="h-2 w-2 animate-ping rounded-full bg-mark" />
              {ready ? 'AI가 편집 중…' : '사진 준비 중…'}
            </span>
          </div>
        )}

        {/* 원본 비교 중 라벨 / 사용법 힌트 */}
        {peeking ? (
          <span className="absolute bottom-3 rounded-full bg-black/70 px-3 py-1 text-xs">원본</span>
        ) : (
          resultUrl && !busy && (
            <span className="absolute bottom-3 rounded-full bg-black/50 px-3 py-1 text-[11px] text-white/70">
              사진을 꾹 누르면 원본과 비교
            </span>
          )
        )}

        {/* 결과 안내(토스트) */}
        {message && (
          <div
            className={`absolute top-28 rounded-full px-4 py-2 text-sm font-medium shadow-lg
              ${message.type === 'error' ? 'bg-warn text-ink' : 'bg-white text-ink'}`}
            role="status"
          >
            {message.text}
          </div>
        )}
      </main>

      {/* ── 하단: 추천 문장 + 입력창 ── */}
      <footer className="pb-safe z-20 bg-gradient-to-t from-black via-black/90 to-transparent px-3 pt-3">
        <div className="no-scrollbar -mx-3 mb-3 flex gap-2 overflow-x-auto px-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => submit(s)}
              disabled={!ready}
              className="shrink-0 rounded-full border border-white/25 px-3.5 py-1.5 text-[13px] active:bg-white/15 disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
        <PromptBar onSubmit={submit} disabled={!ready} />
      </footer>
    </div>
  );
}

/** 상단 바의 동그란 아이콘 버튼 (children = SVG path) */
function IconButton({ onClick, label, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-full bg-black/40 backdrop-blur active:bg-white/20 disabled:opacity-30"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}
