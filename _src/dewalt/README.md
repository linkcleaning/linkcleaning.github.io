# 광주 디월트 AS · SNS 발행기 (PWA)

현장 사진·메모 → AI(Claude/Gemini 비전)가 인스타그램·스레드 글 2종 작성 → Meta Graph API로 동시 발행.
API가 없어도 복사·앱 열기·사진 공유로 바로 올릴 수 있음.

- 배포 주소: https://linkcleaning.github.io/dewalt/
- 연결 가이드: https://linkcleaning.github.io/dewalt/guide.html

## 폴더 구조

```
_src/dewalt/
├─ api/                    ← Vercel Serverless Functions (Vercel에 올렸을 때만 동작)
│  ├─ generate.ts          POST /api/generate  AI 글 생성
│  ├─ publish.ts           POST /api/publish   Meta API 1단계 대리 호출
│  └─ health.ts            GET  /api/health    서버 모드 확인
├─ shared/                 ← 서버와 휴대폰이 같이 쓰는 로직
│  ├─ types.ts
│  ├─ generate.ts          프롬프트·Claude/Gemini 호출·해시태그 정리
│  └─ meta.ts              인스타/스레드 컨테이너→상태확인→발행 순서
├─ src/
│  ├─ main.tsx · App.tsx · index.css
│  ├─ components/
│  │  ├─ Compose.tsx       ① 카테고리 ② 사진·영상 ③ 메모·옵션 → 결과·발행
│  │  ├─ History.tsx       게시물 기록(검색·필터·재활용)
│  │  ├─ SettingsView.tsx  매장정보·AI·인스타·스레드·Cloudinary·토큰 연장
│  │  └─ ui.tsx
│  └─ lib/
│     ├─ media.ts          사진 압축(1440px)·인스타 비율 여백·영상 썸네일
│     ├─ hosting.ts        Cloudinary / ImgBB 업로드 → 공개 URL
│     ├─ api.ts            서버 모드 ↔ 휴대폰 직접 모드 자동 전환
│     ├─ share.ts          복사·앱 열기·공유
│     └─ storage.ts        설정·기록 localStorage
├─ public/                 manifest.json · sw.js · 아이콘 · guide.html · v.js
├─ index.html · package.json · vite.config.ts · tsconfig.json · vercel.json
```

## 실행·빌드

```bash
npm install
npm run dev        # 개발 서버
npm run build      # 이 저장소 → ../../dewalt 로 출력 (GitHub Pages)
npm run typecheck
```

Vercel에서 빌드하면 자동으로 `dist/` 로 출력됨 (Root Directory: `_src/dewalt`).

## Vercel 환경변수 (선택)

| 이름 | 내용 |
|---|---|
| AI_API_KEY | Claude(sk-ant-…) 또는 Gemini 키 |
| IG_ACCESS_TOKEN | 인스타 장기 토큰 |
| THREADS_ACCESS_TOKEN | 스레드 장기 토큰 |

넣어 두면 앱 설정에서 키 칸을 비워도 됨. 계정 ID와 Cloudinary 값은 앱 설정에 입력.

## 버전

화면 왼쪽 아래 작은 `v1` — 고칠 때마다 `index.html`의 `data-v`와 `public/sw.js`의 캐시 이름 숫자를 같이 올리기.
