// 링크클린 네이버 블로그 임시저장 도우미 (대표님 PC 전용)
// - 네이버 블로그 글쓰기 화면을 열어 제목·본문·사진을 넣고 「저장」(임시저장)까지만 합니다. 발행은 절대 누르지 않습니다.
// - 네이버 로그인은 이 도우미 전용 브라우저 폴더(.naver-profile)에 대표님이 한 번만 직접 하십니다. 비밀번호를 파일에 적지 않습니다.
//
// 쓰는 법
//   node naver-draft.mjs login                       ← 처음 한 번: 창이 뜨면 네이버에 직접 로그인 후 창 닫기
//   node naver-draft.mjs today "D:\블로그사진\오늘"     ← 비서실 오늘 초안(today.json) + 그 폴더 사진으로 임시저장
//   node naver-draft.mjs file draft.json             ← draft.json 내용으로 임시저장
//
// draft.json 모양: { "blogId":"linkclean", "title":"…", "body":"…[사진: 설명]…", "tags":["제주 입주청소"], "photos":["D:\\사진\\1.jpg"] }
// 본문의 [사진: …] 자리마다 사진을 순서대로 하나씩 넣습니다. 남는 사진은 글 끝에 넣습니다.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROFILE = path.join(HERE, '.naver-profile');
const TODAY_URL = 'https://linkcleaning.github.io/ai-secretary/data/today.json';
const PHOTO_EXT = /\.(jpe?g|png|heic|webp)$/i;
const log = (...a) => console.log('[임시저장 도우미]', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function openBrowser() {
  return chromium.launchPersistentContext(PROFILE, {
    headless: false,
    channel: 'chrome', // 대표님 PC에 깔린 크롬 사용 (없으면 아래 줄 삭제 → playwright 크로미움 사용)
    viewport: { width: 1280, height: 900 },
    locale: 'ko-KR',
  });
}

async function login() {
  const ctx = await openBrowser();
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto('https://nid.naver.com/nidlogin.login');
  log('창에서 네이버에 직접 로그인해 주세요. (로그인 상태 유지 체크 권장) 다 되면 창을 닫으면 끝납니다.');
  await new Promise((r) => ctx.on('close', r));
}

async function loadToday(photoDir) {
  const res = await fetch(TODAY_URL + '?t=' + Date.now());
  const t = await res.json();
  if (!t.blog || !t.blog.title) throw new Error('오늘(today.json)에는 블로그 초안이 없어요. (월·목에만 만들어져요)');
  const photos = photoDir && fs.existsSync(photoDir)
    ? fs.readdirSync(photoDir).filter((f) => PHOTO_EXT.test(f)).sort().map((f) => path.join(photoDir, f))
    : [];
  return { blogId: 'linkclean', title: t.blog.title, body: t.blog.body, tags: t.blog.keyword ? [t.blog.keyword] : [], photos };
}

// 글쓰기 화면은 mainFrame 안에 있을 때가 있어 두 곳 다 찾는다
async function editorFrame(page) {
  for (let i = 0; i < 30; i++) {
    for (const f of [page.mainFrame(), ...page.frames()]) {
      if (await f.locator('.se-title-text, .se-documentTitle').first().count().catch(() => 0)) return f;
    }
    await sleep(1000);
  }
  throw new Error('글쓰기 화면을 찾지 못했어요 (로그인이 풀렸을 수 있어요 → login 다시)');
}

async function closePopups(f) {
  // "작성 중인 글이 있습니다" → 취소(새로 쓰기), 도움말 패널 닫기
  for (const sel of ['.se-popup-button-cancel', 'button.se-help-panel-close-button', '.se-popup-close-button']) {
    const b = f.locator(sel).first();
    if (await b.count().catch(() => 0)) { await b.click().catch(() => {}); await sleep(500); }
  }
}

async function addPhoto(page, f, file) {
  const btn = f.locator('button.se-image-toolbar-button, button[data-name="image"]').first();
  const [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 15000 }), btn.click()]);
  await chooser.setFiles(file);
  await sleep(4000); // 올라가는 시간
}

async function writeDraft(d) {
  if (!d.title) throw new Error('제목이 비었어요');
  const ctx = await openBrowser();
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto(`https://blog.naver.com/${d.blogId || 'linkclean'}/postwrite`, { waitUntil: 'domcontentloaded' });
  if (page.url().includes('nidlogin')) throw new Error('네이버 로그인이 풀렸어요 → node naver-draft.mjs login');
  const f = await editorFrame(page);
  await sleep(2000);
  await closePopups(f);

  // 제목
  await f.locator('.se-title-text, .se-documentTitle').first().click();
  await page.keyboard.type(d.title, { delay: 15 });

  // 본문: [사진: …] 자리마다 사진 하나씩
  await f.locator('.se-component.se-text .se-text-paragraph, .se-main-container .se-text-paragraph').first().click();
  const parts = String(d.body || '').split(/\[사진[^\]]*\]/);
  const photos = [...(d.photos || [])];
  for (let i = 0; i < parts.length; i++) {
    const lines = parts[i].replace(/\r/g, '').split('\n');
    for (let j = 0; j < lines.length; j++) {
      if (lines[j]) await page.keyboard.type(lines[j], { delay: 5 });
      if (j < lines.length - 1) await page.keyboard.press('Enter');
    }
    if (i < parts.length - 1 && photos.length) { await addPhoto(page, f, photos.shift()); await page.keyboard.press('End'); }
  }
  for (const p of photos) await addPhoto(page, f, p); // 남은 사진은 끝에

  // 임시저장 = 오른쪽 위 「저장」 (발행 버튼은 건드리지 않음)
  const save = f.locator('button[class*="save_btn"], button:has-text("저장")').filter({ hasNotText: '발행' }).first();
  await save.click();
  await sleep(3000);
  log(`임시저장 끝: "${d.title}" — 사진 ${(d.photos || []).length}장. 휴대폰 네이버 블로그 앱 → 글쓰기 → 임시저장 글에서 확인 후 발행하세요.`);
  await ctx.close();
}

const [cmd, arg] = process.argv.slice(2);
try {
  if (cmd === 'login') await login();
  else if (cmd === 'today') await writeDraft(await loadToday(arg));
  else if (cmd === 'file') await writeDraft(JSON.parse(fs.readFileSync(arg, 'utf8')));
  else log('쓰는 법: login | today "사진폴더" | file draft.json');
} catch (e) {
  log('못 했어요:', e.message);
  process.exitCode = 1;
}
