// ═════════════════════════════════════════════════════════════
// exporter.js — 사진을 폰 밖으로 내보내기 (저장·공유)
//
// 폰: 공유 시트(navigator.share)를 엶 → 아이폰 '이미지 N개 저장', 카톡, 인스타 등
// PC 등 공유 시트가 없는 곳: 파일을 하나씩 다운로드
//
// ※ 아이폰 사파리는 '버튼을 누른 직후'에만 공유 시트를 열어줍니다.
//   사진을 만드는 데 시간이 걸리면 거부되므로, 화면에서는
//   [1단계 준비하기] → [2단계 저장하기] 두 번 누르는 방식으로 씁니다.
// ═════════════════════════════════════════════════════════════

import { stampCaptureDate } from './exif';
import { isNative, saveToLibrary } from './nativeBridge';

/**
 * 파일 이름 만들기
 *   촬영 날짜를 알면: pickcut_20261024_093105.jpg  (갤러리·폴더에서도 촬영 순서대로 정렬됨)
 *   모르면:          pickcut_20261030_01.jpg       (오늘 날짜 + 순번)
 */
export function exportFileName(index, captured) {
  if (captured?.exif) {
    const [d, t] = captured.exif.split(' ');
    return `pickcut_${d.replaceAll(':', '')}_${t.replaceAll(':', '')}.jpg`;
  }
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `pickcut_${ymd}_${String(index + 1).padStart(2, '0')}.jpg`;
}

/**
 * 내보낼 파일 완성: 촬영 날짜 정보를 다시 넣고 이름 붙이기
 * → 폰 갤러리에 저장해도 '오늘'이 아니라 '찍은 날'에 들어갑니다.
 * @param {Blob} jpeg      로고까지 합성된 사진
 * @param {object} photo   사진 객체 (photo.captured 사용)
 * @param {number} index   순번 (이름 겹침 방지용)
 * @param {Set<string>} [usedNames] 같은 묶음에서 이미 쓴 이름 (같은 초에 찍은 연사 대비)
 */
export async function makeExportFile(jpeg, photo, index, usedNames) {
  // 날짜를 '추정'(파일 수정 시각)으로만 알면 사진 정보에는 넣지 않음 → 틀린 날짜가 박히는 것 방지
  // 'exif' = 사진 정보에서 읽음, 'library' = 아이폰 사진첩이 알려준 촬영 시각 → 둘 다 믿을 수 있음
  const reliable = ['exif', 'library'].includes(photo?.captured?.source) ? photo.captured : null;
  const blob = reliable ? await stampCaptureDate(jpeg, reliable.exif, reliable.offset) : jpeg;

  let name = exportFileName(index, reliable);
  if (usedNames) {
    let n = 2;
    const base = name.replace(/\.jpg$/, '');
    while (usedNames.has(name)) name = `${base}_${n++}.jpg`;
    usedNames.add(name);
  }
  return new File([blob], name, { type: 'image/jpeg', lastModified: reliable?.ts ?? Date.now() });
}

/** 공유 시트로 여러 장을 보낼 수 있는지 */
export function canShareFiles(files) {
  try {
    return !!navigator.canShare?.({ files });
  } catch {
    return false;
  }
}

/**
 * 파일들 내보내기
 * @param {File[]} files
 * @returns {Promise<'shared'|'downloaded'|'cancelled'|'saved'>}
 */
export async function shareOrDownload(files) {
  // 아이폰 앱 안: 공유 창 대신 사진첩에 바로 저장
  if (isNative) {
    await saveToLibrary(files);
    return 'saved';
  }
  if (canShareFiles(files)) {
    try {
      await navigator.share({ files });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'; // 사용자가 공유 창을 닫음
      // 그 외 오류(파일이 너무 많음 등)는 다운로드로 대신함
    }
  }
  for (const file of files) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    await new Promise((r) => setTimeout(r, 350)); // 브라우저가 연속 다운로드를 막지 않게 간격
  }
  return 'downloaded';
}
