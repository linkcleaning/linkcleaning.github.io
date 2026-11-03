/* =====================================================================
   계약서 모듈 — HWP '계약서'(별장관리 청소작업) 양식 재현
   estimate.js · invoice.js 다음에 불러옵니다. (DocKit 사용)
   ===================================================================== */
(function(){
const E$ = s => document.querySelector(s);
const K = DocKit;

const DEF_SCOPE = `- 주방 : 씽크대 정리 및 청소 작업
- 방 : 기본 침구 교체 및 청소 작업
- 화장실 : 가장 중요시 하며 처음처럼 청소 작업
- 그 외 구역 : 청소기 작업, 전체적으로 물걸레 작업
- 분리수거 작업, 침구류 세탁 작업`;
const DEF_ART1 = '“을”이 실시하는 별장 청소에 준하며, “갑”의 의사에 따라서 “을”이 성실하게 수행한다.';
const DEF_ARTS = `제4조(작업방법 및 손해배상)
① “을”은 청소세재를 각종 마감재에 피해가 없는 제품을 사용하여야 하며, 인체에도 무해한 세재를 사용한다.
② “을”은 청소작업으로 인하여 “갑” 또는 이용객에게 손해가 발생하는 경우 일체의 손해배상책임을 지며 “갑”의 재산을 안전하게 보호하며 작업하여야 한다.
제5조(부대비용)
① “갑”은 청소작업과 관련한 장비 및 종량제봉투의 구입비용을 부담하고, “을”에게 제공한다.
② “을”이 청소작업과 관련된 장비를 구입하게 되는 경우, 사전에 “갑”과 합의하여 구입하며, 합의되지 않은 구입 건에 대해서는 “갑”에게 비용을 청구할 수 없다.
③ “을”은 세탁물에 대한 청구금액을 월별로 합산하여 청구 한다.
제6조(청소실시일) : 청소 작업의 실시일은 “갑”이 “을”에게 통보(전화 또는 메신저)한 날로 한다.
제7조(인력관리)
① “을”은 소속 인력이 본 계약서에 명시된 청소작업 수칙과 통상의 안전수칙을 철저히 지키며 작업을 실시하도록 교육하여야 한다.
② “을”은 소속인력과 관련하여 발생하는 일체의 문제에 대하여 “갑”에게 책임을 묻지 않는다.
제8조(관례의 준용) : 본 계약에서 약정하지 못하였거나 아니한 사항은 일반적으로 인정되는 관례에 따라 “갑”과 “을”이 합의하여 결정한다.
제9조(계약서의 작성 및 보관) : 본 계약의 내용을 증명하기 위하여 “갑”과 “을”은 합의하에 계약서 2부를 작성하고 쌍방이 서명날인 후 각 1부씩 보관한다.
제10조(계약조건) : “갑”과 “을”은 사전에 상호협의 없이 계약을 일방적으로 파기할 수 없도록 한다.`;

const addYear = d => { const x = new Date(d); x.setFullYear(x.getFullYear() + 1); x.setDate(x.getDate() - 1); return x.toISOString().slice(0,10); };
const blank = () => ({ id:null, date:today(), aName:'', aAddr:'', aRep:'', work:'별장관리 청소작업', art1:DEF_ART1, scope:DEF_SCOPE,
  start:today(), end:addYear(today()), pay:'coupon', vat:true, count:'50', total:'', extra:'', monthly:'', payDay:'10', due:'', arts:DEF_ARTS });
let ct = LS.get('rc_ct_draft', null) || blank();

/* ---------- 화면 ---------- */
const sec = document.createElement('section'); sec.id = 'tab-contract'; sec.className = 'hidden';
sec.innerHTML = `
  <div class="card">
    <h2>계약 당사자</h2>
    <div class="row mb"><div><label>“을” (우리 회사)</label><select id="c_company"></select></div>
      <div><label>계약일</label><input id="c_date" type="date"></div></div>
    <div class="mb"><label>“갑” 상호</label><input id="c_aName" data-k="aName" placeholder="예) 멜콘 주식회사"></div>
    <div class="mb"><label>“갑” 주소</label><input id="c_aAddr" data-k="aAddr"></div>
    <div><label>“갑” 대표</label><input id="c_aRep" data-k="aRep" placeholder="예) 홍길동"></div>
  </div>
  <div class="card">
    <h2>작업 · 기간</h2>
    <div class="mb"><label>작업명</label><input id="c_work" data-k="work"></div>
    <div class="mb"><label>제1조 실시기준</label><textarea id="c_art1" data-k="art1" rows="2"></textarea></div>
    <div class="mb"><label>청소범위</label><textarea id="c_scope" data-k="scope" rows="5"></textarea></div>
    <div class="row"><div><label>계약 시작일</label><input id="c_start" data-k="start" type="date"></div>
      <div><label>계약 종료일</label><input id="c_end" data-k="end" type="date"></div></div>
  </div>
  <div class="card">
    <h2>대금</h2>
    <div class="seg mb" id="c_paySeg"><button data-v="coupon">쿠폰제(횟수)</button><button data-v="monthly">월정액</button><button data-v="lump">총액</button></div>
    <div id="c_pCoupon">
      <div class="row mb"><div><label>총 횟수</label><input id="c_count" data-k="count" inputmode="numeric"></div>
        <div><label>총 금액</label><input id="c_total" data-k="total" data-money="1" inputmode="numeric"></div></div>
      <div class="mb"><label>횟수 초과 시 1회 금액</label><input id="c_extra" data-k="extra" data-money="1" inputmode="numeric"></div>
    </div>
    <div id="c_pMonthly">
      <div class="row mb"><div><label>월 금액</label><input id="c_monthly" data-k="monthly" data-money="1" inputmode="numeric"></div>
        <div><label>매월 지급일</label><input id="c_payDay" data-k="payDay" inputmode="numeric" placeholder="10"></div></div>
    </div>
    <div id="c_pLump"><div class="mb"><label>총 계약금액</label><input id="c_total2" data-k="total" data-money="1" inputmode="numeric"></div></div>
    <div id="c_pDue" class="mb"><label>대금 지급 기한 (선납)</label><input id="c_due" data-k="due" type="date"></div>
    <label class="vatline"><input type="checkbox" id="c_vat"> 부가세 포함</label>
  </div>
  <div class="card">
    <h2>나머지 조항 (제4조~)</h2>
    <textarea id="c_arts" data-k="arts" rows="10"></textarea>
    <button class="btn" id="c_resetArts" style="margin-top:8px">기본 조항으로 되돌리기</button>
  </div>
  <div class="card">
    <h2>미리보기 (A4)</h2>
    <div class="ep-wrap" id="c_wrap"><div class="ep" id="c_page"></div></div>
  </div>`;
E$('main').appendChild(sec);
const bar = K.makeBar('barCt');
K.companySelect(E$('#c_company'));

function bind(){
  K.fillCompanies();
  E$('#c_date').value = ct.date;
  sec.querySelectorAll('[data-k]').forEach(el => { const v = ct[el.dataset.k] ?? ''; el.value = el.dataset.money ? (num(v) ? won(num(v)) : '') : v; });
  E$('#c_vat').checked = ct.vat;
  payUI(); changed();
}
E$('#c_date').addEventListener('input', e => { ct.date = e.target.value; changed(); });
sec.querySelectorAll('[data-k]').forEach(el => el.addEventListener('input', () => {
  const k = el.dataset.k;
  if(el.dataset.money){ const n = num(el.value); el.value = n ? won(n) : ''; ct[k] = n ? String(n) : '';
    sec.querySelectorAll(`[data-k=${k}]`).forEach(o => { if(o !== el) o.value = el.value; }); }
  else ct[k] = el.value;
  if(k === 'start' && ct.start){ ct.end = addYear(ct.start); E$('#c_end').value = ct.end; }
  changed();
}));
E$('#c_vat').onchange = e => { ct.vat = e.target.checked; changed(); };
E$('#c_resetArts').onclick = () => { ct.arts = DEF_ARTS; E$('#c_arts').value = ct.arts; changed(); };
sec.querySelectorAll('#c_paySeg button').forEach(b => b.onclick = () => { ct.pay = b.dataset.v; payUI(); changed(); });
function payUI(){
  sec.querySelectorAll('#c_paySeg button').forEach(b => b.classList.toggle('on', b.dataset.v === ct.pay));
  E$('#c_pCoupon').classList.toggle('hidden', ct.pay !== 'coupon');
  E$('#c_pMonthly').classList.toggle('hidden', ct.pay !== 'monthly');
  E$('#c_pLump').classList.toggle('hidden', ct.pay !== 'lump');
  E$('#c_pDue').classList.toggle('hidden', ct.pay === 'monthly');
}
let t;
function changed(){ LS.set('rc_ct_draft', ct); clearTimeout(t); t = setTimeout(render, 100); }

/* ---------- 양식 ---------- */
const kd = d => d ? K.krDate2(d) : '____년 __월 __일';
function payArticles(){
  const p = prof(), vat = ct.vat ? '부가세 포함' : '부가세 별도';
  const acct = p.account ? `\n   (${(p.bank || '').replace(/\s*은행$/, '')} : ${p.account} 예금주-${p.holder || p.owner})` : '';
  const months = ct.start && ct.end ? Math.round((new Date(ct.end) - new Date(ct.start)) / 2629800000) : 0;
  const span = months === 12 ? '1년간' : '계약기간 동안';
  if(ct.pay === 'monthly') return [
    `① 대금은 월 ${won(num(ct.monthly))}원(${vat})으로 한다.`,
    `② “갑”은 매월 ${num(ct.payDay) || '__'}일까지 해당 월의 대금을 “을”의 대표자 명의의 계좌로 송금한다.${acct}`,
    `③ 계약 범위를 벗어나는 추가 작업은 “갑”과 “을”이 협의하여 별도 금액으로 정한다.`];
  if(ct.pay === 'lump') return [
    `① 계약금액은 총 ${won(num(ct.total))}원(${vat})으로 한다.`,
    `② 대금의 지급은 선납제로 하며 본 계약서 작성이 완료된 후 “갑”은 ${kd(ct.due)}까지 “을”의 대표자 명의의 계좌로 송금한다.${acct}`];
  return [
    `① 대금은 쿠폰제이며, ${span} ${num(ct.count) || '__'}회(${won(num(ct.total))}원, ${vat})로 한다.`,
    `② 횟수가 초과될 시 1회(￦${won(num(ct.extra))}, ${vat})금액으로 한다.`,
    `③ 횟수가 남을 시 계약기간 갱신 또는 남은 경우 기간이 차감될 때까지 자동이월 된다.`,
    `④ 대금의 지급은 선납제로 하며 “을”과의 본 계약서 작성이 완료된 후 “갑”은 ${kd(ct.due)}까지 “을”의 대표자 명의의 계좌로 송금한다.${acct}`];
}
function artsHTML(text){
  return text.split('\n').map(l => l.trim()).filter(Boolean).map(l =>
    /^제\d+조/.test(l) ? (m => m ? `<p class="art">${esc(m[1])} : <span style="font-weight:400">${esc(m[2])}</span></p>` : `<p class="art">${esc(l)}</p>`)(l.match(/^(제\d+조\([^)]*\))\s*:\s*(.+)$/)) : /^[①-⑳]/.test(l) ? `<p class="ind">${esc(l)}</p>` : `<p>${esc(l)}</p>`).join('');
}
function pageHTML(){
  const p = prof();
  const months = ct.start && ct.end ? Math.round((new Date(ct.end) - new Date(ct.start)) / 2629800000) : 0;
  return `<div class="ct">
    <div class="ct-title">계 약 서</div>
    <p>&nbsp;${esc(ct.aName || '__________')}(이하 “갑”이라 함)와 ${esc(p.name)}(이하 “을”이라 함)은 ${esc(ct.work)}에 대하여 아래와 같은 조건으로 계약을 체결한다.</p>
    <p class="art">제1조(실시기준) : <span style="font-weight:400">${esc(ct.art1)}</span></p>
    ${ct.scope.trim() ? `<div class="ct-box"><b>청소범위</b>\n${esc(ct.scope.trim())}</div>` : ''}
    <p class="art">제2조(계약기간) : <span style="font-weight:400">본 계약의 유효기간은 ${months === 12 ? '연 계약으로 ' : ''}${kd(ct.start)}부터 ${kd(ct.end)}까지로 한다.</span></p>
    <p class="art">제3조(대금)</p>
    ${payArticles().map(l => `<p class="ind">${esc(l)}</p>`).join('')}
    ${artsHTML(ct.arts)}
    <div class="ct-date">${kd(ct.date)}</div>
    <div class="ct-sign">
      <div><div class="who">“갑”</div>
        <div>상&nbsp;&nbsp;&nbsp;호 : ${esc(ct.aName)}</div>
        <div>주&nbsp;&nbsp;&nbsp;소 : ${esc(ct.aAddr)}</div>
        <div>대&nbsp;&nbsp;&nbsp;표 : ${esc(ct.aRep)} &nbsp;&nbsp;(인)</div></div>
      <div><div class="who">“을”</div>
        <div>상&nbsp;&nbsp;&nbsp;호 : ${esc(p.name)}</div>
        <div>주&nbsp;&nbsp;&nbsp;소 : ${esc(p.addr)}</div>
        <div class="rel">대&nbsp;&nbsp;&nbsp;표 : ${esc(p.owner)} &nbsp;&nbsp;(인)${K.stampImg('ep-stamp ct-stamp')}</div></div>
    </div></div>`;
}
function render(){ E$('#c_page').innerHTML = pageHTML(); if(!sec.classList.contains('hidden')) K.fitPreview(E$('#c_wrap'), E$('#c_page')); }
K.onRerender(render);
window.addEventListener('resize', () => { if(!sec.classList.contains('hidden')) K.fitPreview(E$('#c_wrap'), E$('#c_page')); });

/* ---------- 내보내기 · 기록 ---------- */
const hist = K.makeHistory({ key:'rc_ct_history', title:'계약서 기록',
  line: h => ({ t: h.aName || '(갑 상호 없음)', s: `${h.date} · ${h.work}`, m: num(h.pay === 'monthly' ? h.monthly : h.total) }),
  onOpen: d => { ct = Object.assign(blank(), d); bind(); showTab('contract'); } });
K.wireBar(bar, {
  valid: () => { if(!ct.aName){ toast('“갑” 상호를 입력해 주세요'); return false; } return true; },
  html: pageHTML,
  file: ext => `계약서_${(ct.date||'').replace(/-/g,'')}_${K.safeName(ct.aName)}.${ext}`,
  text: () => `${prof().name} 계약서 (${ct.aName})`,
  save: () => hist.save(ct),
  reset: () => { ct = blank(); bind(); window.scrollTo(0,0); }
});

K.addTab('contract', sec, bar, () => { bind(); requestAnimationFrame(() => K.fitPreview(E$('#c_wrap'), E$('#c_page'))); });
bind();
})();
