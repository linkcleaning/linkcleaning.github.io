// ═════════════════════════════════════════════════════════════
// editEngine.js — 편집 명령(ops)을 실제 사진에 적용하는 엔진
//
// 핵심 원칙: '비파괴 편집'
//   원본은 절대 건드리지 않고, 매번 [원본 + 지금까지의 명령 전체]로 새로 그립니다.
//   → 되돌리기(Undo)가 간단하고, 화질이 누적해서 나빠지지 않습니다.
//
// 아이폰 사파리 호환을 위해 ctx.filter(일부 브라우저 미지원)를 쓰지 않고
// 픽셀 계산과 '축소→확대' 블러만 사용합니다.
// ═════════════════════════════════════════════════════════════

const MAX_EDIT_SIZE = 1600; // 편집 해상도(긴 변). 높이면 화질↑ 속도↓

/** 빈 캔버스 만들기 도우미 */
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * 블러(흐림) — 작게 줄였다가 다시 키우면 자연스럽게 뭉개지는 원리.
 * radius가 클수록 더 작게 줄여서 더 많이 흐려집니다.
 */
function blurCanvas(src, radius) {
  const { width: w, height: h } = src;
  const factor = Math.max(2, Math.round(radius)); // 몇 분의 1로 줄일지
  const small = makeCanvas(Math.max(1, Math.round(w / factor)), Math.max(1, Math.round(h / factor)));
  const sctx = small.getContext('2d');
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(src, 0, 0, small.width, small.height);

  // 두 단계로 키우면 계단 현상 없이 더 부드럽습니다
  const mid = makeCanvas(Math.round(w / 2), Math.round(h / 2));
  const mctx = mid.getContext('2d');
  mctx.imageSmoothingQuality = 'high';
  mctx.drawImage(small, 0, 0, mid.width, mid.height);

  const out = makeCanvas(w, h);
  const octx = out.getContext('2d');
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(mid, 0, 0, w, h);
  return out;
}

/**
 * 피사체 마스크 — ★ 확장 지점 ★
 * 흰색(불투명) = 피사체, 투명 = 배경 인 캔버스를 돌려줍니다.
 *
 * 지금은 '사진 중앙의 타원'을 피사체로 가정하는 근사 방식입니다
 * (대부분의 인물·음식 사진은 피사체가 가운데 있기 때문).
 * 정확한 누끼가 필요하면 MediaPipe Image Segmenter(브라우저 무료) 또는
 * 서버의 배경 제거 모델 결과로 이 함수의 내용만 교체하세요.
 *
 *   npm i @mediapipe/tasks-vision
 *   → ImageSegmenter(selfie_multiclass 모델) 실행
 *   → categoryMask에서 사람 픽셀만 흰색으로 칠한 캔버스를 반환
 */
export async function getSubjectMask(w, h /* , sourceCanvas */) {
  const mask = makeCanvas(w, h);
  const ctx = mask.getContext('2d');
  const r = Math.min(w, h) * 0.42;
  // 가로세로 비율에 맞춰 원을 타원으로 늘림
  ctx.translate(w / 2, h * 0.48);
  ctx.scale(w / Math.min(w, h), (h / Math.min(w, h)) * 1.1);
  const g = ctx.createRadialGradient(0, 0, r * 0.45, 0, 0, r);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)'); // 가장자리는 부드럽게 사라짐(티 안 나게)
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  return mask;
}

/** 마스크 모양대로 '앞 그림'을 '뒤 그림' 위에 합성 */
function compositeWithMask(background, foreground, mask) {
  const { width: w, height: h } = background;
  const fg = makeCanvas(w, h);
  const fctx = fg.getContext('2d');
  fctx.drawImage(foreground, 0, 0);
  fctx.globalCompositeOperation = 'destination-in'; // 마스크가 있는 곳만 남김
  fctx.drawImage(mask, 0, 0);

  const out = makeCanvas(w, h);
  const octx = out.getContext('2d');
  octx.drawImage(background, 0, 0);
  octx.drawImage(fg, 0, 0);
  return out;
}

/**
 * 색 보정(밝기·대비·채도·흑백·색온도·필름)을 픽셀 하나하나에 한 번에 적용.
 * 여러 명령을 한 바퀴에 처리해서 빠릅니다.
 */
function applyColorAdjust(canvas, adj) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;

  const bright = adj.brightness * 25;            // 밝기: 1단계당 +25
  const contrast = 1 + adj.contrast * 0.2;       // 대비: 1단계당 20%
  const sat = Math.max(0, 1 + adj.saturation * 0.3);
  const warm = adj.warmth * 14;                  // 색온도: 빨강↑ 파랑↓
  const vintage = Math.min(1, adj.vintage * 0.7);

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];

    // 밝기 → 대비(128 기준으로 벌리거나 좁힘)
    r = (r + bright - 128) * contrast + 128;
    g = (g + bright - 128) * contrast + 128;
    b = (b + bright - 128) * contrast + 128;

    // 채도: 회색값과의 거리를 늘리거나 줄임
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray + (r - gray) * sat;
    g = gray + (g - gray) * sat;
    b = gray + (b - gray) * sat;

    // 색온도
    r += warm;
    b -= warm;

    // 필름: 검정을 살짝 들어 올리고(물 빠진 느낌) 세피아 톤 섞기
    if (vintage > 0) {
      const sr = 0.393 * r + 0.769 * g + 0.189 * b;
      const sg = 0.349 * r + 0.686 * g + 0.168 * b;
      const sb = 0.272 * r + 0.534 * g + 0.131 * b;
      r = r * (1 - vintage * 0.5) + sr * vintage * 0.5 + 18 * vintage;
      g = g * (1 - vintage * 0.5) + sg * vintage * 0.5 + 12 * vintage;
      b = b * (1 - vintage * 0.5) + sb * vintage * 0.5 + 6 * vintage;
    }

    // 흑백
    if (adj.grayscale) {
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      r = g = b = y;
    }

    d[i] = r; d[i + 1] = g; d[i + 2] = b; // 0~255 밖 값은 브라우저가 자동으로 잘라줌
  }
  ctx.putImageData(img, 0, 0);
}

/** 선명하게(언샤프 마스크): 원본 + (원본 - 흐린본) × 강도 */
function applySharpen(canvas, amount) {
  const blurred = blurCanvas(canvas, 3);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const a = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const b = blurred.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  const k = 0.6 * amount;
  for (let i = 0; i < a.data.length; i += 4) {
    for (let c = 0; c < 3; c++) a.data[i + c] = a.data[i + c] + (a.data[i + c] - b[i + c]) * k;
  }
  ctx.putImageData(a, 0, 0);
}

/** 비네팅: 가장자리를 어둡게 해서 시선을 가운데로 */
function applyVignette(canvas, amount) {
  const { width: w, height: h } = canvas;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) / 2);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${Math.min(0.85, 0.45 * amount)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/**
 * ★ 메인 함수 ★ 원본 이미지 + 명령 목록 → 편집된 캔버스
 * 같은 종류 명령이 여러 번 오면 강도를 더합니다(예: 밝게 + 밝게 = 2단계).
 */
export async function renderEdits(img, ops) {
  // 1) 편집 해상도로 원본 그리기
  const scale = Math.min(1, MAX_EDIT_SIZE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  let canvas = makeCanvas(w, h);
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);

  // 2) 명령을 종류별로 합산
  const sum = (type) => ops.filter((o) => o.type === type).reduce((a, o) => a + o.amount, 0);
  const adj = {
    brightness: sum('brightness'),
    contrast: sum('contrast'),
    saturation: sum('saturation'),
    warmth: sum('warmth'),
    vintage: sum('vintage'),
    grayscale: ops.some((o) => o.type === 'grayscale'),
  };

  // 3) 색 보정 → 선명도 → 배경 처리 → 비네팅 순서 (순서가 결과에 영향)
  if (Object.values(adj).some(Boolean)) applyColorAdjust(canvas, adj);
  if (sum('sharpen') > 0) applySharpen(canvas, sum('sharpen'));

  const bgBlur = sum('bgBlur');
  const pop = sum('subjectPop');
  if (bgBlur > 0 || pop > 0) {
    const mask = await getSubjectMask(w, h, canvas);
    let background = canvas;
    if (bgBlur > 0) {
      // 사진 크기에 비례한 흐림 정도 (큰 사진은 더 많이 흐려야 같은 느낌)
      background = blurCanvas(canvas, (Math.max(w, h) / 90) * bgBlur);
    }
    if (pop > 0) {
      // 배경을 흑백 + 어둡게 해서 피사체만 살아 보이게
      const bg = makeCanvas(w, h);
      bg.getContext('2d').drawImage(background, 0, 0);
      applyColorAdjust(bg, { brightness: -1.2 * pop, contrast: 0, saturation: -3, warmth: 0, vintage: 0, grayscale: false });
      background = bg;
    }
    canvas = compositeWithMask(background, canvas, mask);
  }

  if (sum('vignette') > 0) applyVignette(canvas, sum('vignette'));
  return canvas;
}

/** 캔버스 → 화면 표시·저장용 blob 주소 */
export function canvasToUrl(canvas, quality = 0.92) {
  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(URL.createObjectURL(blob)), 'image/jpeg', quality)
  );
}
