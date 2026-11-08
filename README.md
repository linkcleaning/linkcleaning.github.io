# linkcleaning.github.io
## 버전 꼬리표 규칙
- 각 앱 `index.html`의 `<script src="/v.js" data-v="vN" defer></script>` 가 화면 왼쪽 아래에 아주 작게 버전을 표시함 (사장님 확인용).
- 앱을 고칠 때마다 `data-v` 숫자를 1 올리고, `sw.js`가 있으면 캐시 이름의 버전 숫자도 같이 올린다.
