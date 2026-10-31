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
import { computeEmbedding, isSimilar, preloadSimilarityModel } from '../lib/similarity';
import { readCaptureDate, tsToExif } from '../lib/exif';
import { deleteLibraryPhotos, getLibraryPhoto, isNative, listLibraryPhotos, requestPhotoAccess } from '../lib/nativeBridge';
import {
  clearPhotos,
  deletePhotos,
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
//   captured: { exif, offset, ts, source } | null  촬영 날짜 (사진 정보에서 읽음)
//   assetId: string | null   아이폰 앱에서 불러온 사진이면 사진첩 속 그 사진의 번호 (삭제할 때 사용)
// }
// '비슷한 사진' 기준값은 src/lib/similarity.js 의 SIMILAR_THRESHOLD 에서 조절

// ★ 앱이 한 번에 안정적으로 다룰 수 있는 최대 사진 수 ★
// 격자에는 작은 썸네일만 띄우고, 비슷한 사진 비교도 새 사진만 하도록 만들어 500장까지 다룹니다.
// 저장 용량은 사진 1장당 약 0.45MB → 500장 ≈ 230MB
// 비슷한 사진·제외된 사진을 정리하면 그만큼 자리가 생겨 더 올릴 수 있습니다.
// 오래된 폰에서 느리면 300 정도로 낮추세요.
export const MAX_PHOTOS = 500;

const THUMB_SIZE = 360;  // 격자용 (2열 격자 한 칸 ≈ 180pt × 2배 화면)
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
    captured: rec.captured ?? null, // 예전에 저장한 사진엔 없을 수 있음
    assetId: rec.assetId ?? null,
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
  // 최신 사진 목록을 버튼 동작(콜백) 안에서도 읽기 위한 장치
  const photosRef = useRef(photos);
  useEffect(() => {
    countRef.current = photos.length;
    photosRef.current = photos;
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

  /**
   * 사진 여러 장 추가 → 한도 확인 → 하나씩 분석·저장
   * 받는 것: ① 사진 파일(File) 목록  또는  ② 아이폰 앱에서 만든 항목
   *   { name, assetId, captured, getFile: () => Promise<File> }  (파일은 차례가 오면 그때 받아옴)
   */
  const addFiles = useCallback(async (fileList) => {
    const picked = Array.from(fileList)
      .map((x) => (x instanceof File ? { name: x.name, getFile: async () => x, isImage: x.type.startsWith('image/') } : x))
      .filter((it) => it.isImage !== false);
    if (picked.length === 0) return;

    // ① 남은 자리 계산
    const remaining = MAX_PHOTOS - countRef.current - pendingRef.current;
    if (remaining <= 0) {
      setNotice(fullMessage);
      return;
    }
    const items = picked.slice(0, remaining);
    const skipped = picked.length - items.length;
    if (skipped > 0) {
      setNotice(
        `한 번에 최대 ${MAX_PHOTOS}장까지 정리할 수 있어요. 앞의 ${items.length}장만 올리고 ${skipped}장은 제외했어요.`
      );
    }
    pendingRef.current += items.length;

    let unreadable = 0;
    for (const item of items) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const addedAt = Date.now();

      // ② 사진 받기 (앱에서 불러온 사진은 이때 사진첩에서 꺼내옴)
      let file;
      try {
        file = await item.getFile();
      } catch {
        pendingRef.current -= 1;
        unreadable += 1;
        continue;
      }

      // ③ 촬영 날짜: 앱이 알려준 날짜가 있으면 그것, 없으면 사진 정보(EXIF)에서 — 줄이기 전에 원본에서 읽어야 함
      const captured = item.captured ?? (await readCaptureDate(file));
      const assetId = item.assetId ?? null;

      // ④ 원본을 열어서 썸네일·작업용 사본 만들기
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

      // ⑤ 화면에 '분석 중'으로 바로 표시
      const photo = {
        id,
        name: item.name || file.name,
        addedAt,
        thumbUrl: URL.createObjectURL(thumb),
        url: URL.createObjectURL(work),
        status: 'analyzing',
        result: null,
        hash: null,
        embedding: null,
        captured,
        assetId,
      };
      remember(photo);
      pendingRef.current -= 1;
      countRef.current += 1;
      setPhotos((prev) => [...prev, photo]);

      // ⑥ 분석
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

      // ⑦ 폰 저장소에 저장 (실패해도 화면 사용엔 지장 없음)
      savePhoto({ id, name: photo.name, addedAt, thumb, work, result, hash, embedding, captured, assetId }).catch(
        (err) => {
          console.warn('[픽컷] 저장 실패(저장 공간 부족 등)', err);
          setNotice('폰 저장 공간이 부족해 일부 사진은 앱을 다시 열면 사라질 수 있어요.');
        }
      );

      // 다음 사진 분석 전에 브라우저가 화면을 그릴 틈을 줌(버벅임 방지)
      await new Promise((r) => setTimeout(r, 0));
    }

    if (unreadable > 0) {
      setNotice(`${unreadable}장은 열 수 없어서 건너뛰었어요.`);
    }
  }, []);

  /**
   * [아이폰 앱 전용] 사진첩에서 기간을 정해 바로 불러오기
   * @returns {Promise<{ found: number, added: number, already: number } | { denied: true }>}
   */
  const addFromLibrary = useCallback(
    async (fromTs, toTs) => {
      const perm = await requestPhotoAccess();
      if (!perm.granted) return { denied: true };

      const remaining = MAX_PHOTOS - countRef.current - pendingRef.current;
      const known = new Set(photosRef.current.map((p) => p.assetId).filter(Boolean));
      // 이미 불러온 사진은 건너뛰므로 넉넉히 받아온 뒤 거름
      const list = await listLibraryPhotos(fromTs, toTs, remaining + known.size + 50);
      const fresh = list.filter((a) => !known.has(a.id));
      const items = fresh.map((a) => ({
        name: a.filename,
        assetId: a.id,
        // 사진첩이 알려주는 촬영 시각 = 믿을 수 있는 날짜 (저장할 때 그대로 넣음)
        captured: { exif: tsToExif(a.creationTime), offset: null, ts: a.creationTime, source: 'library' },
        getFile: () => getLibraryPhoto(a, WORK_SIZE),
      }));
      addFiles(items); // 기다리지 않음 → 화면에서 진행 상황을 바로 볼 수 있게
      return { found: list.length, added: Math.min(items.length, Math.max(0, remaining)), already: list.length - fresh.length, access: perm.access };
    },
    [addFiles]
  );


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
   * 여러 장을 한 번에 지우기
   * @param {string[]} ids
   * @param {{ fromLibrary?: boolean }} opts
   *   fromLibrary = true (아이폰 앱에서만): 폰 사진첩에서도 진짜로 삭제
   *     → 아이폰이 "N장을 삭제할까요?" 확인 창을 띄움. 취소하면 아무것도 지우지 않음
   *     → 삭제된 사진은 사진 앱 '최근 삭제된 항목'에 30일 동안 남음
   *   fromLibrary = false: 픽컷 안에서만 지움 (폰 사진첩 원본은 그대로)
   * @returns {Promise<boolean>} 지웠으면 true, 취소·실패면 false
   */
  const removeMany = useCallback(async (ids, { fromLibrary = false } = {}) => {
    const del = new Set(ids);
    if (del.size === 0) return true;

    if (fromLibrary && isNative) {
      const assetIds = photosRef.current.filter((p) => del.has(p.id) && p.assetId).map((p) => p.assetId);
      let ok = false;
      try {
        ok = await deleteLibraryPhotos(assetIds);
      } catch (err) {
        setNotice(`사진첩에서 지우지 못했어요. (${err.message})`);
        return false;
      }
      if (!ok) {
        setNotice('삭제를 취소했어요. 아무것도 지우지 않았어요.');
        return false;
      }
    }

    setPhotos((prev) => prev.filter((p) => !del.has(p.id)));
    del.forEach(forget);
    deletePhotos([...del]).catch((err) => console.warn('[픽컷] 저장소에서 지우기 실패', err));
    return true;
  }, []);

  /** 사진 1장 지우기 */
  const removePhoto = useCallback((id, opts) => removeMany([id], opts), [removeMany]);

  /** 지운 뒤 안내 문구 */
  const doneMessage = (n, fromLibrary, what) =>
    fromLibrary && isNative
      ? `${what} ${n}장을 사진첩에서 삭제했어요. 사진 앱 '최근 삭제된 항목'에 30일 동안 남아 있어요.`
      : `${what} ${n}장을 정리했어요.`;

  /**
   * 비슷한 사진 묶음에서 '이 사진만 남기기'
   * 고른 사진은 베스트로 지정하고, 같은 묶음의 나머지는 앱에서 지웁니다 → 장수가 줄어듦
   */
  const keepOnlyInGroup = useCallback(
    async (groupIds, keepId, opts) => {
      const ok = await removeMany(groupIds.filter((id) => id !== keepId), opts);
      if (!ok) return false;
      setPhotos((prev) =>
        prev.map((p) => {
          if (p.id !== keepId || !p.result) return p;
          const result = { ...p.result, verdict: 'best', manual: true };
          updatePhoto(p.id, { result }).catch(() => {});
          return { ...p, result };
        })
      );
      return true;
    },
    [removeMany]
  );

  // ── 비슷한 사진 찾기 (빠른 방식) ──
  // 사진이 하나 추가될 때마다 '전부 대 전부'를 다시 비교하면 500장일 때 폰이 버벅입니다.
  // 그래서 비교 결과(누가 누구와 비슷한지)를 기억해 두고, 새로 분석된 사진만 기존 사진과 비교합니다.
  const similarRef = useRef(new Map()); // 사진 id → 비슷한 사진 id 모음

  const { enriched, groups } = useMemo(() => {
    const done = photos.filter((p) => p.status === 'done');
    const links = similarRef.current;
    const doneIds = new Set(done.map((p) => p.id));

    // 지워진 사진은 기억에서도 빼기
    for (const [id, set] of links) {
      if (!doneIds.has(id)) links.delete(id);
      else for (const other of set) if (!doneIds.has(other)) set.delete(other);
    }
    // 새로 분석된 사진만 기존 사진들과 비교
    const known = done.filter((p) => links.has(p.id));
    for (const p of done) {
      if (links.has(p.id)) continue;
      const mine = new Set();
      for (const q of known) {
        if (isSimilar(p, q)) {
          mine.add(q.id);
          links.get(q.id).add(p.id);
        }
      }
      links.set(p.id, mine);
      known.push(p);
    }

    // 연결된 것끼리 묶음 만들기 (A~B, B~C 비슷하면 A·B·C 한 묶음)
    const byId = new Map(done.map((p) => [p.id, p]));
    const seen = new Set();
    const groups = [];
    for (const p of done) {
      if (seen.has(p.id)) continue;
      const members = [];
      const stack = [p.id];
      seen.add(p.id);
      while (stack.length) {
        const id = stack.pop();
        members.push(byId.get(id));
        for (const next of links.get(id) || []) {
          if (!seen.has(next)) {
            seen.add(next);
            stack.push(next);
          }
        }
      }
      // 맨 앞 = 그 묶음의 1등: 사용자가 직접 고른 베스트 → 그다음 점수 높은 순
      const rank = (x) => (x.result.manual && x.result.verdict === 'best' ? 1000 : 0) + x.result.score;
      groups.push(members.sort((a, b) => rank(b) - rank(a)));
    }

    const bestIds = new Set();
    const groupOf = new Map(); // 사진 id → 묶음 번호
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

  /** 제외된 사진(흔들림·어두움·눈 감음 등) 전부 지우기 */
  const removeRejected = useCallback(
    async (opts) => {
      const ids = photosRef.current.filter((p) => p.result?.verdict === 'reject').map((p) => p.id);
      if (ids.length && (await removeMany(ids, opts))) setNotice(doneMessage(ids.length, opts?.fromLibrary, '제외된 사진'));
    },
    [removeMany]
  );

  /** 비슷한 사진 전부 정리: 묶음마다 1등만 남기고 나머지 지우기 */
  const cleanupSimilar = useCallback(
    async (opts) => {
      const extra = groups.filter((g) => g.length > 1).flatMap((g) => g.slice(1).map((p) => p.id));
      if (extra.length && (await removeMany(extra, opts)))
        setNotice(doneMessage(extra.length, opts?.fromLibrary, '비슷한 사진') + ' 묶음마다 베스트 1장만 남았어요.');
    },
    [groups, removeMany]
  );

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

    // 전체: 촬영한 순서대로 (촬영 날짜를 모르면 올린 순서)
    const when = (p) => p.captured?.ts ?? p.addedAt;
    const all = [...enriched].sort((a, b) => when(a) - when(b));

    // 정리하면 줄어드는 장수 (비슷한 사진 중 1등 아닌 것)
    const similarExtra = similar.reduce((n, g) => n + g.length - 1, 0);

    return { all, best, rejected, similar, similarExtra };
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
    addFromLibrary,
    cleanupSimilar,
    removeRejected,
    notice,
    isFull,
    warnFull,
    maxPhotos: MAX_PHOTOS,
  };
}
