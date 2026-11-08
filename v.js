/* 앱 버전 꼬리표 — 화면 왼쪽 아래 아주 작게 (사장님 확인용). 사용: <script src="/v.js" data-v="v3" defer></script> */
(function () {
  var s = document.currentScript, v = s && s.getAttribute('data-v');
  if (!v) return;
  function add() {
    var e = document.createElement('div');
    e.textContent = v;
    e.setAttribute('aria-hidden', 'true');
    e.style.cssText = 'position:fixed;left:5px;bottom:2px;font:500 9px/1 system-ui,-apple-system,sans-serif;color:#888;opacity:.45;pointer-events:none;z-index:2147483647;letter-spacing:.02em;user-select:none;-webkit-user-select:none';
    document.body.appendChild(e);
  }
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
})();
