// ═════════════════════════════════════════════════════════════
// mediapipeBase.js — MediaPipe 공통 준비물
// 눈 감음 감지(faceDetector)와 비슷한 사진 판별(similarity)이
// 같은 실행 파일(wasm)을 한 번만 받아서 함께 쓰도록 모아둔 곳입니다.
// ═════════════════════════════════════════════════════════════

// package.json의 @mediapipe/tasks-vision 버전과 반드시 같아야 합니다.
export const MP_VERSION = '0.10.14';
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;

let visionPromise = null;

/**
 * 라이브러리와 실행 파일 불러오기 (앱 전체에서 한 번만)
 * @returns {Promise<{ vision: object, fileset: object }>}
 */
export function getVision() {
  if (!visionPromise) {
    visionPromise = (async () => {
      // 필요할 때만 라이브러리를 불러옴 → 앱 첫 화면 로딩이 빨라짐
      const vision = await import('@mediapipe/tasks-vision');
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL);
      return { vision, fileset };
    })().catch((err) => {
      visionPromise = null;
      throw err;
    });
  }
  return visionPromise;
}

/**
 * GPU로 먼저 시도하고, 안 되는 폰이면 CPU로 다시 시도
 * @param {Function} create  (delegate) => Promise<모델>
 */
export async function createWithFallback(create) {
  try {
    return await create('GPU');
  } catch {
    return await create('CPU');
  }
}

/**
 * 정해진 시간 안에 끝나지 않으면 실패로 처리
 * 인터넷이 느려 모델 다운로드가 오래 걸려도 사진 분석이 멈추지 않게 합니다.
 * (실패하면 그 검사만 건너뛰고, 다음에 앱을 열 때 다시 시도)
 */
export function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} 시간 초과(${ms / 1000}초)`)), ms)),
  ]);
}

// 모델 준비를 기다리는 최대 시간 (느린 LTE 기준 약 4MB 다운로드 여유)
export const MODEL_TIMEOUT_MS = 20000;
