// ═════════════════════════════════════════════════════════════
// ExportSheet — 베스트 컷 한꺼번에 내보내기
//
// 1단계 '준비하기': 사진마다 (로고 합성 →) 파일 만들기, 진행률 표시
// 2단계 '저장하기': 공유 시트를 열어 사진 앱에 저장하거나 카톡·인스타로 보내기
// (아이폰은 버튼을 누른 직후에만 공유 시트가 열려서 두 단계로 나눴습니다)
// ═════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react';
import { renderForExport } from '../../lib/watermark';
import { makeExportFile, shareOrDownload } from '../../lib/exporter';
import { isNative } from '../../lib/nativeBridge';

export default function ExportSheet({ photos, watermark, onOpenWatermark, onClose }) {
  // 처음엔 전부 선택된 상태. 빼고 싶은 사진만 눌러서 해제
  const [selected, setSelected] = useState(() => new Set(photos.map((p) => p.id)));
  const [stage, setStage] = useState('select'); // select → preparing → ready → done
  const [progress, setProgress] = useState(0);
  const [resultText, setResultText] = useState('');
  const filesRef = useRef([]);
  const cancelledRef = useRef(false);

  // 시트를 닫으면 준비 중단
  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const chosen = photos.filter((p) => selected.has(p.id));

  const toggle = (id) => {
    if (stage !== 'select') return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /** 1단계: 파일 만들기 */
  const prepare = async () => {
    setStage('preparing');
    setProgress(0);
    const files = [];
    const usedNames = new Set();
    // 촬영 순서대로 내보내기 → 받는 쪽(카톡·갤러리)에서도 순서가 맞음
    const ordered = [...chosen].sort((a, b) => (a.captured?.ts ?? a.addedAt) - (b.captured?.ts ?? b.addedAt));
    for (let i = 0; i < ordered.length; i++) {
      if (cancelledRef.current) return;
      const blob = await renderForExport(ordered[i].url, watermark.settings, watermark.logoImg);
      files.push(await makeExportFile(blob, ordered[i], i, usedNames)); // 촬영 날짜 유지
      setProgress(i + 1);
    }
    filesRef.current = files;
    setStage('ready');
  };

  /** 2단계: 내보내기 (버튼을 누른 즉시 실행돼야 함) */
  const save = async () => {
    const outcome = await shareOrDownload(filesRef.current);
    if (outcome === 'cancelled') return; // 공유 창만 닫은 경우 → 다시 누를 수 있게 그대로 둠
    setResultText(
      outcome === 'saved'
        ? `사진첩에 ${filesRef.current.length}장을 저장했어요.`
        : outcome === 'shared'
          ? `${filesRef.current.length}장을 보냈어요.`
          : `${filesRef.current.length}장을 다운로드했어요.`
    );
    setStage('done');
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/70" onClick={stage === 'preparing' ? undefined : onClose}>
      <div
        className="pb-safe max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-panel p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="text-lg font-bold">베스트 컷 내보내기</h2>
          <span className="font-mono text-sm text-white/60">
            {chosen.length} / {photos.length}장
          </span>
        </div>
        <p className="mb-3 text-xs text-white/50">빼고 싶은 사진은 눌러서 선택을 해제하세요. 찍은 날짜 그대로 저장돼요.</p>

        {/* 선택 격자 */}
        <div className="mb-4 grid grid-cols-4 gap-1.5">
          {photos.map((p) => {
            const on = selected.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className={`relative aspect-square overflow-hidden rounded-xl transition ${on ? '' : 'opacity-35'}`}
                aria-pressed={on}
                aria-label={`${p.name} ${on ? '선택됨' : '선택 안 됨'}`}
              >
                <img src={p.thumbUrl} alt="" className="h-full w-full object-cover" />
                <span
                  className={`absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full border text-[11px] font-bold
                    ${on ? 'border-mark bg-mark text-ink' : 'border-white/70 bg-black/40'}`}
                >
                  {on ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>

        {/* 로고 상태 → 누르면 로고 설정 열기 */}
        <button
          onClick={onOpenWatermark}
          disabled={stage !== 'select'}
          className="mb-4 flex w-full items-center justify-between rounded-2xl border border-line px-4 py-3 text-left text-sm active:bg-white/5 disabled:opacity-50"
        >
          <span>
            로고 넣기{' '}
            <b className={watermark.active ? 'text-mark' : 'text-white/50'}>{watermark.active ? '켜짐' : '꺼짐'}</b>
          </span>
          <span className="text-white/50">설정 ›</span>
        </button>

        {/* 단계별 버튼 */}
        {stage === 'select' && (
          <button
            onClick={prepare}
            disabled={chosen.length === 0}
            className="w-full rounded-2xl bg-mark py-3.5 font-bold text-ink active:opacity-80 disabled:bg-white/15 disabled:text-white/40"
          >
            {chosen.length}장 내보내기 준비
          </button>
        )}

        {stage === 'preparing' && (
          <div className="rounded-2xl bg-white/10 p-4 text-center">
            <p className="mb-2 text-sm">
              사진 만드는 중… <span className="font-mono">{progress}/{chosen.length}</span>
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-mark transition-all" style={{ width: `${(progress / chosen.length) * 100}%` }} />
            </div>
          </div>
        )}

        {stage === 'ready' && (
          <button onClick={save} className="w-full rounded-2xl bg-mark py-3.5 font-bold text-ink active:opacity-80">
            {chosen.length}장 {isNative ? '사진첩에 저장' : '저장·공유하기'}
          </button>
        )}

        {stage === 'done' && (
          <div className="grid gap-2">
            <p className="rounded-2xl bg-white/10 p-3 text-center text-sm">{resultText}</p>
            <button onClick={onClose} className="rounded-2xl bg-white/10 py-3 font-semibold active:bg-white/20">
              닫기
            </button>
          </div>
        )}

        {stage === 'ready' && (
          <p className="mt-2 text-center text-xs text-white/45">
            {isNative ? '누르면 사진첩에 바로 저장돼요' : `아이폰: 공유 창에서 '이미지 ${chosen.length}개 저장'을 누르세요`}
          </p>
        )}
      </div>
    </div>
  );
}
