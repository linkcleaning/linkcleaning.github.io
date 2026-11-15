/* 링크 앱 스타일 가이드(라이트) 기준으로, 앱 코드에 남아 있는 색 이름을 밝은 바탕용 색으로 다시 매핑 */
const ink = '#14262A', muted = '#56676A', brand = '#0E5A60', accent = '#D9691F', leaf = '#3F8F2E', danger = '#C0392B';
module.exports = {
  content: ['./src/**/*.tsx'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans KR"', '"Apple SD Gothic Neo"', 'system-ui', 'sans-serif'],
        num: ['"Black Han Sans"', '"IBM Plex Sans KR"', 'system-ui', 'sans-serif'],
      },
      colors: {
        slate: { 50: ink, 100: ink, 200: '#22373b', 300: '#3d5054', 400: muted, 500: '#7a888a', 600: '#9aa6a7' },
        amber: { 50: ink, 100: '#3d5054', 200: brand, 300: brand, 400: '#0B4B50' },
        yellow: { 100: '#7a3c10', 200: '#9a4a12', 300: accent, 400: accent, 500: accent },
        orange: { 200: accent, 300: accent },
        emerald: { 50: '#255a1b', 100: '#255a1b', 200: '#2d6b21', 300: leaf, 400: leaf, 500: leaf },
        teal: { 300: brand },
        cyan: { 300: brand },
        sky: { 100: '#1d5f78', 200: '#1d5f78', 300: '#1f6f8b', 400: '#1f6f8b' },
        indigo: { 300: '#1f6f8b' },
        violet: { 200: '#5b3f93', 300: '#6b4fa3', 400: '#6b4fa3' },
        rose: { 100: '#a3281c', 200: '#a3281c', 300: danger, 400: danger, 500: danger, 900: danger },
      },
    },
  },
  plugins: [],
};
