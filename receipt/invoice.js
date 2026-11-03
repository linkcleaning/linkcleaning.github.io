/* =====================================================================
   청구서 모듈 — HWP '청 구 서'(제주해양경찰청 식당 청소작업) 양식 재현
   estimate.js 다음에 불러옵니다. (DocKit 사용)
   ===================================================================== */
(function(){
const E$ = s => document.querySelector(s);
const K = DocKit;

/* ---------- 회사별 입금 계좌 (설정 탭에 칸 추가) ---------- */
const BANK_DEFAULT = { linkclean: { bank:'농협 은행', account:'351-0870-3486-93', holder:'한승우' } };
profiles.forEach(p => { if(p.bank === undefined && BANK_DEFAULT[p.id]) Object.assign(p, BANK_DEFAULT[p.id]); });
LS.set('rc_profiles', profiles);

const bankCard = document.createElement('div'); bankCard.className = 'card';
bankCard.innerHTML = `<h2>입금 계좌 (청구서·계약서에 표시)</h2>
  <div class="row mb"><div><label>은행명</label><input id="p_bank" placeholder="예) 농협 은행"></div>
  <div><label>예금주</label><input id="p_holder"></div></div>
  <div><label>계좌번호</label><input id="p_account" inputmode="numeric"></div>`;
E$('#tab-settings').insertBefore(bankCard, E$('#tab-settings').children[1]);
const fillBank = () => ['bank','holder','account'].forEach(k => E$('#p_'+k).value = prof()[k] || '');
['bank','holder','account'].forEach(k => E$('#p_'+k).addEventListener('input', e => { prof()[k] = e.target.value; LS.set('rc_profiles', profiles); render(); }));
document.querySelector('nav.tabs button[data-tab=settings]').addEventListener('click', fillBank);
E$('#profileSel').addEventListener('change', fillBank);

/* ---------- 상태 ---------- */
const blank = () => ({ id:null, date:today(), title:'', amount:'', to:'', memo:'' });
let iv = LS.get('rc_iv_draft', null) || blank();

/* ---------- 화면 ---------- */
const sec = document.createElement('section'); sec.id = 'tab-invoice'; sec.className = 'hidden';
sec.innerHTML = `
  <div class="card">
    <h2>청구 내용</h2>
    <div class="row mb">
      <div><label>청구인(회사)</label><select id="i_company"></select></div>
      <div><label>청구 날짜</label><input id="i_date" type="date"></div>
    </div>
    <div class="mb"><label>품명</label><input id="i_title" placeholder="예) 제주해양경찰청 식당 청소작업"></div>
    <div class="mb"><label>청구 금액</label><input id="i_amount" inputmode="numeric" placeholder="0"></div>
    <div class="kor" id="i_kor" style="margin:-4px 0 10px"></div>
    <div class="mb"><label>수신인</label><input id="i_to" placeholder="예) 제주해양경찰청"></div>
    <div><label>추가 문구 (선택)</label><input id="i_memo" placeholder="예) 2025년 10월분"></div>
    <p class="hint">입금 계좌는 설정 탭의 '입금 계좌'에서 바꿀 수 있습니다.</p>
  </div>
  <div class="card">
    <h2>미리보기 (A4)</h2>
    <div class="ep-wrap" id="i_wrap"><div class="ep" id="i_page"></div></div>
  </div>`;
E$('main').appendChild(sec);
const bar = K.makeBar('barInv');
K.companySelect(E$('#i_company'));

function bind(){
  K.fillCompanies();
  E$('#i_date').value = iv.date; E$('#i_title').value = iv.title; E$('#i_to').value = iv.to; E$('#i_memo').value = iv.memo;
  E$('#i_amount').value = iv.amount ? won(num(iv.amount)) : '';
  changed();
}
[['i_date','date'],['i_title','title'],['i_to','to'],['i_memo','memo']].forEach(([id,k]) => E$('#'+id).addEventListener('input', e => { iv[k] = e.target.value; changed(); }));
E$('#i_amount').addEventListener('input', e => { const n = num(e.target.value); e.target.value = n ? won(n) : ''; iv.amount = n ? String(n) : ''; changed(); });

let t;
function changed(){ E$('#i_kor').textContent = iv.amount ? K.korLegal(num(iv.amount)) : ''; LS.set('rc_iv_draft', iv); clearTimeout(t); t = setTimeout(render, 80); }

/* ---------- 양식 ---------- */
function pageHTML(){
  const p = prof(), a = num(iv.amount);
  const acct = esc((p.account || '').replace(/-/g, ' - '));
  const tel = (p.tel || '').replace(/^(\d{2,3})-/, '($1) ').replace(/-/g, ' - ');
  return `<div class="iv">
    <div class="iv-title">청 구 서</div>
    <table class="iv-tbl">
      <tr><th>■&nbsp; 품&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;명</th><td>${esc(iv.title)}</td></tr>
      <tr><th>■&nbsp; 청 구 금 액</th><td>${a ? `${K.korLegal(a)} ( ￦${won(a)} )` : ''}</td></tr>
      <tr><th>■&nbsp; 수&nbsp;&nbsp;신&nbsp;&nbsp;&nbsp;인</th><td>${esc(iv.to)}</td></tr>
    </table>
    <div class="iv-msg">${iv.memo ? esc(iv.memo) + '<br>' : ''}위와 같이 청구하오니 아래 계좌에 입금하여 주시기 바랍니다.</div>
    <div class="iv-sub">- 계 좌 입 금 내 용 -</div>
    <table class="iv-bank">
      <tr><th>은 행 명</th><td>${esc(p.bank)}</td></tr>
      <tr><th>계좌번호</th><td>${acct}</td></tr>
      <tr><th>예 금 주</th><td>${esc(p.holder)}</td></tr>
    </table>
    <div class="iv-date">${K.krDate2(iv.date)}</div>
    <div class="iv-sign">
      <div class="who">위 청구인</div>
      <div>업체명 : ${esc(p.name)}</div>
      <div class="rel">대&nbsp;&nbsp;&nbsp;표 : ${esc(p.owner)} &nbsp;&nbsp;(인)${K.stampImg('ep-stamp iv-stamp')}</div>
      <div>주&nbsp;&nbsp;&nbsp;소 : ${esc(p.addr)}</div>
      <div>전&nbsp;&nbsp;&nbsp;화 : ${esc(tel)}</div>
    </div></div>`;
}
function render(){ E$('#i_page').innerHTML = pageHTML(); if(!sec.classList.contains('hidden')) K.fitPreview(E$('#i_wrap'), E$('#i_page')); }
K.onRerender(render);
window.addEventListener('resize', () => { if(!sec.classList.contains('hidden')) K.fitPreview(E$('#i_wrap'), E$('#i_page')); });

/* ---------- 내보내기 · 기록 ---------- */
const hist = K.makeHistory({ key:'rc_iv_history', title:'청구서 기록',
  line: h => ({ t: h.to || '(수신인 없음)', s: `${h.date} · ${h.title}`, m: num(h.amount) }),
  onOpen: d => { iv = d; bind(); showTab('invoice'); } });
K.wireBar(bar, {
  valid: () => { if(!iv.title || !num(iv.amount)){ toast('품명과 청구 금액을 입력해 주세요'); return false; } return true; },
  html: pageHTML,
  file: ext => `청구서_${(iv.date||'').replace(/-/g,'')}_${K.safeName(iv.to || '수신인')}.${ext}`,
  text: () => `${prof().name} 청구서 (₩${won(num(iv.amount))})`,
  save: () => hist.save(iv),
  reset: () => { iv = blank(); bind(); window.scrollTo(0,0); }
});

// 견적서에서 넘어올 때
K.openInvoiceFrom = ({ title, amount, to }) => {
  iv = blank(); iv.title = title; iv.amount = String(amount); iv.to = to;
  bind(); showTab('invoice'); toast('견적 내용으로 청구서를 만들었습니다');
};

K.addTab('invoice', sec, bar, () => { bind(); requestAnimationFrame(() => K.fitPreview(E$('#i_wrap'), E$('#i_page'))); });
bind();
})();
