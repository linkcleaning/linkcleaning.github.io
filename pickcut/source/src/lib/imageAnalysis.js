// ═════════════════════════════════════════════════════════════
// imageAnalysis.js — "스마트 컬링(Smart Culling)" 엔진
//
// 스마트 컬링 = 수십 장의 연사/여행 사진 중 실패작(흔들림, 눈 감음,
// 너무 어둡거나 밝음)을 자동으로 걸러내고 베스트 컷만 남기는 기능.
//
// 이 파일의 원칙
//   1) 서버 없이 '폰 안에서' 분석 → 사진이 외부로 나가지 않음(개인정보 안전)
//   2) 검사 항목마다 함수를 따로 둠 → 나중에 AI 모델로 하나씩 교체 가능
//   3) 모든 검사 결과는 0~100점으로 통일 → 합산·비교가 쉬움
// ═════════════════════════════════════════════════════════════

// 분석용으로 사진을 줄일 크기(긴 변 기준 px).
// 원본(4000px 이상)을 그대로 분석하면 폰이 느려지므로 작게 줄여서 봅니다.
const ANALYSIS_SIZE = 320;

import { detectEyesClosed } from './faceDetector';

// 판정 기준값. 실제 사진으로 테스트하며 조절하세요.
export const THRESHOLDS = {
  sharpBlurry: 35,   // 선명도 점수가 이보다 낮으면 '흔들림'
  tooDark: 25,       // 노출 점수 계산용: 평균 밝기(0~255)가 이보다 낮으면 너무 어두움
  tooBright: 230,    // 평균 밝기가 이보다 높으면 너무 밝음(날아감)
  bestScore: 70,     // 종합 점수가 이 이상이고 탈락 사유가 없으면 '베스트 컷'
};

/**
 * File(사용자가 고른 사진) → <img> 요소로 불러오기.
 * 브라우저 메모리 안에 임시 주소(blob URL)를 만들어 씁니다.
 */
export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * 사진을 작게 줄여 캔버스에 그린 뒤 '흑백 밝기 배열'로 바꿉니다.
 * 이후 모든 검사는 이 배열 하나로 계산합니다.
 */
function toGrayscale(img) {
  const scale = ANALYSIS_SIZE / Math.max(img.naturalWidth, img.naturalHeight);
  const w = Math.max(1, Math.round(img.naturalWidth * Math.min(1, scale)));
  const h = Math.max(1, Math.round(img.naturalHeight * Math.min(1, scale)));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);

  const { data } = ctx.getImageData(0, 0, w, h); // [R,G,B,A, R,G,B,A, ...]
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    // 사람 눈이 초록에 가장 민감하므로 가중치를 다르게 줍니다(표준 공식)
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return { gray, w, h };
}

/**
 * [검사 1] 선명도(흔들림) — '라플라시안 분산' 방식
 *
 * 원리: 선명한 사진은 경계(윤곽선)에서 밝기가 급격히 바뀝니다.
 * 각 픽셀과 상하좌우 이웃의 차이를 구해, 그 값들이 얼마나 들쭉날쭉한지(분산)를
 * 보면 됩니다. 흔들린 사진은 경계가 뭉개져서 분산이 작습니다.
 */
export function measureSharpness({ gray, w, h }) {
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = gray[i - w] + gray[i + w] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  const variance = sumSq / n - mean * mean;
  // 분산 값은 0~수천까지 퍼져 있어 로그로 눌러서 0~100점으로 바꿉니다.
  // (분산 10 ≈ 33점, 100 ≈ 67점, 1000 이상 ≈ 100점)
  return Math.max(0, Math.min(100, (Math.log10(variance + 1) / 3) * 100));
}

/**
 * [검사 2] 노출 — 평균 밝기가 적당한 범위(어둡지도 밝지도 않음)인지
 */
export function measureExposure({ gray }) {
  let total = 0;
  for (let i = 0; i < gray.length; i++) total += gray[i];
  const mean = total / gray.length; // 0(검정) ~ 255(흰색)

  // 가운데(128)에 가까울수록 100점, 양 끝으로 갈수록 감점
  const score = 100 - (Math.abs(mean - 128) / 128) * 100;
  return { mean, score: Math.max(0, Math.round(score)) };
}

/**
 * [검사 3] 눈 감음 감지 → faceDetector.js (MediaPipe 얼굴 모델)
 * 모델은 큰 사진이 필요 없으므로 긴 변 800px로 줄여서 넘깁니다(속도↑).
 */
export function toDetectCanvas(img) {
  const scale = Math.min(1, 800 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/**
 * 사진을 지정한 크기로 줄여 JPEG 파일(Blob)로 만듭니다.
 *   - 썸네일(격자용 400px): 원본 대신 띄워서 폰 메모리를 크게 아낌
 *   - 작업용 사본(2048px): 편집·저장용. 원본보다 훨씬 작아 수백 장도 저장 가능
 */
export function resizeToBlob(img, maxSize, quality = 0.85) {
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((resolve) => c.toBlob(resolve, 'image/jpeg', quality));
}

/**
 * 모든 검사를 실행하고 종합 판정을 내립니다.
 * 갤러리 화면은 이 함수 하나만 부르면 됩니다.
 *
 * @returns {{
 *   score: number,               // 종합 점수 0~100
 *   verdict: 'best'|'ok'|'reject',
 *   reasons: string[],           // 화면에 보여줄 이유 (예: '흔들림')
 *   metrics: object              // 디버그용 세부 점수
 * }}
 */
export async function analyzePhoto(img) {
  const grayData = toGrayscale(img);
  const sharpness = measureSharpness(grayData);
  const exposure = measureExposure(grayData);
  const eyes = await detectEyesClosed(toDetectCanvas(img)); // null = 검사 못 함

  const reasons = [];
  if (sharpness < THRESHOLDS.sharpBlurry) reasons.push('흔들림');
  if (exposure.mean < THRESHOLDS.tooDark) reasons.push('너무 어두움');
  if (exposure.mean > THRESHOLDS.tooBright) reasons.push('너무 밝음');
  if (eyes?.eyesClosed) reasons.push('눈 감음');

  // 가중치: 선명도가 가장 중요(60%), 노출 40%.
  // 새 검사(예: 구도, 표정)를 추가하면 여기 비율만 조정하세요.
  let score = Math.round(sharpness * 0.6 + exposure.score * 0.4);
  if (eyes?.eyesClosed) score = Math.min(score, 30); // 눈 감으면 다른 점수가 좋아도 탈락

  const verdict =
    reasons.length > 0 ? 'reject' : score >= THRESHOLDS.bestScore ? 'best' : 'ok';

  return {
    score,
    verdict,
    reasons,
    metrics: { sharpness: Math.round(sharpness), exposure: exposure.score, eyes },
  };
}

/**
 * 비슷한 장면 묶기용 '지문(해시)' — AI 모델을 못 쓸 때의 대체 방식
 *
 * 차이 해시(dHash): 사진을 가로 9 × 세로 8칸으로 줄인 뒤,
 * 각 칸이 오른쪽 칸보다 어두우면 1, 아니면 0 → 64자리 지문.
 * 밝기 '변화의 방향'을 보기 때문에, 하늘·벽처럼 전체 밝기 배치만 비슷한
 * 서로 다른 사진을 같은 사진으로 착각하는 일이 평균 해시보다 훨씬 적습니다.
 * (테스트: 같은 장면 0~1칸 차이, 다른 장면 17칸 이상 차이)
 */
export function averageHash(img) {
  const W = 9;
  const H = 8;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, W, H);
  const { data } = ctx.getImageData(0, 0, W, H);
  const lum = (x, y) => {
    const i = (y * W + x) * 4;
    return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  };
  let bits = '';
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W - 1; x++) bits += lum(x, y) < lum(x + 1, y) ? '1' : '0';
  }
  return bits;
}

export function hashDistance(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}
