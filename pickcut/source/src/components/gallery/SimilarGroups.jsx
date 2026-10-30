// ═════════════════════════════════════════════════════════════
// SimilarGroups — '비슷한' 탭: 비슷한 사진 묶음 목록 + 묶음 비교 시트
//
//   [묶음 카드]  ┌──────┬────┬────┬────┐
//               │ 1등  │ 2  │ 3  │ +2 │   비슷한 5장 · 1장만 남기기 →
//               └──────┴────┴────┴────┘
//   카드를 누르면 → 아래에서 시트가 올라와 묶음 전체를 크게 비교,
//   사진을 골라 '이 사진만 남기기' → 나머지는 자동으로 제외
// ═════════════════════════════════════════════════════════════
import { useState } from 'react';

export default function SimilarGroups({ groups, onKeepOnly }) {
  const [openIndex, setOpenIndex] = useState(null);
  const open = openIndex === null ? null : groups[openIndex];

  if (groups.length === 0) {
    return (
      <p className="py-16 text-center text-sm leading-relaxed text-white/50">
        비슷한 사진 묶음이 없어요.
        <br />
        같은 장면을 여러 번 찍은 사진이 여기 모여요.
      </p>
    );
  }

  return (
    <>
      <p className="mb-3 text-xs text-white/50">
        같은 장면 묶음 {groups.length}개 · 묶음마다 1장만 남기면 정리가 끝나요
      </p>
      <ul className="grid gap-3">
        {groups.map((group, gi) => {
          const kept = group.filter((p) => p.result.verdict === 'best').length;
          const done = kept === 1 && group.every((p) => p.result.manual); // 이미 정리한 묶음
          const shown = group.slice(0, 4);
          const more = group.length - shown.length;
          return (
            <li key={group[0].id}>
              <button
                onClick={() => setOpenIndex(gi)}
                className="w-full rounded-2xl border border-line bg-panel p-2 text-left active:bg-white/5"
              >
                {/* 썸네일 띠: 첫 칸(1등)은 넓게 */}
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-1">
                  {shown.map((p, i) => (
                    <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl">
                      <img src={p.thumbUrl} alt="" className="h-full w-full object-cover" />
                      {i === 0 && (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-mark px-1.5 py-0.5 text-[10px] font-bold text-ink">
                          추천
                        </span>
                      )}
                      {i === shown.length - 1 && more > 0 && (
                        <span className="absolute inset-0 grid place-items-center bg-black/60 font-mono text-sm">
                          +{more}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between px-1 text-sm">
                  <span>
                    비슷한 <b className="font-mono">{group.length}</b>장
                  </span>
                  <span className={done ? 'text-white/50' : 'font-semibold text-mark'}>
                    {done ? '정리 완료 ✓' : '1장만 남기기 →'}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {open && (
        <GroupSheet
          group={open}
          onClose={() => setOpenIndex(null)}
          onKeep={(keepId) => {
            onKeepOnly(open.map((p) => p.id), keepId);
            setOpenIndex(null);
          }}
        />
      )}
    </>
  );
}

/** 묶음 비교 시트: 사진을 크게 보며 하나를 고름 */
function GroupSheet({ group, onClose, onKeep }) {
  // 처음엔 AI 추천(점수 1등)이 선택된 상태
  const [pickedId, setPickedId] = useState(group[0].id);
  const picked = group.find((p) => p.id === pickedId) ?? group[0];

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/70" onClick={onClose}>
      <div
        className="pb-safe max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-panel p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
        <p className="mb-3 text-sm text-white/60">남길 사진 1장을 고르세요. 나머지는 '제외됨'으로 옮겨요.</p>

        {/* 크게 보기: 편집용 사본(고화질)으로 표시 */}
        <div className="relative mb-3 overflow-hidden rounded-2xl bg-black">
          <img src={picked.url} alt="" className="mx-auto max-h-[42dvh] w-auto object-contain" />
          <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2.5 py-1 font-mono text-xs">
            {picked.result.score}점
            {picked.result.reasons.length > 0 && ` · ${picked.result.reasons.join(', ')}`}
          </span>
        </div>

        {/* 묶음 전체: 눌러서 고르기 */}
        <div className="grid grid-cols-4 gap-1.5">
          {group.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setPickedId(p.id)}
              className={`relative aspect-square overflow-hidden rounded-xl ring-2 transition
                ${p.id === pickedId ? 'ring-mark' : 'ring-transparent opacity-70'}`}
              aria-label={`${i + 1}번 사진 ${p.result.score}점`}
            >
              <img src={p.thumbUrl} alt="" className="h-full w-full object-cover" />
              <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 font-mono text-[10px]">
                {p.result.score}
              </span>
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded-full bg-mark px-1 text-[9px] font-bold text-ink">
                  추천
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => onKeep(picked.id)}
          className="mt-4 w-full rounded-2xl bg-mark py-3.5 font-bold text-ink active:opacity-80"
        >
          이 사진만 남기기 ({group.length - 1}장 제외)
        </button>
      </div>
    </div>
  );
}
