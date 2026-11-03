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
showTab = function(t){
  Object.values(extraTabs).forEach(x => { x.sec.classList.add('hidden'); x.bar.classList.add('hidden'); });
  if(extraTabs[t]){
    document.querySelectorAll('nav.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    ['write','hist','settings'].forEach(x => E$('#tab-'+x).classList.add('hidden'));
    E$('#bar').classList.add('hidden');
    extraTabs[t].sec.classList.remove('hidden'); extraTabs[t].bar.classList.remove('hidden');
    extraTabs[t].onShow(); window.scrollTo(0,0);
    const nb = document.querySelector(`nav.tabs button[data-tab=${t}]`); if(nb) nb.scrollIntoView({inline:'center', block:'nearest'});
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
if(!profiles.some(p => p.id === 'ekclean')){
  profiles.push({ id:'ekclean', bizno:'', name:'이케이클린', owner:'이은경',
    addr:'제주특별자치도 서귀포시 서호남로 91', type:'서비스', item:'청소대행', tel:'064-763-4545', stamp:'' });
  LS.set('rc_profiles', profiles); fillProfileSel();
}

/* =================== 2. 견적서 상태 =================== */
const EST_PRESETS = ['입주청소','준공청소','이사청소','별장관리','유리창청소','폐기물처리','사무실청소','계단청소','외벽청소','후드청소','물탱크청소','장비대여료','노무비','재료비','회사이윤'];
const ROUNDS = { none:'없음', d1000:'천원 미만 절사', d10000:'만원 미만 절사', d100000:'십만원 미만 절사', u10000:'만원 단위로 올림', u100000:'십만원 단위로 올림' };
const LAYOUTS = { A:'見積書 (기본 양식)', B:'견적서 (공급자 오른쪽 배치형)', C:'견적서 (간단형, 하단 서명)' };
const newItem = (kind = 'item', name = '') => ({ kind, name, spec:'', qty: kind === 'group' ? '' : '1', price:'', note:'' });
const blankEst = () => ({ id:null, layout: LS.get('rc_est_layout', 'A'), date:today(), customer:'', site:'', title:'', vat:true, round:'none', scope:'',
  items:[ newItem() ] });
let est = LS.get('rc_est_draft', null) || blankEst();
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
  LS.set('rc_est_draft', est);
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
      <tr><th>사업장 소재지</th><td colspan="3">${esc(p.addr)}</td></tr>
      <tr><th>사 업 종 류</th><td>${esc(p.type)}</td><th style="letter-spacing:22px;padding-left:28px">종목</th><td>${esc(p.item)}</td></tr>
      <tr><th>전 화 번 호</th><td colspan="3" class="l">${tel}</td></tr>
    </table>
    <table class="ep-info">
      <colgroup><col style="width:23%"><col></colgroup>
      <tr><th>작 업 명</th><td>${esc(est.title)}</td></tr>
      ${est.site ? `<tr><th>현장 주소</th><td>${esc(est.site)}</td></tr>` : ''}
      <tr><th style="letter-spacing:4px">견적 합계 금액</th><td class="amt">${korLegal(grand())} &nbsp;(₩${won(grand())})</td></tr>
      <tr><th>견 적 일 자</th><td>${krDate(est.date)}</td></tr>
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
      <tr><th>작 업 명</th><td>${esc(est.title)}${est.site ? ` <span class="sm">(${esc(est.site)})</span>` : ''}</td></tr>
      <tr class="gray"><th>합 계 금 액</th><td><b>${korLegal(grand()).replace('일금 ', '')} (￦ ${won(grand())} )</b> ${est.vat ? '<span class="sm">부가세 포함</span>' : '<span class="sm">부가세 별도</span>'}</td></tr>
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

/* =================== 5. 내보내기 · 기록 =================== */
const estHist = makeHistory({ key:'rc_est_history', title:'견적서 기록',
  line: h => ({ t: h.customer || '(고객명 없음)', s: `${h.date} · ${h.title || h.items.map(i => i.name).filter(Boolean).join(', ')}`, m: h.total }),
  onOpen: d => { delete d.total; est = d; est.items.forEach(it => { if(!it.kind) it.kind = 'item'; }); est.layout = est.layout || 'A'; est.round = est.round || 'none'; bindEst(); showTab('estimate'); } });
function validEst(){
  if(!est.items.some(it => it.kind !== 'group' && it.name && num(it.price))){ toast('품목과 단가를 입력해 주세요'); return false; }
  return true;
}
wireBar(bar, {
  valid: validEst, html: pageHTML,
  file: ext => `견적서_${(est.date||'').replace(/-/g,'')}_${safeName(est.customer || '고객')}.${ext}`,
  text: () => `${prof().name} 견적서 (₩${won(grand())})`,
  save: () => { est.total = grand(); estHist.save(est); delete est.total; LS.set('rc_est_draft', est); },
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
