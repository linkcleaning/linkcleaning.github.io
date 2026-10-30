// ═════════════════════════════════════════════════════════════
// usePhotoLibrary — 사진 목록과 AI 분석 상태를 관리하는 '커스텀 훅'
//
// 커스텀 훅이란? 여러 화면에서 쓰는 '데이터 + 동작'을 한곳에 모은 함수.
// 화면(컴포넌트)은 "사진 추가해 줘", "베스트만 줘"만 요청하고,
// 어떻게 분석하고 저장하는지는 이 파일이 책임집니다.
//
// 사진 1장이 들어오면 일어나는 일
//   ① 한도 확인 → ② 썸네일(400px)·작업용 사본(2048px) 만들기
//   → ③ 화면에 '분석 중'으로 표시 → ④ 흔들림·노출·눈 감음 분석
//   → ⑤ 결과 표시 + 폰 저장소(IndexedDB)에 저장
// ═════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analyzePhoto, averageHash, loadImage, resizeToBlob, toDetectCanvas } from '../lib/imageAnalysis';
import { preloadFaceModel } from '../lib/faceDetector';
import { computeEmbedding, groupSimilar, preloadSimilarityModel } from '../lib/similarity';
import {
  clearPhotos,
  deletePhoto,
  loadAllPhotos,
  requestPersistentStorage,
  savePhoto,
  updatePhoto,
} from '../lib/photoStore';

// 사진 한 장의 데이터 모양 (참고용 설명)
// {
//   id, name, addedAt,
//   thumbUrl: string,   격자에 띄울 작은 이미지 주소 (400px)
//   url: string,        편집 화면에서 쓸 이미지 주소 (2048px)
//   status: 'analyzing' | 'done' | 'error',
//   result: { score, verdict, reasons, metrics, manual? } | null,
//   hash: string | null       예전 방식 지문(AI 모델을 못 쓸 때 대체용)
//   embedding: Float32Array    AI 지문(비슷한 사진 찾기용)
// }
// '비슷한 사진' 기준값은 src/lib/similarity.js 의 SIMILAR_THRESHOLD 에서 조절

// ★ 앱이 한 번에 안정적으로 다룰 수 있는 최대 사진 수 ★
// 격자에는 썸네일만 띄우므로 200장까지 괜찮습니다.
// 저장 용량은 사진 1장당 약 0.5MB → 200장 ≈ 100MB
export const MAX_PHOTOS = 200;

const THUMB_SIZE = 400;  // 격자용 (2열 격자에서 레티나 화면 기준 충분)
const WORK_SIZE = 2048;  // 편집용 (편집 엔진은 1600px로 작업)

const fullMessage = `최대 ${MAX_PHOTOS}장까지 정리할 수 있어요. 필요 없는 사진을 지운 뒤 다시 올려주세요.`;

/** 저장된 기록(DB) → 화면용 사진 객체 (Blob을 화면 주소로 바꿈) */
function recordToPhoto(rec) {
  return {
    id: rec.id,
    name: rec.name,
    addedAt: rec.addedAt,
    thumbUrl: URL.createObjectURL(rec.thumb),
    url: URL.createObjectURL(rec.work),
    status: rec.result ? 'done' : 'error',
    result: rec.result,
    hash: rec.hash,
    embedding: rec.embedding ?? null,
  };
}

export function usePhotoLibrary() {
  const [photos, setPhotos] = useState([]);
  const [loaded, setLoaded] = useState(false);  // 저장된 사진 불러오기 완료 여부
  const [notice, setNotice] = useState(null);   // 화면에 띄울 안내 문구
  const urlsRef = useRef(new Map());             // 사진 id → [썸네일 주소, 사본 주소] (메모리 정리용)

  // 현재 장수를 함수 안에서도 정확히 알기 위한 장치
  //   countRef   : 이미 목록에 들어간 사진 수
  //   pendingRef : '받기로 했지만 아직 목록에 안 들어간' 사진 수
  const countRef = useRef(0);
  const pendingRef = useRef(0);
  useEffect(() => {
    countRef.current = photos.length;
  }, [photos]);

  const remember = (photo) => urlsRef.current.set(photo.id, [photo.thumbUrl, photo.url]);
  const forget = (id) => {
    (urlsRef.current.get(id) || []).forEach((u) => URL.revokeObjectURL(u));
    urlsRef.current.delete(id);
  };

  // ── 앱 시작: 저장된 사진 불러오기 + 얼굴 모델 미리 받기 ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const records = await loadAllPhotos();
        if (cancelled) return;
        const restored = records.map(recordToPhoto);
        restored.forEach(remember);
        countRef.current = restored.length;
        setPhotos(restored);
      } catch (err) {
        // 비공개 모드 등 저장소를 못 쓰는 환경 → 저장 없이 계속 동작
        console.warn('[픽컷] 저장된 사진을 불러오지 못했어요', err);
      }
      if (!cancelled) setLoaded(true);
    })();
    requestPersistentStorage();
    preloadFaceModel();
    preloadSimilarityModel();
    return () => {
      cancelled = true;
    };
  }, []);

  /** 사진 파일 여러 장 추가 → 한도 확인 → 하나씩 분석·저장 */
  const addFiles = useCallback(async (fileList) => {
    const picked = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (picked.length === 0) return;

    // ① 남은 자리 계산
    const remaining = MAX_PHOTOS - countRef.current - pendingRef.current;
    if (remaining <= 0) {
      setNotice(fullMessage);
      return;
    }
    const files = picked.slice(0, remaining);
    const skipped = picked.length - files.length;
    if (skipped > 0) {
      setNotice(
        `한 번에 최대 ${MAX_PHOTOS}장까지 정리할 수 있어요. 앞의 ${files.length}장만 올리고 ${skipped}장은 제외했어요.`
      );
    }
    pendingRef.current += files.length;

    let unreadable = 0;
    for (const file of files) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const addedAt = Date.now();

      // ② 원본을 열어서 썸네일·작업용 사본 만들기
      let source;
      let thumb;
      let work;
      try {
        source = await loadImage(file);
        [thumb, work] = await Promise.all([
          resizeToBlob(source.img, THUMB_SIZE, 0.8),
          resizeToBlob(source.img, WORK_SIZE, 0.9),
        ]);
      } catch {
        pendingRef.current -= 1;
        unreadable += 1; // HEIC 등 브라우저가 못 여는 형식
        if (source) URL.revokeObjectURL(source.url);
        continue;
      }

      // ③ 화면에 '분석 중'으로 바로 표시
      const photo = {
        id,
        name: file.name,
        addedAt,
        thumbUrl: URL.createObjectURL(thumb),
        url: URL.createObjectURL(work),
        status: 'analyzing',
        result: null,
        hash: null,
        embedding: null,
      };
      remember(photo);
      pendingRef.current -= 1;
      countRef.current += 1;
      setPhotos((prev) => [...prev, photo]);

      // ④ 분석
      let result = null;
      let hash = null;
      let embedding = null;
      try {
        result = await analyzePhoto(source.img);
        hash = averageHash(source.img);
        embedding = await computeEmbedding(toDetectCanvas(source.img)); // null이면 예전 방식으로 비교
        setPhotos((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: 'done', result, hash, embedding } : p))
        );
      } catch {
        setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'error' } : p)));
      }

      // 원본은 분석이 끝나면 바로 메모리에서 해제 (썸네일·사본만 남김)
      URL.revokeObjectURL(source.url);

      // ⑤ 폰 저장소에 저장 (실패해도 화면 사용엔 지장 없음)
      savePhoto({ id, name: file.name, addedAt, thumb, work, result, hash, embedding }).catch((err) => {
        console.warn('[픽컷] 저장 실패(저장 공간 부족 등)', err);
        setNotice('폰 저장 공간이 부족해 일부 사진은 앱을 다시 열면 사라질 수 있어요.');
      });

      // 다음 사진 분석 전에 브라우저가 화면을 그릴 틈을 줌(버벅임 방지)
      await new Promise((r) => setTimeout(r, 0));
    }

    if (unreadable > 0) {
      setNotice(`${unreadable}장은 열 수 없는 형식(HEIC 등)이라 건너뛰었어요.`);
    }
  }, []);

  /** 사진 1장 삭제 (화면 + 저장소) */
  const removePhoto = useCallback((id) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    forget(id);
    deletePhoto(id).catch(() => {});
  }, []);

  /** 전체 비우기 */
  const removeAll = useCallback(() => {
    setPhotos([]);
    [...urlsRef.current.keys()].forEach(forget);
    countRef.current = 0;
    clearPhotos().catch(() => {});
  }, []);

  /** 사용자가 AI 판정을 직접 뒤집기 (예: 제외 → 베스트로 살리기) */
  const overrideVerdict = useCallback((id, verdict) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== id || !p.result) return p;
        const result = { ...p.result, verdict, manual: true };
        updatePhoto(id, { result }).catch(() => {});
        return { ...p, result };
      })
    );
  }, []);

  /**
   * 비슷한 사진 묶음에서 '이 사진만 남기기'
   * 고른 사진은 베스트, 같은 묶음의 나머지는 제외로 바꿉니다(사용자 지정 ✎).
   */
  const keepOnlyInGroup = useCallback((groupIds, keepId) => {
    const ids = new Set(groupIds);
    setPhotos((prev) =>
      prev.map((p) => {
        if (!ids.has(p.id) || !p.result) return p;
        const verdict = p.id === keepId ? 'best' : 'reject';
        const result = { ...p.result, verdict, manual: true };
        updatePhoto(p.id, { result }).catch(() => {});
        return { ...p, result };
      })
    );
  }, []);

  // 비슷한 사진 묶기: 묶음마다 점수 1등만 isBurstBest = true
  const { enriched, groups } = useMemo(() => {
    const done = photos.filter((p) => p.status === 'done');
    const bestIds = new Set();
    const groupOf = new Map(); // 사진 id → 묶음 번호
    // 각 묶음을 점수 높은 순으로 정렬 → 맨 앞이 그 묶음의 1등
    const groups = groupSimilar(done).map((members) =>
      [...members].sort((a, b) => b.result.score - a.result.score)
    );
    groups.forEach((members, gi) => {
      bestIds.add(members[0].id);
      members.forEach((p) => groupOf.set(p.id, gi));
    });

    const enriched = photos.map((p) => {
      const gi = groupOf.get(p.id);
      return {
        ...p,
        isBurstBest: bestIds.has(p.id),
        burstSize: gi === undefined ? 1 : groups[gi].length,
        groupIndex: gi ?? null,
      };
    });
    return { enriched, groups };
  }, [photos]);

  // 화면 탭별 목록
  const lists = useMemo(() => {
    const byId = new Map(enriched.map((p) => [p.id, p]));
    const done = enriched.filter((p) => p.status === 'done');

    // 베스트: 판정 best + (묶음 1등이거나 사용자가 직접 지정)
    const best = done
      .filter((p) => p.result.verdict === 'best' && (p.isBurstBest || p.result.manual))
      .sort((a, b) => b.result.score - a.result.score);
    const rejected = done.filter((p) => p.result.verdict === 'reject');

    // 비슷한 사진: 2장 이상 묶음만, 큰 묶음부터
    const similar = groups
      .filter((g) => g.length > 1)
      .map((g) => g.map((p) => byId.get(p.id)))
      .sort((a, b) => b.length - a.length);

    return { all: enriched, best, rejected, similar };
  }, [enriched, groups]);

  const analyzingCount = photos.filter((p) => p.status === 'analyzing').length;

  // 안내 문구는 4초 뒤 자동으로 사라짐
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  // 앱이 꺼질 때 화면용 주소 정리(메모리 누수 방지)
  useEffect(() => () => [...urlsRef.current.keys()].forEach(forget), []);

  const isFull = photos.length >= MAX_PHOTOS;
  const warnFull = useCallback(() => setNotice(fullMessage), []);

  return {
    photos: enriched,
    lists,
    loaded,
    analyzingCount,
    addFiles,
    removePhoto,
    removeAll,
    overrideVerdict,
    keepOnlyInGroup,
    notice,
    isFull,
    warnFull,
    maxPhotos: MAX_PHOTOS,
  };
}
