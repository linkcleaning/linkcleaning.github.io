// ─────────────────────────────────────────────────────────────
// Vite 설정 파일
// - react(): JSX를 브라우저가 이해하는 JS로 바꿔 줍니다.
// - tailwindcss(): Tailwind CSS v4 (설정 파일 없이 index.css의 @import 한 줄로 동작)
// - VitePWA(): 홈 화면 설치 + 오프라인 캐시(서비스 워커)를 자동으로 만들어 줍니다.
// ─────────────────────────────────────────────────────────────
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate', // 새 버전 배포 시 자동 업데이트
      includeAssets: ['icon.svg'],
      manifest: {
        name: '픽컷 PickCut - AI 사진 정리·편집',
        short_name: '픽컷',
        description: '베스트 컷만 골라주고, 말로 편집하는 AI 사진 앱',
        theme_color: '#121014',
        background_color: '#121014',
        display: 'standalone', // 주소창 없이 앱처럼 실행
        orientation: 'portrait',
        start_url: '/',
        icons: [
          // 실제 출시 전 192/512 PNG 아이콘을 public/ 폴더에 추가하세요.
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // 눈 감음 모델(약 4MB)과 실행 파일(wasm)을 한 번 받으면 폰에 보관
        // → 다음부터는 인터넷 없이도 눈 감음 검사가 됩니다.
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.hostname === 'storage.googleapis.com' ||
              url.href.includes('cdn.jsdelivr.net/npm/@mediapipe'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'face-model',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 90 }, // 90일
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
