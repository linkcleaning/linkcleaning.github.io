/* =====================================================================
   견적서 자동 작성 · 발급 모듈 + 문서 공용 도구(DocKit)
   - index.html 의 기본 스크립트(영수증) 다음에 불러옵니다.
   - 영수증 쪽 공용 함수/변수(profiles, prof, LS, num, won, esc, toast, today, showTab …)를 그대로 씁니다.
   - 청구서(invoice.js) · 계약서(contract.js)도 여기 있는 DocKit 을 같이 씁니다.
   ===================================================================== */
(function(){
const E$ = s => document.querySelector(s);

/* =================== 0. 공용 도구 (DocKit) =================== */
function korLegal(n){           // 1000000 → "일금 일백만원정"
  if(!n || n < 0) return '일금 영원정';
  const d = ['','일','이','삼','사','오','육','칠','팔','구'], u = ['','십','백','천'], big = ['','만','억','조'];
  let s = '', g = 0;
  while(n > 0){
    const part = n % 10000; n = Math.floor(n / 10000);
    if(part){ let p = '', x = part;
      for(let i = 0; i < 4 && x; i++){ const k = x % 10; if(k) p = d[k] + u[i] + p; x = Math.floor(x / 10); }
      s = p + big[g] + s; }
    g++;
  }
  return '일금 ' + s + '원정';
}
const krDate = d => { if(!d) return ''; const [y,m,dd] = d.split('-'); return `${y}년 ${+m}월 ${+dd}일`; };
const krDate2 = d => { if(!d) return ''; const [y,m,dd] = d.split('-'); return `${y}년 ${m}월 ${dd}일`; };
// 균등분할: 글자를 칸 폭에 양쪽 끝까지 고르게 배치 (HWP 배분 정렬과 같음)
const jl = s => `<span class="jl">${[...s.replace(/\s/g,'')].map(ch => `<i>${ch}</i>`).join('')}</span>`;
const signed = n => (n < 0 ? '-' : '') + won(Math.abs(n));

const exportBox = document.createElement('div'); exportBox.id = 'epExport'; document.body.appendChild(exportBox);
async function capture(html){
  await fontsReady;
  try{ await document.fonts.load('500 40px "Noto Serif KR"', '見積書계약청구'); }catch(e){}
  exportBox.innerHTML = `<div class="ep">${html}</div>`;
  const node = exportBox.firstChild;
  await Promise.all([...node.querySelectorAll('img')].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
  const cv = await html2canvas(node, { scale: 2.5, backgroundColor:'#fff', useCORS:true, logging:false });
  exportBox.innerHTML = '';
  return cv;
}
async function makePNG(html){ const cv = await capture(html); return new Promise(r => cv.toBlob(r, 'image/png')); }
async function makePDF(html){
  const cv = await capture(html);
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit:'mm', format:'a4', compress:true });
  const pageHpx = Math.floor(cv.width * 297 / 210);
  if(cv.height <= pageHpx * 1.35){                          // 조금 넘치면 한 장에 맞게 축소
    const w = Math.min(210, 297 * cv.width / cv.height);
    pdf.addImage(cv.toDataURL('image/jpeg', 0.95), 'JPEG', (210 - w) / 2, 0, w, w * cv.height / cv.width);
    return pdf.output('blob');
  }
  for(let y = 0, n = 0; y < cv.height; y += pageHpx, n++){   // 많이 길면 여러 장으로
    const h = Math.min(pageHpx, cv.height - y);
    const part = document.createElement('canvas'); part.width = cv.width; part.height = h;
    const c = part.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0,0,part.width,h); c.drawImage(cv, 0, -y);
    if(n) pdf.addPage();
    pdf.addImage(part.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, h * 210 / cv.width);
  }
  return pdf.output('blob');
}
function dl(blob, name){
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
async function share(blob, name, type, text){
  const f = new File([blob], name, { type });
  if(navigator.canShare && navigator.canShare({ files:[f] })){
    try{ await navigator.share({ files:[f], title:name, text }); return; }
    catch(e){ if(e.name === 'AbortError') return; }
  }
  dl(blob, name); toast('파일을 저장했습니다. 카톡에서 파일로 보내 주세요');
}
async function busy(btn, fn){
  const t = btn.textContent; btn.disabled = true; btn.textContent = '만드는 중…';
  try{ await fn(); } catch(e){ console.error(e); toast('만들기에 실패했습니다. 다시 시도해 주세요'); }
  finally{ btn.disabled = false; btn.textContent = t; }
}
function fitPreview(wrap, page){
  const s = wrap.clientWidth / 794;
  page.style.transform = `scale(${s})`;
  wrap.style.height = (page.scrollHeight * s) + 'px';
}
const safeName = s => (s || '').replace(/[\\/:*?"<>|\s]+/g, '_');
const stampImg = (cls = 'ep-stamp') => prof().stamp ? `<img class="${cls}" src="${prof().stamp}" alt="">` : '';

// 추가 탭 등록 (견적서·청구서·계약서)
const extraTabs = {};
const baseShowTab = showTab;
const histRenderers = [];
function switchCompany(id){
  if(id !== curPid && profiles.some(p => p.id === id)){ E$('#profileSel').value = id; E$('#profileSel').dispatchEvent(new Event('change')); }
}
showTab = function(tab){
  // '이케이 견적서' 탭 = 이케이클린 견적서, '견적서' 탭 = 링크클린(또는 그 밖의 회사) 견적서
  if(tab === 'ekest') switchCompany('ekclean');
  else if(tab === 'estimate' && curPid === 'ekclean') switchCompany('linkclean');
  const t = tab === 'ekest' ? 'estimate' : tab;
  Object.values(extraTabs).forEach(x => { x.sec.classList.add('hidden'); x.bar.classList.add('hidden'); });
  if(extraTabs[t]){
    document.querySelectorAll('nav.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    ['write','hist','settings'].forEach(x => E$('#tab-'+x).classList.add('hidden'));
    E$('#bar').classList.add('hidden');
    extraTabs[t].sec.classList.remove('hidden'); extraTabs[t].bar.classList.remove('hidden');
    extraTabs[t].onShow(); window.scrollTo(0,0);
    const nb = document.querySelector(`nav.tabs button[data-tab=${tab}]`); if(nb) nb.scrollIntoView({inline:'center', block:'nearest'});
    return;
  }
  baseShowTab(t);
  if(t === 'hist') histRenderers.forEach(f => f());
};

// 문서별 기록(기록 탭에 카드로 표시)
function makeHistory({ key, title, line, onOpen }){
  let list = LS.get(key, []);
  const card = document.createElement('div'); card.className = 'card';
  card.innerHTML = `<h2>${title}</h2><div></div>`;
  E$('#tab-hist').appendChild(card);
  const box = card.lastChild;
  function render(){
    if(!list.length){ box.innerHTML = '<p class="hint">아직 발행한 문서가 없습니다.</p>'; return; }
    box.innerHTML = list.map(h => { const l = line(h);
      return `<div class="hist" data-id="${h.id}"><div class="t"><b>${esc(l.t)}</b><span>${esc(l.s)}</span></div>
        <div class="m">${l.m ? '₩' + won(l.m) : ''}</div><button data-act="open">열기</button><button data-act="copy">복사</button></div>`; }).join('');
    box.querySelectorAll('button').forEach(b => b.onclick = () => {
      const h = list.find(x => x.id === b.closest('.hist').dataset.id);
      const d = JSON.parse(JSON.stringify(h)); const pid = d.pid; delete d.pid; delete d.ts;
      if(b.dataset.act === 'copy'){ d.id = null; d.date = today(); }
      if(pid && profiles.some(p => p.id === pid) && pid !== curPid){ E$('#profileSel').value = pid; E$('#profileSel').dispatchEvent(new Event('change')); }
      onOpen(d);
    });
  }
  histRenderers.push(render);
  return {
    save(doc){
      const rec = JSON.parse(JSON.stringify(doc)); rec.pid = curPid; rec.ts = Date.now();
      if(!rec.id) rec.id = doc.id = key + Date.now();
      list = [rec, ...list.filter(h => h.id !== rec.id)].slice(0, 300);
      LS.set(key, list);
    }
  };
}

// 회사 선택 상자(문서 탭 공용): 바꾸면 상단 회사 선택과 함께 바뀜
const companySelects = [], rerenders = [];
function companySelect(sel){
  companySelects.push(sel);
  sel.onchange = e => { E$('#profileSel').value = e.target.value; E$('#profileSel').dispatchEvent(new Event('change')); };
}
function fillCompanies(){
  companySelects.forEach(sel => sel.innerHTML = profiles.map(p => `<option value="${p.id}" ${p.id===curPid?'selected':''}>${esc(p.name||'(이름 없음)')}</option>`).join(''));
}
function refreshAll(){ fillCompanies(); rerenders.forEach(f => f()); }
E$('#profileSel').addEventListener('change', refreshAll);
['bizno','name','owner','addr','type','item','tel'].forEach(k => E$('#p_'+k).addEventListener('input', refreshAll));
E$('#stampFile').addEventListener('change', () => setTimeout(refreshAll, 500));
E$('#stampDel').addEventListener('click', () => setTimeout(refreshAll, 50));

// 하단 버튼 줄
function makeBar(id){
  const bar = document.createElement('div'); bar.className = 'bar hidden'; bar.id = id;
  bar.innerHTML = `<button class="btn" data-a="new">새로</button><button class="btn" data-a="png">이미지</button>
    <button class="btn" data-a="pdf">PDF</button><button class="btn pri" data-a="share">보내기</button>`;
  document.body.appendChild(bar);
  return bar;
}
// 하단 버튼 동작 연결
function wireBar(bar, { valid, html, file, text, save, reset }){
  const q = a => bar.querySelector(`[data-a=${a}]`);
  q('png').onclick   = e => valid() && busy(e.target, async () => { save(); await share(await makePNG(html()), file('png'), 'image/png', text()); });
  q('pdf').onclick   = e => valid() && busy(e.target, async () => { save(); dl(await makePDF(html()), file('pdf')); });
  q('share').onclick = e => valid() && busy(e.target, async () => { save(); await share(await makePDF(html()), file('pdf'), 'application/pdf', text()); });
  q('new').onclick   = () => { if(confirm('새로 작성할까요?')) reset(); };
}

window.DocKit = { korLegal, krDate, krDate2, signed, makePDF, makePNG, share, dl, busy, fitPreview, safeName, stampImg,
  addTab:(name, sec, bar, onShow) => extraTabs[name] = { sec, bar, onShow },
  makeHistory, companySelect, fillCompanies, makeBar, wireBar, onRerender: f => rerenders.push(f) };

/* =================== 1. 회사(공급자) 기본값 =================== */
// 이케이클린: 여성기업 확인서(2026.06.04 발급) 기준 정보, 도장은 대표 인감 이미지
const EK_STAMP = 'data:image/png;base64,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';
const EK_ADDR = '제주특별자치도 서귀포시 서호남로 91 104동 1203호 (서호동, 서귀포혁신사랑으로부영아파트)';
if(!profiles.some(p => p.id === 'ekclean')){
  profiles.push({ id:'ekclean', bizno:'104-41-09062', name:'이케이(EK)클린', owner:'이은경',
    addr:EK_ADDR, type:'서비스', item:'청소대행', tel:'064-763-4545', stamp:EK_STAMP });
} else {
  const ek = profiles.find(p => p.id === 'ekclean');
  if(!ek.bizno) ek.bizno = '104-41-09062';
  if(!ek.stamp) ek.stamp = EK_STAMP;
  if(ek.name === '이케이클린') ek.name = '이케이(EK)클린';
  if(!ek.addr || ek.addr === '제주특별자치도 서귀포시 서호남로 91') ek.addr = EK_ADDR;
}
LS.set('rc_profiles', profiles); fillProfileSel();

/* =================== 2. 견적서 상태 =================== */
const EST_PRESETS = ['입주청소','준공청소','이사청소','별장관리','유리창청소','폐기물처리','사무실청소','계단청소','외벽청소','후드청소','물탱크청소','장비대여료','노무비','재료비','회사이윤'];
const ROUNDS = { none:'없음', d1000:'천원 미만 절사', d10000:'만원 미만 절사', d100000:'십만원 미만 절사', u10000:'만원 단위로 올림', u100000:'십만원 단위로 올림' };
const LAYOUTS = { A:'見積書 (기본 양식)', B:'견적서 (공급자 오른쪽 배치형)', C:'견적서 (간단형, 하단 서명)' };
const newItem = (kind = 'item', name = '') => ({ kind, name, spec:'', qty: kind === 'group' ? '' : '1', price:'', note:'' });
const blankEst = () => ({ id:null, layout: LS.get('rc_est_layout', 'A'), date:today(), customer:'', site:'', title:'', vat:true, round:'none', scope:'',
  items:[ newItem() ] });
const draftKey = pid => 'rc_est_draft_' + pid;            // 회사마다 따로 작성 중인 견적 보관
let est = LS.get(draftKey(curPid), null) || LS.get('rc_est_draft', null) || blankEst();
est.items.forEach(it => { if(!it.kind) it.kind = 'item'; });
if(!est.layout) est.layout = 'A'; if(!est.round) est.round = 'none';

const amt    = it => it.kind === 'group' ? 0 : num(it.qty || 0) * num(it.price || 0);
const supply = () => est.items.reduce((s, it) => s + amt(it), 0);
const vatAmt = () => est.vat ? Math.round(supply() * 0.1) : 0;
const rawTotal = () => supply() + vatAmt();
function roundAdj(){
  const t = rawTotal();
  switch(est.round){
    case 'd1000':   return Math.floor(t/1000)*1000 - t;
    case 'd10000':  return Math.floor(t/10000)*10000 - t;
    case 'd100000': return Math.floor(t/100000)*100000 - t;
    case 'u10000':  return Math.ceil(t/10000)*10000 - t;
    case 'u100000': return Math.ceil(t/100000)*100000 - t;
    default: return 0;
  }
}
const grand = () => rawTotal() + roundAdj();

/* =================== 3. 화면(입력 폼) =================== */
const sec = document.createElement('section');
sec.id = 'tab-estimate'; sec.className = 'hidden';
sec.innerHTML = `
  <div class="card">
    <h2>회사 · 기본 정보</h2>
    <div class="row mb">
      <div><label>공급자(회사)</label><select id="e_company"></select></div>
      <div><label>양식</label><select id="e_layout">${Object.entries(LAYOUTS).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
    </div>
    <div class="row mb">
      <div><label>견적 날짜</label><input id="e_date" type="date"></div>
      <div><label>고객명 (수신)</label><input id="e_customer" placeholder="예) 서귀포보건소"></div>
    </div>
    <div class="mb"><label>현장 주소</label><input id="e_site" placeholder="예) 서귀포시 서호동 ○○아파트 101동"></div>
    <div><label>작업명</label><input id="e_title" placeholder="예) 4층 사무실 및 교육실 청소작업"></div>
  </div>
  <div class="card">
    <h2>품목</h2>
    <div class="chips" id="e_chips"></div>
    <div id="e_items"></div>
    <div class="row">
      <button class="btn" id="e_add">＋ 품목</button>
      <button class="btn" id="e_addGroup">＋ 묶음 제목</button>
    </div>
    <p class="hint">묶음 제목(예: 1. 노무비) 아래에 '세부' 품목을 넣으면 HWP 견적서처럼 들여쓰기로 나옵니다.</p>
    <label class="vatline"><input type="checkbox" id="e_vat"> 부가세 10% 포함</label>
    <div class="mb"><label>단수정리 (끝전 맞추기)</label><select id="e_round">${Object.entries(ROUNDS).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
    <table class="sumtbl">
      <tr><td>공급가액</td><td id="e_s1"></td></tr>
      <tr><td>부가세</td><td id="e_s2"></td></tr>
      <tr id="e_s4row"><td>단수정리</td><td id="e_s4"></td></tr>
      <tr class="big"><td>총 합계</td><td id="e_s3"></td></tr>
    </table>
    <div class="kor" id="e_kor" style="margin-top:4px"></div>
  </div>
  <div class="card">
    <h2>작업범위 · 특이사항</h2>
    <textarea id="e_scope" rows="4" placeholder="- 사무실 바닥 및 구석 청소&#10;- 작업인원 : 3명 (1일 소요)"></textarea>
  </div>
  <div class="card">
    <h2>미리보기 (A4)</h2>
    <div class="ep-wrap" id="e_wrap"><div class="ep" id="e_page"></div></div>
    <div style="height:10px"></div>
    <div class="row">
      <button class="btn" id="e_toReceipt">🧾 영수증으로</button>
      <button class="btn" id="e_toInvoice">📄 청구서로</button>
    </div>
  </div>`;
document.querySelector('main').appendChild(sec);
const bar = makeBar('barEst');
if(!E$('#specList')){ const dlst = document.createElement('datalist'); dlst.id = 'specList'; dlst.innerHTML = ['평','㎡','식','대','개','명','회','일','式'].map(s => `<option value="${s}">`).join(''); document.body.appendChild(dlst); }
companySelect(E$('#e_company'));

function bindEst(){
  fillCompanies();
  E$('#e_layout').value = est.layout; E$('#e_round').value = est.round;
  E$('#e_date').value = est.date; E$('#e_customer').value = est.customer; E$('#e_site').value = est.site;
  E$('#e_title').value = est.title; E$('#e_vat').checked = est.vat; E$('#e_scope').value = est.scope;
  renderItems(); estChanged();
}
[['e_date','date'],['e_customer','customer'],['e_site','site'],['e_title','title'],['e_scope','scope']].forEach(([id,k]) =>
  E$('#'+id).addEventListener('input', e => { est[k] = e.target.value; estChanged(); }));
E$('#e_vat').onchange = e => { est.vat = e.target.checked; estChanged(); };
E$('#e_round').onchange = e => { est.round = e.target.value; estChanged(); };
E$('#e_layout').onchange = e => { est.layout = e.target.value; LS.set('rc_est_layout', est.layout); estChanged(); };

E$('#e_chips').innerHTML = EST_PRESETS.map(n => `<button data-n="${n}">＋ ${n}</button>`).join('');
E$('#e_chips').querySelectorAll('button').forEach(b => b.onclick = () => {
  const empty = est.items.find(it => it.kind !== 'group' && !it.name && !it.price);
  let target;
  if(empty){ empty.name = b.dataset.n; target = empty; } else { target = newItem('item', b.dataset.n); est.items.push(target); }
  renderItems(); estChanged();
  const pr = document.querySelectorAll('#e_items .item')[est.items.indexOf(target)]?.querySelector('input[data-k=price]'); if(pr) pr.focus();
});
E$('#e_add').onclick = () => { est.items.push(newItem('item')); renderItems(); estChanged(); focusLast(); };
E$('#e_addGroup').onclick = () => { est.items.push(newItem('group')); renderItems(); estChanged(); focusLast(); };
const focusLast = () => { const ns = document.querySelectorAll('#e_items input[data-k=name]'); ns[ns.length-1].focus(); };

function renderItems(){
  const box = E$('#e_items'); box.innerHTML = '';
  est.items.forEach((it, i) => {
    const g = it.kind === 'group';
    const el = document.createElement('div'); el.className = 'item' + (it.kind === 'sub' ? ' sub' : '') + (g ? ' grp' : '');
    el.innerHTML = `<span class="num">${i+1}</span>
      ${est.items.length > 1 ? '<button class="del" aria-label="삭제">×</button>' : ''}
      <div class="row mb" style="margin-top:6px">
        <div style="flex:2.2"><label>${g ? '묶음 제목' : '품목명'}</label><input data-k="name" list="presetList" value="${esc(it.name)}" placeholder="${g ? '예) 노무비' : '버튼으로 고르거나 직접 입력'}"></div>
        <div style="flex:1"><label>종류</label><select data-k="kind">
          <option value="item" ${it.kind==='item'?'selected':''}>일반</option>
          <option value="group" ${g?'selected':''}>묶음 제목</option>
          <option value="sub" ${it.kind==='sub'?'selected':''}>세부</option></select></div>
      </div>
      ${g ? '' : `<div class="row mb">
        <div style="flex:1.4"><label>규격/평수</label><input data-k="spec" list="specList" value="${esc(it.spec)}" placeholder="예) 32평, ㎡, 식"></div>
        <div style="flex:1"><label>수량</label><input data-k="qty" value="${esc(it.qty)}" placeholder="예) 3명"></div>
      </div>
      <div class="row">
        <div style="flex:1.4"><label>단가</label><input data-k="price" value="${it.price ? won(num(it.price)) : ''}" inputmode="numeric" placeholder="0"></div>
        <div style="flex:1"><label>비고</label><input data-k="note" value="${esc(it.note)}"></div>
      </div>
      <div class="amt">공급가액 <b>${won(amt(it))}</b>원</div>`}`;
    el.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => {
      const k = inp.dataset.k;
      if(k === 'price'){ const raw = num(inp.value); inp.value = raw ? won(raw) : ''; it.price = raw ? String(raw) : ''; }
      else it[k] = inp.value;
      const ab = el.querySelector('.amt b'); if(ab) ab.textContent = won(amt(it));
      estChanged();
    }));
    el.querySelector('select').onchange = e => { it.kind = e.target.value; if(it.kind === 'group'){ it.price = ''; it.qty = ''; } else if(!it.qty) it.qty = '1'; renderItems(); estChanged(); };
    const del = el.querySelector('.del');
    if(del) del.onclick = () => { est.items.splice(i,1); renderItems(); estChanged(); };
    box.appendChild(el);
  });
}

let rt;
function estChanged(){
  E$('#e_s1').textContent = won(supply()) + '원';
  E$('#e_s2').textContent = est.vat ? won(vatAmt()) + '원' : '별도';
  E$('#e_s4row').style.display = est.round === 'none' ? 'none' : '';
  E$('#e_s4').textContent = signed(roundAdj()) + '원';
  E$('#e_s3').textContent = '₩' + won(grand());
  E$('#e_kor').textContent = korLegal(grand());
  LS.set(draftKey(curPid), est);
  clearTimeout(rt); rt = setTimeout(renderEst, 80);
}

/* =================== 4. 견적서 양식 (HTML 템플릿 3종) =================== */
// 표 줄 만들기: 묶음/세부/일반 + 소계·부가세·단수정리
function estRows(){
  const filled = est.items.filter(it => it.name || num(it.price));
  const rows = []; let n = 0;
  filled.forEach(it => {
    if(it.kind === 'group') rows.push({ t:'grp', name:`${++n}. ${it.name}` });
    else if(it.kind === 'sub') rows.push({ t:'sub', name: it.name, it });
    else rows.push({ t:'item', name:`${++n}. ${it.name}`, it });
  });
  return { rows, n };
}
const cellQty = it => esc(it.qty || '');
const cellPrice = it => it.price ? won(num(it.price)) : '';

function layoutA(){
  const p = prof();
  const { rows, n } = estRows();
  const spaced = s => esc(s || '').split('').join(' ');
  const biz = esc((p.bizno || '').replace(/-/g, ' - '));
  const tel = esc((p.tel || '').replace(/-/g, ' - '));
  let k = n, body = '';
  rows.forEach(r => {
    if(r.t === 'grp') body += `<tr><td class="nm">${esc(r.name)}</td><td></td><td></td><td></td><td></td><td></td></tr>`;
    else body += `<tr><td class="nm ${r.t==='sub'?'subnm':''}">${esc(r.name)}</td><td class="num">${esc(r.it.spec)}</td><td class="num">${cellQty(r.it)}</td>
       <td class="num">${cellPrice(r.it)}</td><td class="num">${won(amt(r.it))}</td><td class="nt">${esc(r.it.note)}</td></tr>`;
  });
  const extra = (est.vat ? 2 : 0) + (est.round !== 'none' ? 1 : 0);
  for(let i = rows.length; i < Math.max(5, 9 - extra); i++) body += `<tr><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
  if(est.vat){
    body += `<tr class="sub"><td class="nm">소 계</td><td></td><td></td><td></td><td class="num">${won(supply())}</td><td></td></tr>
             <tr><td class="nm">${++k}. 부가세</td><td></td><td class="num">10%</td><td class="num">${won(supply())}</td><td class="num">${won(vatAmt())}</td><td></td></tr>`;
  }
  if(est.round !== 'none') body += `<tr><td class="nm">${++k}. 단수정리</td><td></td><td></td><td></td><td class="num">${signed(roundAdj())}</td><td></td></tr>`;
  body += `<tr class="tot"><td class="nm">총 합계</td><td></td><td></td><td></td><td class="num">₩${won(grand())}</td>
           <td class="nt" style="font-size:12.5px;font-weight:400">${est.vat ? '부가세 포함' : '부가세 별도'}</td></tr>`;
  return `
    <div class="ep-title">見積書</div>
    <div class="ep-to"><span>${esc(est.customer) || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}&nbsp; 귀하</span></div>
    <table class="ep-sup">
      <colgroup><col style="width:8%"><col style="width:26%"><col style="width:24%"><col style="width:18%"><col style="width:24%"></colgroup>
      <tr><th class="v" rowspan="5">공<br>급<br>자</th><th>사업자 등록 번호</th><td colspan="3">${biz}</td></tr>
      <tr><th>회 사 명</th><td>${esc(p.name)}</td><th style="letter-spacing:22px;padding-left:28px">대표</th>
          <td class="rel sp">${spaced(p.owner)}${stampImg()}</td></tr>
      <tr><th>사업장 소재지</th><td colspan="3" class="addr">${esc(p.addr)}</td></tr>
      <tr><th>사 업 종 류</th><td>${esc(p.type)}</td><th style="letter-spacing:22px;padding-left:28px">종목</th><td>${esc(p.item)}</td></tr>
      <tr><th>전 화 번 호</th><td colspan="3" class="l">${tel}</td></tr>
    </table>
    <table class="ep-info">
      <colgroup><col style="width:23%"><col></colgroup>
      <tr><th>${jl('작업명')}</th><td>${esc(est.title)}</td></tr>
      ${est.site ? `<tr><th>${jl('현장주소')}</th><td>${esc(est.site)}</td></tr>` : ''}
      <tr><th>${jl('견적합계금액')}</th><td class="amt">${korLegal(grand())} &nbsp;(₩${won(grand())})</td></tr>
      <tr><th>${jl('견적일자')}</th><td>${krDate(est.date)}</td></tr>
    </table>
    <table class="ep-items">
      <colgroup><col style="width:28%"><col style="width:9%"><col style="width:11%"><col style="width:14%"><col style="width:18%"><col style="width:20%"></colgroup>
      <thead><tr><th>구 분</th><th style="letter-spacing:3px">규 격</th><th style="letter-spacing:0;padding:0;font-size:14px">인원(수량)</th><th>단 가</th><th>금 액</th><th>비 고</th></tr></thead>
      <tbody>${body}</tbody>
    </table>
    <div class="ep-scope">${est.scope.trim() ? '작업범위\n' + esc(est.scope.trim()) : '작업범위'}</div>
    <div class="ep-foot">위와 같이 견적합니다.</div>`;
}

function layoutB(){            // 공급자 오른쪽 배치형 (견 적 서)
  const p = prof();
  const { rows } = estRows();
  let body = '';
  rows.forEach(r => {
    if(r.t === 'grp') body += `<tr><td class="l b">${esc(r.name)}</td><td></td><td></td><td></td><td></td><td></td></tr>`;
    else body += `<tr><td class="l ${r.t==='sub'?'subnm':''}">${esc(r.name.replace(/^\d+\.\s*/, ''))}</td><td>${esc(r.it.spec)}</td><td>${cellQty(r.it)}</td>
      <td class="r">${cellPrice(r.it)}</td><td class="r">${won(amt(r.it))}</td><td class="nt">${esc(r.it.note)}</td></tr>`;
  });
  if(est.vat) body += `<tr><td class="l">부가세</td><td></td><td></td><td></td><td class="r">${won(vatAmt())}</td><td></td></tr>`;
  if(est.round !== 'none') body += `<tr><td class="l">단수정리</td><td></td><td></td><td></td><td class="r">${signed(roundAdj())}</td><td></td></tr>`;
  const used = rows.length + (est.vat ? 1 : 0) + (est.round !== 'none' ? 1 : 0);
  for(let i = used; i < 14; i++) body += `<tr><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
  return `
    <div class="eb-title">견&nbsp;&nbsp;&nbsp;적&nbsp;&nbsp;&nbsp;서</div>
    <table class="eb-top">
      <colgroup><col style="width:38%"><col style="width:6%"><col style="width:15%"><col style="width:17%"><col style="width:10%"><col style="width:14%"></colgroup>
      <tr><td rowspan="5" class="eb-left">
          <div>${krDate2(est.date)}</div>
          <div class="eb-cust">${esc(est.customer) || '&nbsp;'} <small>귀하</small></div>
          <div>아래와 같이 견적합니다.</div></td>
        <th rowspan="5" class="v">공<br>급<br>자</th><th>등록번호</th><td colspan="3">${esc(p.bizno)}</td></tr>
      <tr><th>상 호 명</th><td colspan="3">${esc(p.name)}</td></tr>
      <tr><th>대 표 자</th><td class="rel">${esc(p.owner)}${stampImg('ep-stamp eb-stamp')}</td><th>전화</th><td>${esc(p.tel)}</td></tr>
      <tr><th>업&nbsp;&nbsp;&nbsp;태</th><td>${esc(p.type)}</td><th>종목</th><td>${esc(p.item)}</td></tr>
      <tr><th>주&nbsp;&nbsp;&nbsp;소</th><td colspan="3" class="sm">${esc(p.addr)}</td></tr>
    </table>
    <table class="eb-info">
      <colgroup><col style="width:22%"><col></colgroup>
      <tr><th>${jl('작업명')}</th><td>${esc(est.title)}${est.site ? ` <span class="sm">(${esc(est.site)})</span>` : ''}</td></tr>
      <tr class="gray"><th>${jl('합계금액')}</th><td><b>${korLegal(grand()).replace('일금 ', '')} (￦ ${won(grand())} )</b> ${est.vat ? '<span class="sm">부가세 포함</span>' : '<span class="sm">부가세 별도</span>'}</td></tr>
    </table>
    <table class="eb-items">
      <colgroup><col style="width:28%"><col style="width:10%"><col style="width:10%"><col style="width:15%"><col style="width:18%"><col style="width:19%"></colgroup>
      <thead><tr><th>품&nbsp;&nbsp;&nbsp;&nbsp;명</th><th>규 격</th><th>수 량</th><th>단 가</th><th>공 급 가 액</th><th>비 고</th></tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr><th>계</th><td colspan="4" class="r"><b>${won(grand())}</b></td><td></td></tr></tfoot>
    </table>
    <div class="eb-note"><div class="eb-noteh">특&nbsp;&nbsp;&nbsp;&nbsp;이&nbsp;&nbsp;&nbsp;&nbsp;사&nbsp;&nbsp;&nbsp;&nbsp;항</div>
      <div class="eb-notec">${esc(est.scope.trim() || '')}</div></div>`;
}

function layoutC(){            // 간단형, 하단 서명 (견적서)
  const p = prof();
  const { rows, n } = estRows();
  let k = n, body = '';
  rows.forEach(r => {
    if(r.t === 'grp') body += `<tr><td class="l b">${esc(r.name)}</td><td></td><td></td><td></td><td></td></tr>`;
    else body += `<tr><td class="l ${r.t==='sub'?'subnm':''}">${esc(r.name)}</td><td>${esc(r.it.spec)}</td><td>${cellQty(r.it)}</td>
      <td class="r">${cellPrice(r.it)}</td><td class="r">${won(amt(r.it))}</td></tr>`;
  });
  if(est.vat) body += `<tr><td class="l">${++k}. 부가세</td><td></td><td></td><td></td><td class="r">${won(vatAmt())}</td></tr>`;
  if(est.round !== 'none') body += `<tr><td class="l">${++k}. 단수정리</td><td></td><td></td><td></td><td class="r">${signed(roundAdj())}</td></tr>`;
  const used = rows.length + (est.vat ? 1 : 0) + (est.round !== 'none' ? 1 : 0);
  for(let i = used; i < 12; i++) body += `<tr><td></td><td></td><td></td><td></td><td></td></tr>`;
  return `
    <div class="ec-title">견적서</div>
    <div class="ec-line">수&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;신 : ${esc(est.customer)} 귀하</div>
    <div class="ec-line">작업건명 : ${esc(est.title)}${est.site ? ` (${esc(est.site)})` : ''}</div>
    <table class="ec-items">
      <colgroup><col style="width:34%"><col style="width:12%"><col style="width:14%"><col style="width:18%"><col style="width:22%"></colgroup>
      <thead><tr><th>구분</th><th>규격</th><th>인원(수량)</th><th>단가</th><th>금액</th></tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr><th>합 계</th><td></td><td></td><td></td><td class="r"><b>${won(grand())}</b></td></tr>
        <tr><td colspan="5" class="ec-scope"><b>작업범위</b> ${esc(est.scope.trim())}</td></tr></tfoot>
    </table>
    <div class="ec-mid">위와 같이 견적합니다.</div>
    <div class="ec-date">${krDate2(est.date)}</div>
    <div class="ec-sign">
      <div>상&nbsp;&nbsp;&nbsp;&nbsp;호 : ${esc(p.name)}</div>
      <div>주&nbsp;&nbsp;&nbsp;&nbsp;소 : ${esc(p.addr)}</div>
      <div class="rel">대&nbsp;&nbsp;&nbsp;&nbsp;표 : ${esc(p.owner)} &nbsp;&nbsp;(인)${stampImg('ep-stamp ec-stamp')}</div>
      <div>전&nbsp;&nbsp;&nbsp;&nbsp;화 : ${esc(p.tel)}</div>
    </div>`;
}
const pageHTML = () => ({ A:layoutA, B:layoutB, C:layoutC }[est.layout] || layoutA)();

function renderEst(){
  E$('#e_page').innerHTML = pageHTML();
  if(!sec.classList.contains('hidden')) fitPreview(E$('#e_wrap'), E$('#e_page'));
}
window.addEventListener('resize', () => { if(!sec.classList.contains('hidden')) fitPreview(E$('#e_wrap'), E$('#e_page')); });
DocKit.onRerender(renderEst);
E$('#profileSel').addEventListener('change', () => { est = LS.get(draftKey(curPid), null) || blankEst(); est.items.forEach(it => { if(!it.kind) it.kind = 'item'; }); bindEst(); });

/* =================== 5. 내보내기 · 기록 =================== */
const estHist = makeHistory({ key:'rc_est_history', title:'견적서 기록',
  line: h => ({ t: h.customer || '(고객명 없음)', s: `${h.date} · ${h.title || h.items.map(i => i.name).filter(Boolean).join(', ')}`, m: h.total }),
  onOpen: d => { delete d.total; est = d; est.items.forEach(it => { if(!it.kind) it.kind = 'item'; }); est.layout = est.layout || 'A'; est.round = est.round || 'none'; bindEst(); showTab(curPid === 'ekclean' ? 'ekest' : 'estimate'); } });
function validEst(){
  if(!est.items.some(it => it.kind !== 'group' && it.name && num(it.price))){ toast('품목과 단가를 입력해 주세요'); return false; }
  return true;
}
wireBar(bar, {
  valid: validEst, html: pageHTML,
  file: ext => `견적서_${(est.date||'').replace(/-/g,'')}_${safeName(est.customer || '고객')}.${ext}`,
  text: () => `${prof().name} 견적서 (₩${won(grand())})`,
  save: () => { est.total = grand(); estHist.save(est); delete est.total; LS.set(draftKey(curPid), est); },
  reset: () => { est = blankEst(); bindEst(); window.scrollTo(0,0); }
});

/* 견적 → 영수증 / 청구서 */
E$('#e_toReceipt').onclick = () => {
  if(!validEst()) return;
  doc = blankDoc();
  doc.customer = est.customer; doc.date = today();
  doc.items = est.items.filter(it => it.kind !== 'group' && it.name && num(it.price)).map(it => ({ md:'', name:it.name, qty: String(num(it.qty) || 1), price:it.price }));
  if(est.vat) doc.items.push({ md:'', name:'부가세', qty:'1', price:String(vatAmt()) });
  if(roundAdj()) doc.items.push({ md:'', name:'단수정리', qty:'1', price:String(roundAdj()) });
  LS.set('rc_draft', doc); bindForm(); showTab('write'); toast('견적 내용으로 영수증을 만들었습니다');
};
E$('#e_toInvoice').onclick = () => {
  if(!validEst()) return;
  if(DocKit.openInvoiceFrom) DocKit.openInvoiceFrom({ title: est.title || est.items.filter(i => i.name).map(i => i.name).join(', '), amount: grand(), to: est.customer });
};

DocKit.addTab('estimate', sec, bar, () => { bindEst(); requestAnimationFrame(() => fitPreview(E$('#e_wrap'), E$('#e_page'))); });
bindEst();
})();
