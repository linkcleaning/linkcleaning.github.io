import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vercel에서 빌드하면 dist/ 로, 이 저장소에서 빌드하면 /dewalt 폴더(linkcleaning.github.io/dewalt)로 나감
const onVercel = !!process.env.VERCEL

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: onVercel ? 'dist' : '../../dewalt',
    emptyOutDir: true,
  },
})
