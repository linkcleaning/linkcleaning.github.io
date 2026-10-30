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

/** 파일 이름 만들기: pickcut_20261026_01.jpg */
export function exportFileName(index) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `pickcut_${ymd}_${String(index + 1).padStart(2, '0')}.jpg`;
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
 * @returns {Promise<'shared'|'downloaded'|'cancelled'>}
 */
export async function shareOrDownload(files) {
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
