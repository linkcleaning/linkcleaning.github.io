// ═════════════════════════════════════════════════════════════
// watermark.js — 로고·글자 워터마크를 사진에 합성
//
// 사용처: 베스트 컷 한꺼번에 내보내기, 편집 화면 '저장'
// 설정 모양(기본값은 DEFAULT_WATERMARK 참고)
//   enabled  : 켜기/끄기
//   type     : 'image'(로고 그림) | 'text'(글자)
//   text     : 글자 워터마크 내용 (예: '링크클린')
//   position : 'br' 오른쪽 아래 | 'bl' 왼쪽 아래 | 'tr' 오른쪽 위 | 'tl' 왼쪽 위
//   size     : 's' | 'm' | 'l'  (사진 너비 대비 12% / 18% / 26%)
//   strength : 'solid' 진하게 | 'soft' 은은하게
// ═════════════════════════════════════════════════════════════

export const DEFAULT_WATERMARK = {
  enabled: false,
  type: 'text',
  text: '',
  position: 'br',
  size: 'm',
  strength: 'solid',
};

const SIZE_RATIO = { s: 0.12, m: 0.18, l: 0.26 };
const ALPHA = { solid: 0.92, soft: 0.55 };

/** 워터마크를 실제로 넣을 수 있는 상태인지 (켜져 있고 내용이 있음) */
export function isWatermarkActive(settings, logoImg) {
  if (!settings?.enabled) return false;
  return settings.type === 'image' ? !!logoImg : !!settings.text?.trim();
}

/**
 * 캔버스 위에 워터마크 그리기
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w,h  캔버스 크기
 * @param {object} settings
 * @param {HTMLImageElement|null} logoImg
 */
export function drawWatermark(ctx, w, h, settings, logoImg) {
  if (!isWatermarkActive(settings, logoImg)) return;

  const margin = Math.round(Math.min(w, h) * 0.035); // 가장자리 여백
  const targetW = w * (SIZE_RATIO[settings.size] ?? SIZE_RATIO.m);

  // 1) 그릴 크기 정하기
  let drawW;
  let drawH;
  let fontSize = 0;
  if (settings.type === 'image') {
    const ratio = logoImg.naturalHeight / logoImg.naturalWidth;
    drawW = targetW;
    drawH = targetW * ratio;
    if (drawH > h * 0.25) {
      // 세로로 긴 로고가 사진을 가리지 않게 높이 제한
      drawH = h * 0.25;
      drawW = drawH / ratio;
    }
  } else {
    // 글자 너비가 targetW가 되도록 글자 크기를 역산
    ctx.font = `700 100px "IBM Plex Sans KR", "Apple SD Gothic Neo", sans-serif`;
    const at100 = ctx.measureText(settings.text).width || 1;
    fontSize = Math.max(12, Math.min((targetW / at100) * 100, h * 0.08));
    ctx.font = `700 ${fontSize}px "IBM Plex Sans KR", "Apple SD Gothic Neo", sans-serif`;
    drawW = ctx.measureText(settings.text).width;
    drawH = fontSize;
  }

  // 2) 위치 정하기
  const right = settings.position.endsWith('r');
  const bottom = settings.position.startsWith('b');
  const x = right ? w - margin - drawW : margin;
  const y = bottom ? h - margin - drawH : margin;

  // 3) 그리기 (어떤 배경에서도 보이도록 옅은 그림자)
  ctx.save();
  ctx.globalAlpha = ALPHA[settings.strength] ?? ALPHA.solid;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = Math.max(2, drawH * 0.08);
  ctx.shadowOffsetY = Math.max(1, drawH * 0.03);
  if (settings.type === 'image') {
    ctx.drawImage(logoImg, x, y, drawW, drawH);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';
    ctx.fillText(settings.text, x, y);
  }
  ctx.restore();
}

/** 이미지 주소 → <img> */
function loadFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * 내보낼 파일 만들기: 사진 + (켜져 있으면) 워터마크 → JPEG Blob
 * @param {string} url 사진 주소 (편집용 사본 또는 편집 결과)
 */
export async function renderForExport(url, settings, logoImg) {
  const img = await loadFromUrl(url);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  drawWatermark(ctx, canvas.width, canvas.height, settings, logoImg);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
}
