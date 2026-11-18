/* 링크 공항 출발 안내판(FIDS) 공용 도구
 * FIDS.flap(el, text, delay) : 글자가 공항 안내판처럼 넘어가다 멈춤
 * FIDS.clock(dEl, tEl)       : 오른쪽 위 날짜·시계 (한국 시간)
 */
(function () {
  var LAT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', KO = '가나다라마바사아자차카타파하청소예약링크클린';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function flap(el, text, delay) {
    text = String(text == null ? '' : text);
    if (reduce || !text) { el.textContent = text; return; }
    if (el._fl) clearInterval(el._fl), clearTimeout(el._ft);
    var total = 9 + Math.floor(Math.min(text.length, 18) * 1.1), f = 0;
    el._ft = setTimeout(function () {
      el._fl = setInterval(function () {
        f++; var keep = Math.floor(f / total * text.length), out = '';
        for (var i = 0; i < text.length; i++) {
          var c = text[i];
          if (i < keep || /[\s·\/:.,()\-~]/.test(c)) out += c;
          else if (/[가-힣]/.test(c)) out += KO[Math.random() * KO.length | 0];
          else out += LAT[Math.random() * LAT.length | 0];
        }
        el.textContent = out;
        if (f >= total) { clearInterval(el._fl); el.textContent = text; }
      }, 55);
    }, delay || 0);
  }
  var MON = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
  function kst() { var n = new Date(Date.now() + 9 * 3600e3); return { y: n.getUTCFullYear(), mo: n.getUTCMonth(), d: n.getUTCDate(), h: n.getUTCHours(), mi: n.getUTCMinutes(), dow: n.getUTCDay() }; }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function clock(dEl, tEl) {
    function tick() { var k = kst(); dEl.textContent = MON[k.mo] + ' ' + k.d; tEl.textContent = p2(k.h) + ':' + p2(k.mi); }
    tick(); setInterval(tick, 10000);
  }
  window.FIDS = { flap: flap, clock: clock, kst: kst, p2: p2 };
})();
