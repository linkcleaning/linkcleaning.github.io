// ═════════════════════════════════════════════════════════════
// similarity.js — 비슷한 사진 찾기 (MediaPipe Image Embedder)
//
// 원리: AI 모델이 사진을 보고 '무엇이 찍혔는지'를 숫자 1024개(지문)로 요약합니다.
//   두 사진의 지문이 가까울수록(코사인 유사도가 1에 가까울수록) 비슷한 사진입니다.
//   밝기 패턴만 보는 예전 방식과 달리, 각도·줌이 조금 달라도 같은 장면으로 알아봅니다.
//
// 모델을 못 쓰는 상황(오프라인 첫 실행 등)에서는 예전 방식(평균 해시)으로 자동 대체합니다.
// ═════════════════════════════════════════════════════════════
import { MODEL_TIMEOUT_MS, createWithFallback, getVision, withTimeout } from './mediapipeBase';
import { hashDistance } from './imageAnalysis';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite';

// 이 값 이상이면 '비슷한 사진'으로 묶음 (0~1)
//   너무 다른 사진까지 묶이면 → 0.88~0.9 로 올리기
//   같은 장면인데 따로 놀면  → 0.78~0.8 로 내리기
export const SIMILAR_THRESHOLD = 0.84;

// AI 지문이 없을 때 쓰는 예전 기준 (64칸 중 다른 칸 수)
const HASH_DISTANCE = 10;

let embedderPromise = null;
let unavailable = false;

function getEmbedder() {
  if (unavailable) return Promise.resolve(null);
  if (!embedderPromise) {
    embedderPromise = withTimeout((async () => {
      const { vision, fileset } = await getVision();
      return createWithFallback((delegate) =>
        vision.ImageEmbedder.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: 'IMAGE',
          l2Normalize: true, // 길이를 1로 맞춰두면 유사도 = 곱의 합(빠름)
          quantize: false,
        })
      );
    })(), MODEL_TIMEOUT_MS, '비슷한 사진 모델').catch((err) => {
      console.warn('[픽컷] 비슷한 사진 모델을 불러오지 못해 기본 방식으로 비교합니다.', err);
      unavailable = true;
      return null;
    });
  }
  return embedderPromise;
}

export function preloadSimilarityModel() {
  getEmbedder();
}

/**
 * 사진 1장의 AI 지문 만들기
 * @returns {Promise<Float32Array|null>} null = 모델을 쓸 수 없음
 */
export async function computeEmbedding(source) {
  const embedder = await getEmbedder();
  if (!embedder) return null;
  try {
    const result = embedder.embed(source);
    const vec = result.embeddings?.[0]?.floatEmbedding;
    return vec ? Float32Array.from(vec) : null;
  } catch (err) {
    console.warn('[픽컷] 지문 생성 오류', err);
    return null;
  }
}

/** 두 지문의 유사도 (길이가 1로 맞춰져 있으므로 곱의 합이 곧 코사인 유사도) */
export function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/** 두 사진이 비슷한지 판정: AI 지문이 둘 다 있으면 AI로, 아니면 예전 방식으로 */
export function isSimilar(p, q) {
  if (p.embedding && q.embedding && p.embedding.length === q.embedding.length) {
    return cosine(p.embedding, q.embedding) >= SIMILAR_THRESHOLD;
  }
  if (p.hash && q.hash) return hashDistance(p.hash, q.hash) <= HASH_DISTANCE;
  return false;
}

/**
 * 사진들을 비슷한 것끼리 묶기
 * 'A~B 비슷, B~C 비슷'이면 A·B·C를 한 묶음으로 봅니다(연결된 것끼리 묶음).
 * @param {Array} photos 분석이 끝난 사진들
 * @returns {Array<Array>} 묶음 목록. 각 묶음은 사진 배열 (1장짜리 묶음 포함)
 */
export function groupSimilar(photos) {
  // 각 사진이 어느 묶음 대표를 가리키는지 기록 (union-find 방식)
  const parent = photos.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));

  for (let i = 0; i < photos.length; i++) {
    for (let j = i + 1; j < photos.length; j++) {
      if (isSimilar(photos[i], photos[j])) parent[find(i)] = find(j);
    }
  }

  const groups = new Map();
  photos.forEach((p, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(p);
  });
  return [...groups.values()];
}
