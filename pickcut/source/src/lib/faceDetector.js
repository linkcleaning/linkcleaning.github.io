// ═════════════════════════════════════════════════════════════
// faceDetector.js — 눈 감음 감지 (Google MediaPipe Face Landmarker)
//
// 원리: 얼굴 모델이 표정 값(blendshape) 52가지를 0~1 점수로 알려줍니다.
//   그중 eyeBlinkLeft / eyeBlinkRight 가 '눈을 얼마나 감았는지' 입니다.
//   (0 = 활짝 뜸, 1 = 완전히 감음)
//
// 특징
//   - 사진은 서버로 보내지 않고 폰 안에서 분석합니다.
//   - 첫 사용 때만 모델 파일(약 4MB)을 내려받고, 이후엔 캐시를 씁니다.
//   - 모델을 못 불러오면(오프라인, 구형 폰 등) null을 돌려주고
//     앱은 눈 감음 검사만 건너뛴 채 정상 동작합니다.
// ═════════════════════════════════════════════════════════════

import { MODEL_TIMEOUT_MS, createWithFallback, getVision, withTimeout } from './mediapipeBase';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// 눈 감음 판정 기준: 양쪽 눈 평균이 이 값 이상이면 감은 것으로 봄
// 웃느라 눈이 작아진 사진이 '감음'으로 잡히면 0.6~0.65로 올리세요.
export const BLINK_THRESHOLD = 0.55;

// 너무 작은 얼굴(단체 사진 뒷줄 등)은 판정이 부정확해서 제외합니다.
// 사진 너비 대비 얼굴 너비 비율
const MIN_FACE_RATIO = 0.06;

let landmarkerPromise = null; // 모델은 앱 전체에서 한 번만 불러옴
let unavailable = false;      // 한 번 실패하면 매 사진마다 다시 시도하지 않음

/** 모델 불러오기 (처음 한 번만 실제로 실행됨) */
function getLandmarker() {
  if (unavailable) return Promise.resolve(null);
  if (!landmarkerPromise) {
    landmarkerPromise = withTimeout((async () => {
      // 공통 실행 파일은 mediapipeBase.js에서 한 번만 받아 함께 씀
      const { vision, fileset } = await getVision();
      return createWithFallback((delegate) =>
        vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: 'IMAGE',
          numFaces: 6,                 // 단체 사진도 최대 6명까지 확인
          outputFaceBlendshapes: true, // 표정 값(눈 깜빡임 포함) 받기
        })
      );
    })(), MODEL_TIMEOUT_MS, '눈 감음 모델').catch((err) => {
      console.warn('[픽컷] 눈 감음 모델을 불러오지 못해 이 검사는 건너뜁니다.', err);
      unavailable = true;
      return null;
    });
  }
  return landmarkerPromise;
}

/** 앱 시작 시 미리 불러두기(선택). 첫 사진 분석이 덜 기다려짐 */
export function preloadFaceModel() {
  getLandmarker();
}

/**
 * 사진 한 장에서 눈 감은 사람이 있는지 확인
 * @param {HTMLCanvasElement|HTMLImageElement} source
 * @returns {Promise<{hasFace:boolean, eyesClosed:boolean, faces:number, closedFaces:number} | null>}
 *   null = 모델을 쓸 수 없어 검사하지 못함
 */
export async function detectEyesClosed(source) {
  const landmarker = await getLandmarker();
  if (!landmarker) return null;

  let result;
  try {
    result = landmarker.detect(source);
  } catch (err) {
    console.warn('[픽컷] 얼굴 검사 중 오류', err);
    return null;
  }

  let faces = 0;
  let closedFaces = 0;
  result.faceLandmarks.forEach((landmarks, i) => {
    // 얼굴 크기 계산: 랜드마크 x좌표(0~1)의 최댓값 - 최솟값
    const xs = landmarks.map((p) => p.x);
    if (Math.max(...xs) - Math.min(...xs) < MIN_FACE_RATIO) return; // 너무 작은 얼굴은 무시

    const cats = result.faceBlendshapes[i]?.categories ?? [];
    const score = (name) => cats.find((c) => c.categoryName === name)?.score ?? 0;
    const blink = (score('eyeBlinkLeft') + score('eyeBlinkRight')) / 2;

    faces += 1;
    if (blink >= BLINK_THRESHOLD) closedFaces += 1;
  });

  return { hasFace: faces > 0, eyesClosed: closedFaces > 0, faces, closedFaces };
}
