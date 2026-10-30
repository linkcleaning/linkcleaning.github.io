// ═════════════════════════════════════════════════════════════
// PhotoActionSheet — 사진을 탭하면 아래에서 올라오는 메뉴(바텀 시트)
// 모바일 앱에서 흔한 패턴: 화면을 가리지 않고 엄지로 누르기 쉬움
// ═════════════════════════════════════════════════════════════

/** 눈 감음 검사 결과를 사람이 읽을 문장으로 */
function eyesText(eyes) {
  if (!eyes) return '확인 못 함 (얼굴 모델 준비 전·오프라인)';
  if (!eyes.hasFace) return '얼굴 없음';
  if (eyes.eyesClosed) return `${eyes.faces}명 중 ${eyes.closedFaces}명 눈 감음`;
  return `${eyes.faces}명 모두 눈 뜸`;
}

export default function PhotoActionSheet({ photo, onClose, onEdit, onOverride, onRemove }) {
  if (!photo) return null;
  const { result } = photo;

  return (
    // 바깥(어두운 배경)을 누르면 닫힘
    <div className="fixed inset-0 z-40 flex items-end bg-black/60" onClick={onClose}>
      <div
        className="pb-safe w-full rounded-t-3xl bg-panel p-4"
        onClick={(e) => e.stopPropagation()} // 시트 안쪽 클릭은 닫히지 않게
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />

        <div className="mb-4 flex gap-3">
          <img src={photo.thumbUrl} alt="" className="h-20 w-20 rounded-xl object-cover" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-semibold">{photo.name}</p>
            {/* AI가 왜 이렇게 판단했는지 숫자로 보여줌 → 사용자 신뢰 ↑ */}
            <p className="mt-1 text-white/60">
              종합 {result.score}점 · 선명도 {result.metrics.sharpness} · 노출 {result.metrics.exposure}
            </p>
            <p className="mt-0.5 text-white/60">
              눈 감음 검사: {eyesText(result.metrics.eyes)}
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          <button
            onClick={() => onEdit(photo)}
            className="rounded-2xl bg-mark py-3.5 font-bold text-ink active:opacity-80"
          >
            ✨ 말로 편집하기
          </button>
          {result.verdict !== 'best' ? (
            <button
              onClick={() => onOverride(photo.id, 'best')}
              className="rounded-2xl bg-white/10 py-3.5 font-semibold active:bg-white/20"
            >
              베스트 컷으로 지정
            </button>
          ) : (
            <button
              onClick={() => onOverride(photo.id, 'reject')}
              className="rounded-2xl bg-white/10 py-3.5 font-semibold active:bg-white/20"
            >
              베스트에서 빼기
            </button>
          )}
          <button
            onClick={() => onRemove(photo.id)}
            className="rounded-2xl py-3 text-sm text-warn active:bg-white/5"
          >
            목록에서 삭제
          </button>
        </div>
      </div>
    </div>
  );
}
