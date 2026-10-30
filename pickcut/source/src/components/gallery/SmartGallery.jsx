// ═════════════════════════════════════════════════════════════
// SmartGallery — [핵심 화면 1] AI 스마트 갤러리
//
// 화면 구성(위 → 아래)
//   ① 헤더: 앱 이름 + 요약("32장 중 베스트 7장")
//   ② 탭: 베스트 / 전체 / 제외됨
//   ③ 사진 격자: 베스트 탭에서는 1위를 크게 보여줌
//   ④ 오른쪽 아래 둥근 + 버튼: 사진 추가
//   ⑤ 사진 탭 → 바텀 시트(편집 / 판정 바꾸기 / 삭제)
// ═════════════════════════════════════════════════════════════
import { useRef, useState } from 'react';
import PhotoCard from './PhotoCard';
import PhotoActionSheet from './PhotoActionSheet';
import SimilarGroups from './SimilarGroups';
import ExportSheet from './ExportSheet';
import WatermarkSheet from '../settings/WatermarkSheet';
import { createSamplePhotos } from '../../lib/samplePhotos';

// 탭 목록. 탭을 추가하려면 여기 한 줄 + usePhotoLibrary의 lists에 목록 추가
const TABS = [
  { key: 'best', label: '베스트' },
  { key: 'similar', label: '비슷한' },
  { key: 'all', label: '전체' },
  { key: 'rejected', label: '제외됨' },
];

export default function SmartGallery({ library, watermark, onOpenEditor }) {
  const {
    lists, photos, loaded, analyzingCount, addFiles, removePhoto, removeAll, overrideVerdict, keepOnlyInGroup,
    notice, isFull, warnFull, maxPhotos,
  } = library;
  const [confirmClear, setConfirmClear] = useState(false); // '비우기' 두 번 눌러야 실행
  const [tab, setTab] = useState('best');
  const [selected, setSelected] = useState(null); // 바텀 시트에 띄울 사진
  const [exporting, setExporting] = useState(false);   // 내보내기 시트 열림
  const [wmOpen, setWmOpen] = useState(false);         // 로고 설정 시트 열림
  const fileInputRef = useRef(null);

  const current = lists[tab];

  // + 버튼: 꽉 찼으면 사진 선택 창을 열지 않고 안내만 띄움
  const openPicker = () => (isFull ? warnFull() : fileInputRef.current?.click());
  const doneCount = photos.filter((p) => p.status === 'done').length;

  return (
    <div className="relative flex h-full flex-col">
      {/* ① 헤더 */}
      <header className="pt-safe px-4 pb-3">
        <div className="flex items-baseline justify-between">
          <h1 className="text-[26px] font-extrabold tracking-tight">
            픽컷<span className="text-mark">.</span>
          </h1>
          <div className="flex items-center gap-2">
          {photos.length > 0 && (
            <div className="flex items-center gap-2">
              {/* 현재 장수 / 최대 장수. 꽉 차면 경고 색으로 */}
              <span className={`font-mono text-sm tabular-nums ${isFull ? 'text-warn' : 'text-white/50'}`}>
                {photos.length} / {maxPhotos}
              </span>
              {/* 전체 비우기: 실수 방지를 위해 한 번 더 눌러야 실행.
                  3초 안에 다시 안 누르면 원래대로 돌아감 */}
              <button
                onClick={() => {
                  if (confirmClear) {
                    removeAll();
                    setConfirmClear(false);
                  } else {
                    setConfirmClear(true);
                    setTimeout(() => setConfirmClear(false), 3000);
                  }
                }}
                disabled={analyzingCount > 0}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-30
                  ${confirmClear ? 'bg-warn text-ink' : 'border border-line text-white/70'}`}
              >
                {confirmClear ? '한 번 더 누르면 전부 삭제' : '비우기'}
              </button>
            </div>
          )}
            {/* 로고 설정: 켜져 있으면 빨간 점 표시 */}
            <button
              onClick={() => setWmOpen(true)}
              className="relative rounded-full border border-line px-3 py-1 text-xs font-semibold text-white/70 active:bg-white/10"
              aria-label={`로고 설정 (${watermark.active ? '켜짐' : '꺼짐'})`}
            >
              로고
              {watermark.active && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-mark" />}
            </button>
          </div>
        </div>
        <p className="mt-1 text-sm text-white/60">
          {photos.length === 0
            ? '사진을 올리면 AI가 베스트 컷만 골라드려요'
            : analyzingCount > 0
              ? `${photos.length}장 분석 중… (${doneCount}/${photos.length})`
              : `${photos.length}장 중 베스트 ${lists.best.length}장 · 제외 ${lists.rejected.length}장`}
        </p>
        {/* 분석 진행 막대 */}
        {analyzingCount > 0 && (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-mark transition-all"
              style={{ width: `${(doneCount / photos.length) * 100}%` }}
            />
          </div>
        )}
      </header>

      {/* ② 탭 (세그먼트 컨트롤) */}
      <nav className="px-4">
        <div className="grid grid-cols-4 rounded-full bg-panel p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full py-2 text-[13px] font-semibold transition
                ${tab === t.key ? 'bg-white text-ink' : 'text-white/60'}`}
            >
              {t.label}
              <span className="ml-1 text-xs opacity-60">{lists[t.key].length}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ③ 사진 격자 (이 영역만 스크롤) */}
      <main className="flex-1 overflow-y-auto px-4 pb-28 pt-4">
        {!loaded ? (
          <p className="py-16 text-center text-sm text-white/50">저장된 사진 불러오는 중…</p>
        ) : photos.length === 0 ? (
          <EmptyState
            onPick={openPicker}
            maxPhotos={maxPhotos}
            onSample={async () => addFiles(await createSamplePhotos())}
          />
        ) : tab === 'similar' ? (
          <SimilarGroups groups={lists.similar} onKeepOnly={keepOnlyInGroup} />
        ) : current.length === 0 ? (
          <p className="py-16 text-center text-sm text-white/50">
            {tab === 'best' && analyzingCount > 0 ? '분석이 끝나면 베스트 컷이 여기 모여요' : '해당하는 사진이 없어요'}
          </p>
        ) : (
          <>
          {/* 베스트 탭: 한꺼번에 내보내기 */}
          {tab === 'best' && (
            <button
              onClick={() => setExporting(true)}
              disabled={analyzingCount > 0}
              className="mb-3 flex w-full items-center justify-between rounded-2xl bg-mark px-4 py-3 font-bold text-ink active:opacity-80 disabled:opacity-40"
            >
              <span>베스트 {lists.best.length}장 한꺼번에 저장</span>
              <span className="text-xs font-semibold opacity-70">
                {analyzingCount > 0 ? '분석 끝나면 가능' : watermark.active ? '로고 포함 ›' : '›'}
              </span>
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            {current.map((photo, i) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                large={tab === 'best' && i === 0} // 베스트 1위는 크게
                onTap={setSelected}
              />
            ))}
          </div>
          </>
        )}
      </main>

      {/* ④ 사진 추가 버튼 (엄지가 닿는 오른쪽 아래) */}
      <button
        onClick={openPicker}
        className={`absolute bottom-[calc(env(safe-area-inset-bottom)+20px)] right-5 z-30 grid h-14 w-14 place-items-center rounded-full text-3xl font-light shadow-lg active:scale-95
          ${isFull ? 'bg-white/15 text-white/40' : 'bg-mark text-ink shadow-mark/20'}`}
        aria-label={isFull ? `최대 ${maxPhotos}장, 더 추가할 수 없음` : '사진 추가'}
      >
        +
      </button>

      {/* 한도 초과 안내 (4초 뒤 자동으로 사라짐) */}
      {notice && (
        <div
          role="alert"
          className="absolute inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+92px)] z-30 rounded-2xl border border-warn/40 bg-panel px-4 py-3 text-sm leading-relaxed text-white shadow-xl"
        >
          <span className="mr-1.5 font-bold text-warn">!</span>
          {notice}
        </div>
      )}

      {/* 숨겨진 파일 선택 창. multiple = 여러 장 한 번에 선택 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = ''; // 같은 사진을 다시 고를 수 있게 초기화
        }}
      />

      {/* ⑤ 바텀 시트 */}
      <PhotoActionSheet
        photo={selected}
        onClose={() => setSelected(null)}
        onEdit={(p) => {
          setSelected(null);
          onOpenEditor(p);
        }}
        onOverride={(id, verdict) => {
          overrideVerdict(id, verdict);
          setSelected(null);
        }}
        onRemove={(id) => {
          removePhoto(id);
          setSelected(null);
        }}
      />

      {exporting && (
        <ExportSheet
          photos={lists.best}
          watermark={watermark}
          onOpenWatermark={() => setWmOpen(true)}
          onClose={() => setExporting(false)}
        />
      )}

      {/* 로고 설정 (내보내기 시트 위에 겹쳐 열릴 수 있음) */}
      {wmOpen && (
        <WatermarkSheet
          watermark={watermark}
          previewUrl={lists.best[0]?.url ?? photos[0]?.url}
          onClose={() => setWmOpen(false)}
        />
      )}
    </div>
  );
}

/** 사진이 하나도 없을 때 보여주는 안내 화면 */
function EmptyState({ onPick, onSample, maxPhotos }) {
  return (
    <div className="flex flex-col items-center py-14 text-center">
      <div className="mb-5 grid h-24 w-24 place-items-center rounded-3xl border border-line bg-panel text-4xl">
        <span className="font-mono text-base text-mark">36 EXP</span>
      </div>
      <p className="text-lg font-bold">여행 사진, 연사 사진 몽땅 올려보세요</p>
      <p className="mt-2 text-sm leading-relaxed text-white/60">
        흔들린 사진, 너무 어둡거나 밝은 사진은 빼고
        <br />
        비슷한 연사 중 가장 잘 나온 1장만 남겨드려요.
        <br />
        <span className="text-white/40">
          한 번에 최대 {maxPhotos}장 · 사진은 폰 밖으로 나가지 않아요.
        </span>
      </p>
      <button onClick={onPick} className="mt-6 rounded-full bg-mark px-6 py-3 font-bold text-ink active:opacity-80">
        사진 고르기
      </button>
      {/* 개발·시연용: 실제 사진 없이 흔들림/어두움/연사 샘플 8장으로 체험 */}
      <button onClick={onSample} className="mt-3 text-sm text-white/60 underline underline-offset-4">
        샘플 사진 8장으로 체험하기
      </button>
    </div>
  );
}
