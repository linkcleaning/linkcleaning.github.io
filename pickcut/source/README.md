# 픽컷 PickCut — 원본 코드

> 실제 앱 주소: **https://linkcleaning.github.io/pickcut/**
>
> 이 `source/` 폴더는 보관용 원본 코드입니다. 앱이 실제로 쓰는 파일은 한 단계 위(`pickcut/`)의
> `index.html`, `assets/`, `sw.js`, `manifest.webmanifest`, 아이콘들입니다.
>
> **수정·업데이트는 Claude에게 요청하세요.** Claude가 이 코드를 고쳐 다시 빌드한 뒤
> `pickcut/` 폴더를 교체해 올립니다. 폰에 설치된 앱은 다음에 열 때 자동으로 새 버전이 됩니다.

---

## 기획안 & 개발 가이드

> 베스트 컷만 골라주고, 말로 편집하는 AI 사진 PWA

## 1. 기획 배경 (2026 사진 앱 트렌드)

| 트렌드 | 사용자 불편 | 픽컷의 답 |
|---|---|---|
| **스마트 컬링** | 여행 한 번에 수백 장, 연사 10장 중 1장 고르기가 고역 | 흔들림·노출 불량 자동 제외 + 연사 묶음에서 1위만 추천 |
| **생성형/자연어 편집** | 슬라이더 20개(노출·하이라이트·섀도…)는 초보에게 외계어 | "배경 흐리게" 한 문장으로 편집, 음성도 가능 |
| **온디바이스 AI** | 사진을 서버로 보내는 것에 대한 거부감 | 분석·편집 모두 폰 안에서 처리 (기본값) |

**타깃**: 여행·육아·반려동물 사진을 많이 찍지만 정리·보정은 귀찮은 20~40대
**한 줄 가치**: "찍기만 하세요. 고르고 다듬는 건 픽컷이."

## 2. 핵심 화면

### 화면 1 — AI 스마트 갤러리
- 상단 요약: `32장 중 베스트 7장 · 제외 9장` + 분석 진행 막대
- 탭: **베스트 / 전체 / 제외됨** (세그먼트 컨트롤)
- 베스트 탭 1위는 가로 2칸 크게, 나머지 2열 격자
- 카드 표시: 판정 배지, 종합 점수, 제외 사유(흔들림·너무 어두움…), `연사 3장 중 1위`
- 베스트 컷에는 밀착 인화지에 그리스 펜슬로 친 듯한 빨간 동그라미
- 사진 탭 → 바텀 시트: 말로 편집하기 / 베스트 지정·해제 / 삭제
- AI 판정은 언제든 사용자가 뒤집을 수 있음 (✎ 표시)

### 화면 2 — 프롬프트 에디터
- 인스타그램 스토리 배치: 사진 전체 화면 + 하단 입력창 `[🎤][어떻게 바꿔볼까요?][↑]`
- 입력창 위 추천 문장 칩 (탭 한 번으로 실행)
- 상단에 적용된 편집이 칩으로 쌓이고, × 로 하나만 뺄 수 있음 (레이어처럼)
- 사진을 **꾹 누르면 원본 비교**, ↶ 되돌리기, 저장(폰에서는 공유 시트 → 사진 앱)

**지원 문장 (키워드 사전, 오프라인)**
배경 흐리게 · 피사체 분리/누끼 · 밝게/어둡게 · 대비 · 채도 · 흑백 · 따뜻하게/차갑게 · 필름/빈티지 · 선명하게 · 비네팅 · 원래대로
강도 표현: "아주/많이"(1.7배), "조금/살짝"(0.5배) · 여러 명령 연결: "배경 아주 흐리게 하고 살짝 밝게"

## 3. 기술 구조

```
src/
├─ App.jsx                      화면 전환 (갤러리 ↔ 에디터), 안드로이드 뒤로가기
├─ hooks/
│  ├─ usePhotoLibrary.js        사진 목록·분석 상태·연사 묶음·판정 수정
│  ├─ usePromptEditor.js        편집 기록(history)·되돌리기·저장(로고 포함)
│  └─ useWatermark.js           로고 설정 불러오기·저장
├─ lib/
│  ├─ imageAnalysis.js          스마트 컬링 엔진 (선명도·노출·연사 지문·썸네일 생성)
│  ├─ mediapipeBase.js          MediaPipe 공통 로더 (실행 파일 한 번만 받기)
│  ├─ faceDetector.js           눈 감음 감지 (MediaPipe Face Landmarker)
│  ├─ similarity.js             비슷한 사진 묶기 (MediaPipe Image Embedder)
│  ├─ watermark.js              로고·글자 워터마크 합성
│  ├─ exporter.js               공유 시트·다운로드로 내보내기
│  ├─ photoStore.js             사진·분석 결과 폰 저장 (IndexedDB)
│  ├─ promptParser.js           문장 → 편집 명령(ops) 변환
│  ├─ editEngine.js             ops → 실제 이미지 (비파괴 편집)
│  └─ samplePhotos.js           시연용 샘플 사진 8장 생성
└─ components/
   ├─ gallery/  SmartGallery · PhotoCard · PhotoActionSheet · SimilarGroups · ExportSheet
   ├─ settings/ WatermarkSheet
   └─ editor/   PromptEditor · PromptBar
```

**데이터 흐름**
```
사진 선택 → usePhotoLibrary.addFiles → imageAnalysis.analyzePhoto → 점수·판정 → 갤러리
문장 입력 → promptParser.parsePrompt → ops 배열 → history 추가 → editEngine.renderEdits(원본, 모든 ops) → 화면
```

**설계 원칙**
1. **교체 가능한 함수 경계**: AI 모델을 붙일 자리(`detectEyesClosed`, `getSubjectMask`, `parsePromptWithLLM`)를 미리 함수로 분리. 입력·출력 모양만 지키면 화면 코드는 수정 불필요.
2. **비파괴 편집**: 원본은 그대로, 매번 원본 + 전체 명령으로 다시 그림 → 되돌리기 간단, 화질 누적 손실 없음.
3. **아이폰 사파리 호환**: `ctx.filter` 대신 픽셀 계산·축소확대 블러 사용.

## 4. 현재 구현 수준 (정직한 체크리스트)

| 기능 | 상태 | 비고 |
|---|---|---|
| 흔들림 감지 | ✅ 실제 동작 | 라플라시안 분산 |
| 노출 불량 감지 | ✅ 실제 동작 | 평균 밝기 |
| 연사 묶음 → 1위 추천 | ✅ 실제 동작 | 평균 해시(aHash) |
| 눈 감음 감지 | ✅ 실제 동작 | MediaPipe Face Landmarker. 첫 사용 시 모델 약 4MB 다운로드, 이후 오프라인 가능. 사진은 폰 밖으로 안 나감 |
| 썸네일 | ✅ 실제 동작 | 격자는 400px, 편집은 2048px 사본 → 최대 200장 |
| 결과 저장 | ✅ 실제 동작 | IndexedDB. 앱을 다시 열어도 사진·판정 유지, '비우기'로 전체 삭제 |
| 최대 장수 제한 | ✅ | 200장 초과분은 받지 않고 안내 (`MAX_PHOTOS`) |
| 비슷한 사진 묶음 | ✅ 실제 동작 | AI 지문(Image Embedder, 약 4MB)으로 각도·줌이 달라도 묶음. 모델 없으면 평균 해시로 대체. '비슷한' 탭에서 비교 후 1장만 남기기 |
| 한꺼번에 내보내기 | ✅ | 베스트 탭 → 선택 해제 → 준비 → 저장·공유 (아이폰 공유 제한 때문에 2단계) |
| 로고 자동 삽입 | ✅ | 로고 PNG 또는 글자, 위치 4곳·크기 3단계·진하기 2단계. 내보내기와 편집 저장 모두 적용 |
| 색 보정 10종 | ✅ 실제 동작 | |
| 배경 흐림 / 피사체 분리 | ⚠️ 근사 | 중앙 타원을 피사체로 가정. MediaPipe Image Segmenter로 교체 시 정확한 누끼 |
| 자연어 해석 | ✅ 키워드 사전 | 못 알아들은 문장만 LLM으로 넘기는 구조 주석 포함 |
| 음성 입력 | ✅ 지원 브라우저에서 | Web Speech API |
| PWA 설치·오프라인 | ✅ | vite-plugin-pwa |

## 5. 다음 단계 로드맵

1. **인물 세그멘테이션** (이미 설치된 `@mediapipe/tasks-vision`의 ImageSegmenter): `editEngine.js`의 `getSubjectMask`만 교체 → 정확한 누끼·배경 흐림
2. **LLM 파서**: Cloudflare Workers에 `/api/parse-edit` 엔드포인트 → "하늘을 보라색으로" 같은 자유 문장 대응 (API 키는 서버에만)
3. **생성형 편집**: 지우개(물체 제거), 배경 교체, 하늘 교체 → 서버 측 이미지 생성 모델 호출 (유료 기능 후보)
4. **HEIC 지원**: 아이폰 원본 HEIC는 일부 브라우저에서 열리지 않음 → `heic2any` 변환 추가

## 6. 실행 방법

```bash
npm install
npm run dev      # 같은 와이파이의 폰에서 http://<PC IP>:5173 접속
npm run build    # dist/ 폴더 → Cloudflare Pages/Workers 등에 배포
```

## 7. 조절할 수 있는 값

| 파일 | 값 | 뜻 |
|---|---|---|
| `src/hooks/usePhotoLibrary.js` | `MAX_PHOTOS = 200` | 최대 장수. 오래된 폰은 100 권장 |
| `src/lib/imageAnalysis.js` | `THRESHOLDS.sharpBlurry = 35` | 높이면 흔들림 판정이 엄격해짐 |
| `src/lib/imageAnalysis.js` | `THRESHOLDS.bestScore = 70` | 높이면 베스트 컷이 줄어듦 |
| `src/lib/faceDetector.js` | `BLINK_THRESHOLD = 0.55` | 웃는 눈이 '감음'으로 잡히면 0.6~0.65로 |
| `src/lib/similarity.js` | `SIMILAR_THRESHOLD = 0.84` | 다른 사진까지 묶이면 올리고(0.88), 같은 장면이 안 묶이면 내리기(0.8) |

> `mediapipeBase.js`의 `MP_VERSION`은 `package.json`의 `@mediapipe/tasks-vision` 버전과 같아야 합니다.
