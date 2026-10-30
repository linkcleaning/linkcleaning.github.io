// ═════════════════════════════════════════════════════════════
// PhotoCard — 갤러리 격자의 사진 한 칸
// 받는 값(props)
//   photo   : usePhotoLibrary의 사진 객체
//   onTap   : 사진을 눌렀을 때 실행할 함수
//   large   : true면 큰 카드(베스트 1위용)
// ═════════════════════════════════════════════════════════════

// 판정별 배지 모양을 한곳에 정리 → 디자인 바꿀 때 여기만 수정
const BADGE = {
  best: { label: '베스트', className: 'bg-mark text-ink' },
  ok: { label: '보통', className: 'bg-white/15 text-white' },
  reject: { label: '제외', className: 'bg-warn text-ink' },
};

export default function PhotoCard({ photo, onTap, large = false }) {
  const analyzing = photo.status === 'analyzing';
  const result = photo.result;
  const badge = result ? BADGE[result.verdict] : null;

  return (
    <button
      type="button"
      onClick={() => !analyzing && onTap(photo)}
      className={`relative overflow-hidden rounded-2xl bg-panel text-left active:scale-[0.98] transition-transform
        ${large ? 'col-span-2 aspect-[4/3]' : 'aspect-square'}`}
      aria-label={`${photo.name} ${badge ? badge.label : '분석 중'}`}
    >
      <img
        src={photo.thumbUrl} // 원본 대신 작은 썸네일 → 사진이 많아도 가벼움
        alt=""
        loading="lazy"
        className={`h-full w-full object-cover transition
          ${result?.verdict === 'reject' ? 'opacity-50 grayscale' : ''}
          ${analyzing ? 'opacity-40 blur-[2px]' : ''}`}
      />

      {/* 분석 중: 빛이 흐르는 효과 + 문구 */}
      {analyzing && (
        <div className="shimmer absolute inset-0 grid place-items-center">
          <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium">
            AI 분석 중…
          </span>
        </div>
      )}

      {/* 베스트 컷: 밀착 인화지에 그리스 펜슬로 친 동그라미처럼 테두리 표시 */}
      {result?.verdict === 'best' && (
        <svg className="pointer-events-none absolute inset-1 h-[calc(100%-8px)] w-[calc(100%-8px)]" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path
            d="M50 3 C80 2 97 18 97 50 C97 82 80 97 50 97 C18 97 3 80 3 50 C3 22 20 5 54 4"
            fill="none"
            stroke="var(--color-mark)"
            strokeWidth="2.2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}

      {/* 왼쪽 위: 판정 배지 */}
      {badge && (
        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${badge.className}`}
        >
          {badge.label}
          {result.manual && ' ✎'}
        </span>
      )}

      {/* 오른쪽 위: 비슷한 사진 묶음 표시 (예: 3장 중 1등) */}
      {photo.burstSize > 1 && photo.isBurstBest && (
        <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px]">
          비슷한 {photo.burstSize}장 중 1위
        </span>
      )}

      {/* 아래: 점수 + 탈락 사유 */}
      {result && (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
          <div className="flex flex-wrap gap-1">
            {result.reasons.map((r) => (
              <span key={r} className="rounded bg-warn/90 px-1.5 py-0.5 text-[10px] font-semibold text-ink">
                {r}
              </span>
            ))}
          </div>
          <span className={`font-mono font-semibold tabular-nums ${large ? 'text-2xl' : 'text-sm'}`}>
            {result.score}
            <span className="text-[10px] font-normal text-white/60">점</span>
          </span>
        </div>
      )}
    </button>
  );
}
