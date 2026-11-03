/* =====================================================================
   청구서 모듈 — HWP '청 구 서'(제주해양경찰청 식당 청소작업) 양식 재현
   estimate.js 다음에 불러옵니다. (DocKit 사용)
   ===================================================================== */
(function(){
const E$ = s => document.querySelector(s);
const K = DocKit;

/* ---------- 회사별 입금 계좌 목록 (여러 개 저장 → 골라 쓰기) ---------- */
const BANK_DEFAULT = { linkclean: [{ bank:'농협 은행', account:'351-0870-3486-93', holder:'한승우' }] };
const newId = () => 'a' + Date.now() + Math.floor(Math.random()*1000);
profiles.forEach(p => {
  if(!Array.isArray(p.accounts)){
    // 예전 방식(계좌 1개)에서 옮기기
    p.accounts = p.account ? [{ bank:p.bank || '', account:p.account, holder:p.holder || '' }] : (BANK_DEFAULT[p.id] || []).map(a => ({...a}));
    p.accounts.forEach(a => a.id = newId());
    delete p.bank; delete p.account; delete p.holder;
  }
});
LS.set('rc_profiles', profiles);
const accounts = () => prof().accounts || (prof().accounts = []);
const curAcct = () => accounts().find(a => a.id === iv.acctId) || accounts()[0] || null;
const acctLabel = a => `${a.bank} ${a.account} (${a.holder})`;

/* ---------- 상태 ---------- */
const blank = () => ({ id:null, date:today(), title:'', amount:'', to:'', memo:'', acctId:'' });
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
  </div>
  <div class="card">
    <h2>입금 계좌</h2>
    <div class="mb"><label>청구서에 넣을 계좌</label><select id="i_acct"></select></div>
    <div class="row">
      <button class="btn" id="i_acctAdd">＋ 계좌 추가</button>
      <button class="btn red" id="i_acctDel">이 계좌 삭제</button>
    </div>
    <div id="i_acctForm" class="hidden" style="margin-top:12px">
      <div class="row mb"><div><label>은행명</label><input id="i_nBank" placeholder="예) 농협 은행" list="bankList"></div>
        <div><label>예금주</label><input id="i_nHolder" placeholder="예) 한승우"></div></div>
      <div class="mb"><label>계좌번호</label><input id="i_nAcct" inputmode="numeric" placeholder="예) 351-0870-3486-93"></div>
      <div class="row"><button class="btn" id="i_nCancel">취소</button><button class="btn pri" id="i_nSave">계좌 저장</button></div>
    </div>
    <p class="hint">계좌는 회사(링크클린 / 이케이클린)마다 따로 저장됩니다. 상단에서 회사를 바꾸면 그 회사 계좌 목록이 나옵니다.</p>
  </div>
  <div class="card">
    <h2>미리보기 (A4)</h2>
    <div class="ep-wrap" id="i_wrap"><div class="ep" id="i_page"></div></div>
  </div>`;
E$('main').appendChild(sec);
const bar = K.makeBar('barInv');
if(!E$('#bankList')){ const dl = document.createElement('datalist'); dl.id = 'bankList';
  dl.innerHTML = ['농협 은행','제주 은행','국민 은행','신한 은행','우리 은행','하나 은행','기업 은행','카카오뱅크','토스뱅크','새마을금고','신협','우체국'].map(b => `<option value="${b}">`).join('');
  document.body.appendChild(dl); }
function fillAcct(){
  const list = accounts();
  E$('#i_acct').innerHTML = list.length ? list.map(a => `<option value="${a.id}">${esc(acctLabel(a))}</option>`).join('') : '<option value="">(저장된 계좌 없음 — 계좌 추가를 눌러 주세요)</option>';
  const c = curAcct(); if(c){ E$('#i_acct').value = c.id; iv.acctId = c.id; }
  E$('#i_acctDel').disabled = !list.length;
}
E$('#i_acct').onchange = e => { iv.acctId = e.target.value; changed(); };
E$('#i_acctAdd').onclick = () => { E$('#i_acctForm').classList.remove('hidden'); E$('#i_nHolder').value = prof().owner || ''; E$('#i_nBank').focus(); };
E$('#i_nCancel').onclick = () => { E$('#i_acctForm').classList.add('hidden'); };
E$('#i_nAcct').addEventListener('input', e => { e.target.value = e.target.value.replace(/[^\d-]/g, ''); });
E$('#i_nSave').onclick = () => {
  const bank = E$('#i_nBank').value.trim(), account = E$('#i_nAcct').value.trim(), holder = E$('#i_nHolder').value.trim();
  if(!bank || !account){ toast('은행명과 계좌번호를 입력해 주세요'); return; }
  const a = { id:newId(), bank, account, holder }; accounts().push(a); LS.set('rc_profiles', profiles);
  iv.acctId = a.id; ['i_nBank','i_nAcct','i_nHolder'].forEach(id => E$('#'+id).value = '');
  E$('#i_acctForm').classList.add('hidden'); fillAcct(); renderSetAccts(); changed(); toast('계좌를 저장했습니다');
};
E$('#i_acctDel').onclick = () => {
  const c = curAcct(); if(!c) return;
  if(!confirm(`'${acctLabel(c)}' 계좌를 삭제할까요?`)) return;
  prof().accounts = accounts().filter(a => a.id !== c.id); LS.set('rc_profiles', profiles);
  iv.acctId = ''; fillAcct(); renderSetAccts(); changed();
};
E$('#profileSel').addEventListener('change', () => { iv.acctId = ''; fillAcct(); changed(); });

/* ---------- 설정 탭: 입금 계좌 관리 (청구서 탭과 같은 목록) ---------- */
const setCard = document.createElement('div'); setCard.className = 'card';
setCard.innerHTML = `<h2>입금 계좌 <span id="s_acctCo" style="font-weight:500;color:var(--sub);font-size:12px"></span></h2>
  <div id="s_acctList"></div>
  <div class="row mb" style="margin-top:10px"><div><label>은행명</label><input id="s_nBank" placeholder="예) 농협 은행" list="bankList"></div>
    <div><label>예금주</label><input id="s_nHolder"></div></div>
  <div class="mb"><label>계좌번호</label><input id="s_nAcct" inputmode="numeric" placeholder="예) 351-0870-3486-93"></div>
  <button class="btn pri" id="s_nSave">＋ 입금 계좌 추가</button>
  <p class="hint">여기 저장한 계좌는 청구서 탭에서 골라 쓸 수 있습니다. 회사(링크클린 / 이케이클린)마다 따로 저장되니, 상단에서 회사를 먼저 고르세요.</p>`;
E$('#tab-settings').insertBefore(setCard, E$('#tab-settings').children[1]);
function renderSetAccts(){
  const list = accounts();
  E$('#s_acctCo').textContent = '· ' + (prof().name || '');
  E$('#s_nHolder').placeholder = prof().owner || '';
  E$('#s_acctList').innerHTML = list.length ? list.map(a => `<div class="hist" data-id="${a.id}"><div class="t"><b>${esc(a.bank)}</b><span>${esc(a.account)} · ${esc(a.holder)}</span></div><button data-act="del">삭제</button></div>`).join('')
    : '<p class="hint">저장된 계좌가 없습니다. 아래에서 추가해 주세요.</p>';
  E$('#s_acctList').querySelectorAll('button[data-act=del]').forEach(b => b.onclick = () => {
    const a = list.find(x => x.id === b.closest('.hist').dataset.id);
    if(!confirm(`'${acctLabel(a)}' 계좌를 삭제할까요?`)) return;
    prof().accounts = accounts().filter(x => x.id !== a.id); LS.set('rc_profiles', profiles);
    if(iv.acctId === a.id) iv.acctId = '';
    renderSetAccts(); fillAcct(); changed();
  });
}
E$('#s_nAcct').addEventListener('input', e => { e.target.value = e.target.value.replace(/[^\d-]/g, ''); });
E$('#s_nSave').onclick = () => {
  const bank = E$('#s_nBank').value.trim(), account = E$('#s_nAcct').value.trim(), holder = E$('#s_nHolder').value.trim() || prof().owner || '';
  if(!bank || !account){ toast('은행명과 계좌번호를 입력해 주세요'); return; }
  accounts().push({ id:newId(), bank, account, holder }); LS.set('rc_profiles', profiles);
  ['s_nBank','s_nAcct','s_nHolder'].forEach(id => E$('#'+id).value = '');
  renderSetAccts(); fillAcct(); changed(); toast('입금 계좌를 저장했습니다');
};
document.querySelector('nav.tabs button[data-tab=settings]').addEventListener('click', renderSetAccts);
E$('#profileSel').addEventListener('change', renderSetAccts);
K.companySelect(E$('#i_company'));

function bind(){
  K.fillCompanies();
  E$('#i_date').value = iv.date; E$('#i_title').value = iv.title; E$('#i_to').value = iv.to; E$('#i_memo').value = iv.memo;
  E$('#i_amount').value = iv.amount ? won(num(iv.amount)) : '';
  fillAcct(); changed();
}
[['i_date','date'],['i_title','title'],['i_to','to'],['i_memo','memo']].forEach(([id,k]) => E$('#'+id).addEventListener('input', e => { iv[k] = e.target.value; changed(); }));
E$('#i_amount').addEventListener('input', e => { const n = num(e.target.value); e.target.value = n ? won(n) : ''; iv.amount = n ? String(n) : ''; changed(); });

let t;
function changed(){ E$('#i_kor').textContent = iv.amount ? K.korLegal(num(iv.amount)) : ''; LS.set('rc_iv_draft', iv); clearTimeout(t); t = setTimeout(render, 80); }

/* ---------- 양식 ---------- */
function pageHTML(){
  const p = prof(), a = num(iv.amount);
  const A = curAcct() || { bank:'', account:'', holder:'' };
  const acct = esc((A.account || '').replace(/-/g, ' - '));
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
      <tr><th>은 행 명</th><td>${esc(A.bank)}</td></tr>
      <tr><th>계좌번호</th><td>${acct}</td></tr>
      <tr><th>예 금 주</th><td>${esc(A.holder)}</td></tr>
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
bind(); renderSetAccts();
})();
