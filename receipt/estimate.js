/* =====================================================================
   견적서 자동 작성 · 발급 모듈
   - index.html 의 기본 스크립트(영수증) 다음에 불러옵니다.
   - 영수증 쪽 공용 함수/변수(profiles, prof, LS, num, won, esc, toast, today, showTab …)를 그대로 씁니다.
   ===================================================================== */
(function(){
const E$ = s => document.querySelector(s);

/* ---------- 1. 회사(공급자) 기본값: 링크클린 / 이케이클린 ---------- */
if(!profiles.some(p => p.id === 'ekclean')){
  profiles.push({ id:'ekclean', bizno:'', name:'이케이클린', owner:'이은경',
    addr:'제주특별자치도 서귀포시 서호남로 91', type:'서비스', item:'청소대행', tel:'064-763-4545', stamp:'' });
  LS.set('rc_profiles', profiles); fillProfileSel();
}

/* ---------- 2. 견적서 상태 ---------- */
const EST_PRESETS = ['입주청소','준공청소','이사청소','별장관리','유리창청소','폐기물처리','사무실청소','계단청소','외벽청소','에어컨청소','새집증후군','소독방역'];
const blankEst = () => ({ id:null, date:today(), customer:'', site:'', title:'', vat:true, scope:'',
  items:[{ name:'', spec:'', qty:'1', price:'', note:'' }] });
let est = LS.get('rc_est_draft', null) || blankEst();
let estHist = LS.get('rc_est_history', []);

const supply = () => est.items.reduce((s, it) => s + num(it.qty || 0) * num(it.price || 0), 0);
const vatAmt = () => est.vat ? Math.floor(supply() * 0.1) : 0;
const grand  = () => supply() + vatAmt();

// 한글 금액 (법정 표기: 일백, 일천 처럼 '일'을 붙임) → "일금 이백육십사만원정"
function korLegal(n){
  if(!n) return '일금 영원정';
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

/* ---------- 3. 화면(입력 폼) 만들기 ---------- */
const sec = document.createElement('section');
sec.id = 'tab-estimate'; sec.className = 'hidden';
sec.innerHTML = `
  <div class="card">
    <h2>회사 · 기본 정보</h2>
    <div class="mb"><label>공급자(회사)</label><select id="e_company"></select></div>
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
    <button class="btn" id="e_add">＋ 품목 직접 추가</button>
    <div style="height:12px"></div>
    <label class="vatline"><input type="checkbox" id="e_vat"> 부가세 10% 포함</label>
    <table class="sumtbl">
      <tr><td>공급가액</td><td id="e_s1"></td></tr>
      <tr><td>부가세</td><td id="e_s2"></td></tr>
      <tr class="big"><td>총 합계</td><td id="e_s3"></td></tr>
    </table>
    <div class="kor" id="e_kor" style="margin-top:4px"></div>
  </div>
  <div class="card">
    <h2>작업범위 · 특이사항</h2>
    <textarea id="e_scope" rows="4" placeholder="- 사무실 바닥 및 구석 청소&#10;- 싱크대 부근 및 조리대 상판"></textarea>
  </div>
  <div class="card">
    <h2>미리보기 (A4)</h2>
    <div class="ep-wrap" id="e_wrap"><div class="ep" id="e_page"></div></div>
    <div style="height:10px"></div>
    <button class="btn" id="e_toReceipt">🧾 이 견적으로 영수증 만들기</button>
  </div>`;
document.querySelector('main').appendChild(sec);

const bar = document.createElement('div');
bar.className = 'bar hidden'; bar.id = 'barEst';
bar.innerHTML = `<button class="btn" id="e_new">새로</button><button class="btn" id="e_png">이미지</button>
  <button class="btn" id="e_pdf">PDF</button><button class="btn pri" id="e_share">보내기</button>`;
document.body.appendChild(bar);
const exportBox = document.createElement('div'); exportBox.id = 'epExport'; document.body.appendChild(exportBox);

// 기록 탭에 견적서 기록 카드 추가
const histCard = document.createElement('div'); histCard.className = 'card';
histCard.innerHTML = `<h2>견적서 기록</h2><div id="estHistList"></div>`;
E$('#tab-hist').appendChild(histCard);

/* ---------- 4. 폼 ↔ 상태 연결 ---------- */
function fillCompany(){
  E$('#e_company').innerHTML = profiles.map(p => `<option value="${p.id}" ${p.id===curPid?'selected':''}>${esc(p.name||'(이름 없음)')}</option>`).join('');
}
E$('#e_company').onchange = e => { E$('#profileSel').value = e.target.value; E$('#profileSel').dispatchEvent(new Event('change')); };
E$('#profileSel').addEventListener('change', () => { fillCompany(); renderEst(); });
['bizno','name','owner','addr','type','item','tel'].forEach(k => E$('#p_'+k).addEventListener('input', () => { fillCompany(); renderEst(); }));
E$('#stampFile').addEventListener('change', () => setTimeout(renderEst, 400));

function bindEst(){
  fillCompany();
  E$('#e_date').value = est.date; E$('#e_customer').value = est.customer; E$('#e_site').value = est.site;
  E$('#e_title').value = est.title; E$('#e_vat').checked = est.vat; E$('#e_scope').value = est.scope;
  renderItems(); estChanged();
}
[['e_date','date'],['e_customer','customer'],['e_site','site'],['e_title','title'],['e_scope','scope']].forEach(([id,k]) =>
  E$('#'+id).addEventListener('input', e => { est[k] = e.target.value; estChanged(); }));
E$('#e_vat').onchange = e => { est.vat = e.target.checked; estChanged(); };

E$('#e_chips').innerHTML = EST_PRESETS.map(n => `<button data-n="${n}">＋ ${n}</button>`).join('');
E$('#e_chips').querySelectorAll('button').forEach(b => b.onclick = () => {
  const empty = est.items.find(it => !it.name && !it.price);
  if(empty) empty.name = b.dataset.n; else est.items.push({ name:b.dataset.n, spec:'', qty:'1', price:'', note:'' });
  renderItems(); estChanged();
  const idx = est.items.findIndex(it => it.name === b.dataset.n && !it.price);
  const pr = document.querySelectorAll('#e_items input[data-k=price]')[idx]; if(pr) pr.focus();
});
E$('#e_add').onclick = () => { est.items.push({ name:'', spec:'', qty:'1', price:'', note:'' }); renderItems(); estChanged();
  const ns = document.querySelectorAll('#e_items input[data-k=name]'); ns[ns.length-1].focus(); };

function renderItems(){
  const box = E$('#e_items'); box.innerHTML = '';
  est.items.forEach((it, i) => {
    const el = document.createElement('div'); el.className = 'item';
    el.innerHTML = `<span class="num">${i+1}</span>
      ${est.items.length > 1 ? '<button class="del" aria-label="삭제">×</button>' : ''}
      <div class="mb" style="margin-top:6px"><label>품목명</label><input data-k="name" list="presetList" value="${esc(it.name)}" placeholder="버튼으로 고르거나 직접 입력"></div>
      <div class="row mb">
        <div style="flex:1.4"><label>규격/평수</label><input data-k="spec" value="${esc(it.spec)}" placeholder="예) 32평"></div>
        <div style="flex:1"><label>수량</label><input data-k="qty" value="${esc(it.qty)}" inputmode="numeric"></div>
      </div>
      <div class="row">
        <div style="flex:1.4"><label>단가</label><input data-k="price" value="${it.price ? won(num(it.price)) : ''}" inputmode="numeric" placeholder="0"></div>
        <div style="flex:1"><label>비고</label><input data-k="note" value="${esc(it.note)}"></div>
      </div>
      <div class="amt">공급가액 <b>${won(num(it.qty)*num(it.price))}</b>원</div>`;
    el.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => {
      const k = inp.dataset.k;
      if(k === 'price'){ const raw = num(inp.value); inp.value = raw ? won(raw) : ''; it.price = raw ? String(raw) : ''; }
      else if(k === 'qty'){ it.qty = inp.value.replace(/[^\d]/g,''); inp.value = it.qty; }
      else it[k] = inp.value;
      el.querySelector('.amt b').textContent = won(num(it.qty)*num(it.price));
      estChanged();
    }));
    const del = el.querySelector('.del');
    if(del) del.onclick = () => { est.items.splice(i,1); renderItems(); estChanged(); };
    box.appendChild(el);
  });
}

let rt;
function estChanged(){
  E$('#e_s1').textContent = won(supply()) + '원';
  E$('#e_s2').textContent = est.vat ? won(vatAmt()) + '원' : '별도';
  E$('#e_s3').textContent = '₩' + won(grand());
  E$('#e_kor').textContent = korLegal(grand());
  LS.set('rc_est_draft', est);
  clearTimeout(rt); rt = setTimeout(renderEst, 80);
}

/* ---------- 5. 견적서 양식(HTML 템플릿) ---------- */
function pageHTML(){
  const p = prof();
  const filled = est.items.filter(it => it.name || num(it.price));
  const rows = Math.max(5, filled.length + 1);
  const spaced = s => esc(s || '').split('').join(' ').replace(/ {3}/g, '  ');
  const biz = esc((p.bizno || '').replace(/-/g, ' - '));
  const tel = esc((p.tel || '').replace(/-/g, ' - '));
  let body = '';
  for(let r = 0; r < rows; r++){
    const it = filled[r];
    body += it
      ? `<tr><td class="nm">${r+1}. ${esc(it.name)}</td><td class="num">${esc(it.spec)}</td><td class="num">${esc(it.qty)}</td>
         <td class="num">${it.price ? won(num(it.price)) : ''}</td><td class="num">${won(num(it.qty)*num(it.price))}</td><td class="nt">${esc(it.note)}</td></tr>`
      : `<tr><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
  }
  if(est.vat){
    body += `<tr class="sub"><td class="nm">소 계</td><td></td><td></td><td></td><td class="num">${won(supply())}</td><td></td></tr>
             <tr><td class="nm">${filled.length+1}. 부가세</td><td></td><td></td><td></td><td class="num">${won(vatAmt())}</td><td></td></tr>`;
  }
  body += `<tr class="tot"><td class="nm">총 합계</td><td></td><td></td><td></td><td class="num">₩${won(grand())}</td>
           <td class="nt" style="font-size:12.5px;font-weight:400">${est.vat ? '부가세 포함' : '부가세 별도'}</td></tr>`;
  return `
    <div class="ep-title">見積書</div>
    <div class="ep-to"><span>${esc(est.customer) || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}&nbsp; 귀하</span></div>
    <table class="ep-sup">
      <colgroup><col style="width:8%"><col style="width:26%"><col style="width:24%"><col style="width:18%"><col style="width:24%"></colgroup>
      <tr><th class="v" rowspan="5">공<br>급<br>자</th><th>사업자 등록 번호</th><td colspan="3">${biz}</td></tr>
      <tr><th>회 사 명</th><td>${esc(p.name)}</td><th style="letter-spacing:22px;padding-left:28px">대표</th>
          <td class="rel sp">${spaced(p.owner)}${p.stamp ? `<img class="ep-stamp" src="${p.stamp}" alt="">` : ''}</td></tr>
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

function fitPreview(){
  const wrap = E$('#e_wrap'), page = E$('#e_page');
  const s = wrap.clientWidth / 794;
  page.style.transform = `scale(${s})`;
  wrap.style.height = (page.scrollHeight * s) + 'px';
}
function renderEst(){
  E$('#e_page').innerHTML = pageHTML();
  if(!sec.classList.contains('hidden')) fitPreview();
}
window.addEventListener('resize', () => { if(!sec.classList.contains('hidden')) fitPreview(); });

/* ---------- 6. 내보내기 (PNG / PDF / 카톡 공유) ---------- */
function validEst(){
  if(!est.items.some(it => it.name && num(it.price))){ toast('품목과 단가를 입력해 주세요'); return false; }
  return true;
}
const estFile = ext => `견적서_${(est.date||'').replace(/-/g,'')}_${(est.customer||'고객').replace(/[\\/:*?"<>|\s]+/g,'_')}.${ext}`;

async function capture(){
  await fontsReady;
  try{ await document.fonts.load('500 40px "Noto Serif KR"', '見積書'); }catch(e){}
  exportBox.innerHTML = `<div class="ep">${pageHTML()}</div>`;
  const node = exportBox.firstChild;
  await Promise.all([...node.querySelectorAll('img')].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
  const cv = await html2canvas(node, { scale: 2.5, backgroundColor:'#fff', useCORS:true, logging:false });
  exportBox.innerHTML = '';
  return cv;
}
async function makePNG(){ const cv = await capture(); return new Promise(r => cv.toBlob(r, 'image/png')); }
async function makePDF(){
  const cv = await capture();
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit:'mm', format:'a4', compress:true });
  const pageHpx = Math.floor(cv.width * 297 / 210);       // A4 한 장에 해당하는 픽셀 높이
  if(cv.height <= pageHpx * 1.35){                          // 조금 넘치면 한 장에 맞게 축소
    const w = Math.min(210, 297 * cv.width / cv.height);
    pdf.addImage(cv.toDataURL('image/jpeg', 0.95), 'JPEG', (210 - w) / 2, 0, w, w * cv.height / cv.width);
    return pdf.output('blob');
  }
  for(let y = 0, n = 0; y < cv.height; y += pageHpx, n++){
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
async function share(blob, name, type){
  const f = new File([blob], name, { type });
  if(navigator.canShare && navigator.canShare({ files:[f] })){
    try{ await navigator.share({ files:[f], title:'견적서', text:`${prof().name} 견적서 (₩${won(grand())})` }); return; }
    catch(e){ if(e.name === 'AbortError') return; }
  }
  dl(blob, name); toast('파일을 저장했습니다. 카톡에서 파일로 보내 주세요');
}
async function busy(btn, fn){
  const t = btn.textContent; btn.disabled = true; btn.textContent = '만드는 중…';
  try{ await fn(); } catch(e){ console.error(e); toast('만들기에 실패했습니다. 다시 시도해 주세요'); }
  finally{ btn.disabled = false; btn.textContent = t; }
}
E$('#e_png').onclick   = e => validEst() && busy(e.target, async () => { saveEst(); await share(await makePNG(), estFile('png'), 'image/png'); });
E$('#e_pdf').onclick   = e => validEst() && busy(e.target, async () => { saveEst(); dl(await makePDF(), estFile('pdf')); });
E$('#e_share').onclick = e => validEst() && busy(e.target, async () => { saveEst(); await share(await makePDF(), estFile('pdf'), 'application/pdf'); });
E$('#e_new').onclick = () => { if(!confirm('새 견적서를 작성할까요?')) return; est = blankEst(); bindEst(); window.scrollTo(0,0); };

/* ---------- 7. 견적 → 영수증 변환 ---------- */
E$('#e_toReceipt').onclick = () => {
  if(!validEst()) return;
  doc = blankDoc();
  doc.customer = est.customer; doc.date = today();
  doc.items = est.items.filter(it => it.name && num(it.price)).map(it => ({ md:'', name:it.name, qty:it.qty || '1', price:it.price }));
  if(est.vat) doc.items.push({ md:'', name:'부가세', qty:'1', price:String(vatAmt()) });
  LS.set('rc_draft', doc); bindForm(); showTab('write'); toast('견적 내용으로 영수증을 만들었습니다');
};

/* ---------- 8. 견적서 기록 ---------- */
function saveEst(){
  const rec = JSON.parse(JSON.stringify(est)); rec.pid = curPid; rec.total = grand(); rec.ts = Date.now();
  if(!rec.id) rec.id = est.id = 'e' + Date.now();
  estHist = [rec, ...estHist.filter(h => h.id !== rec.id)].slice(0, 300);
  LS.set('rc_est_history', estHist); LS.set('rc_est_draft', est);
}
function renderEstHist(){
  const box = E$('#estHistList');
  if(!estHist.length){ box.innerHTML = '<p class="hint">아직 발행한 견적서가 없습니다.</p>'; return; }
  box.innerHTML = estHist.map(h => {
    const p = profiles.find(x => x.id === h.pid);
    return `<div class="hist" data-id="${h.id}"><div class="t"><b>${esc(h.customer || '(고객명 없음)')}</b>
      <span>${esc(h.date)} · ${esc(h.title || h.items.map(i => i.name).filter(Boolean).join(', '))}${p ? ' · ' + esc(p.name) : ''}</span></div>
      <div class="m">₩${won(h.total)}</div><button data-act="open">열기</button><button data-act="copy">복사</button></div>`;
  }).join('');
  box.querySelectorAll('button').forEach(b => b.onclick = () => {
    const h = estHist.find(x => x.id === b.closest('.hist').dataset.id);
    est = JSON.parse(JSON.stringify(h)); delete est.pid; delete est.total; delete est.ts;
    if(b.dataset.act === 'copy'){ est.id = null; est.date = today(); }
    if(h.pid && profiles.some(p => p.id === h.pid) && h.pid !== curPid){ E$('#profileSel').value = h.pid; E$('#profileSel').dispatchEvent(new Event('change')); }
    bindEst(); showTab('estimate');
  });
}

/* ---------- 9. 탭 전환에 견적서 탭 끼워 넣기 ---------- */
const baseShowTab = showTab;
showTab = function(t){
  if(t === 'estimate'){
    document.querySelectorAll('nav.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    ['write','hist','settings'].forEach(x => E$('#tab-'+x).classList.add('hidden'));
    sec.classList.remove('hidden'); E$('#bar').classList.add('hidden'); bar.classList.remove('hidden');
    renderEst(); requestAnimationFrame(fitPreview); window.scrollTo(0,0);
    return;
  }
  sec.classList.add('hidden'); bar.classList.add('hidden');
  baseShowTab(t);
  if(t === 'hist') renderEstHist();
};

bindEst();
})();
