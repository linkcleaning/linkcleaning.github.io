/* 캐시워크 느낌(노랑·검정·밝은 회색 바탕) 테마 — 앱 코드에 남아 있는 색 이름을 이 테마 색으로 다시 매핑 */
const ink = '#191919', muted = '#6B6E76', yellow = '#FFD233', green = '#14B86A', blue = '#2F7CF6', danger = '#F04438';
module.exports = {
  content: ['./src/**/*.tsx'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans KR"', '"Apple SD Gothic Neo"', 'system-ui', 'sans-serif'],
        num: ['"Noto Sans KR"', '"Apple SD Gothic Neo"', 'system-ui', 'sans-serif'],
      },
      colors: {
        cw: { DEFAULT: yellow, soft: '#FFF5CC', deep: '#F5B800' },
        slate: { 50: ink, 100: ink, 200: '#2B2C30', 300: '#45474D', 400: muted, 500: '#8E9199', 600: '#B0B3BA' },
        amber: { 50: ink, 100: '#45474D', 200: ink, 300: '#B07A00', 400: '#B07A00' },
        yellow: { 100: '#7a5200', 200: '#8a5d00', 300: '#FF8A00', 400: yellow, 500: yellow },
        orange: { 200: '#FF8A00', 300: '#FF8A00' },
        emerald: { 50: '#0B6B3D', 100: '#0B6B3D', 200: '#0E8A4F', 300: green, 400: green, 500: green },
        teal: { 300: ink },
        cyan: { 300: ink },
        sky: { 100: '#1E5BBF', 200: '#1E5BBF', 300: blue, 400: blue },
        indigo: { 300: blue },
        violet: { 200: '#6B3FD6', 300: '#7C4DFF', 400: '#7C4DFF' },
        rose: { 100: '#C2261A', 200: '#C2261A', 300: danger, 400: danger, 500: danger, 900: danger },
      },
    },
  },
  plugins: [],
};
