import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 빌드 결과는 저장소의 /threads 폴더로 바로 나감 (linkcleaning.github.io/threads)
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: '../../threads', emptyOutDir: true },
})
