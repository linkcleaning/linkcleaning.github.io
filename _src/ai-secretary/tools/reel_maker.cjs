// 디자인실 쇼츠·릴스 템플릿 v1 (2026-11-21) — 클릭하고 싶게 만드는 세로 영상
// 사용: node _src/ai-secretary/tools/reel_maker.cjs spec.json out.mp4
// spec 예시는 DESIGN_PLAYBOOK.md 참고. 소리 없음(업로드 때 유튜브 오디오 라이브러리 음악 권장).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');

const [, , specPath, outPath] = process.argv;
if (!specPath || !outPath) { console.error('사용: node reel_maker.cjs spec.json out.mp4'); process.exit(1); }
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const FPS = 30;

// 팔레트: 진한 바탕 + 형광 강조(베이지 금지 — 피드에서 묻힘)
const PAL = {
  salim: { bg: ['#1E2A4A', '#E8505B', '#2F6B4F', '#5B3FA0'], hi: '#FFE14D', ink: '#FFFFFF', tag: '살림기록소' },
  link: { bg: ['#0E3B43', '#D9480F', '#0B5560', '#1F2937'], hi: '#FFD233', ink: '#FFFFFF', tag: '링크클린' }
}[spec.brand || 'salim'];

const HOOK = 2.4, PUNCH = 1.0, STEP = 2.6, OUTRO = 2.0;
const steps = spec.steps || [];
const TOTAL = HOOK + PUNCH + steps.length * STEP + OUTRO;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
html,body{width:1080px;height:1920px;overflow:hidden;font-family:"Noto Sans CJK KR","Noto Color Emoji",sans-serif}
#s{position:absolute;inset:0;overflow:hidden}
.tag{position:absolute;top:150px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.35);color:#fff;font-weight:900;font-size:34px;padding:12px 28px;border-radius:999px;letter-spacing:.02em}
.bar{position:absolute;top:96px;left:80px;right:80px;display:flex;gap:10px}
.bar i{flex:1;height:10px;border-radius:9px;background:rgba(255,255,255,.28);overflow:hidden}
.bar i b{display:block;height:100%;background:${PAL.hi}}
.c{position:absolute;left:70px;right:70px;top:380px;bottom:480px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start}
.emo{font-size:230px;line-height:1;margin-bottom:30px}
.l1{font-weight:900;font-size:108px;line-height:1.12;color:#fff;letter-spacing:-.03em;word-break:keep-all}
.l2{display:inline-block;font-weight:900;font-size:104px;line-height:1.12;color:#111;background:${PAL.hi};padding:6px 22px 12px;margin-top:14px;border-radius:14px;letter-spacing:-.03em;word-break:keep-all}
.sub{margin-top:34px;font-weight:700;font-size:48px;color:rgba(255,255,255,.88);line-height:1.35;word-break:keep-all}
.num{font-weight:900;font-size:300px;line-height:.9;color:${PAL.hi};letter-spacing:-.05em}
.st{font-weight:900;font-size:112px;line-height:1.14;color:#fff;letter-spacing:-.03em;margin-top:18px;word-break:keep-all}
.sd{white-space:pre-line;margin-top:28px;font-weight:700;font-size:58px;line-height:1.38;color:rgba(255,255,255,.9);word-break:keep-all}
.icon{position:absolute;right:90px;top:430px;font-size:200px}
.punch{font-weight:900;font-size:130px;color:#fff;line-height:1.15;text-align:left}
.punch em{white-space:nowrap;font-style:normal;color:${PAL.hi}}
</style></head><body><div id="s"></div></body></html>`;

const esc = (t) => String(t || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const ease = (x) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);
const pop = (x) => { x = Math.min(Math.max(x, 0), 1); return x < .7 ? 1.18 * ease(x / .7) : 1.18 - .18 * ease((x - .7) / .3); };

function frame(t) {
  const segs = 1 + steps.length; // 진행 막대: 훅 + 단계들
  let seg = 0, inner = '', bg = PAL.bg[0], local = t;
  const barFill = (k, p) => Array.from({ length: segs }, (_, i) => `<i><b style="width:${i < k ? 100 : i === k ? Math.round(p * 100) : 0}%"></b></i>`).join('');
  if (t < HOOK) {
    const p = t / HOOK;
    const shake = t < 0.5 ? Math.sin(t * 60) * 6 * (1 - t / 0.5) : 0;
    inner = `<div class="c" style="transform:translateX(${shake}px)">
      <div class="emo" style="transform:scale(${pop(t / 0.35)}) rotate(${Math.sin(t * 7) * 6}deg)">${spec.emoji || '😮'}</div>
      <div class="l1" style="opacity:${ease(t / 0.15)};transform:translateY(${(1 - ease(t / 0.25)) * 40}px)">${esc(spec.hook[0])}</div>
      <div class="l2" style="transform:scale(${pop((t - 0.25) / 0.35)});transform-origin:left center">${esc(spec.hook[1])}</div>
      ${spec.hookSub ? `<div class="sub" style="opacity:${ease((t - 0.9) / 0.3)}">${esc(spec.hookSub)}</div>` : ''}
    </div>`;
    inner = `<div class="bar">${barFill(0, p)}</div>` + inner;
  } else if (t < HOOK + PUNCH) {
    local = t - HOOK; bg = '#111';
    inner = `<div class="bar">${barFill(1, 0)}</div><div class="c"><div class="punch" style="transform:scale(${pop(local / 0.3)});transform-origin:left center">${spec.punch || '정답은 <em>' + steps.length + '가지</em> 👇'}</div></div>`;
  } else if (t < HOOK + PUNCH + steps.length * STEP) {
    const i = Math.floor((t - HOOK - PUNCH) / STEP), s = steps[i]; local = t - HOOK - PUNCH - i * STEP;
    bg = PAL.bg[(i + 1) % PAL.bg.length]; seg = i + 1;
    const slide = (1 - ease(local / 0.22)) * 1080;
    inner = `<div class="bar">${barFill(seg, local / STEP)}</div>
      <div class="c" style="transform:translateX(${slide}px)">
        <div class="num" style="transform:scale(${pop(local / 0.3)});transform-origin:left bottom">${i + 1}</div>
        <div class="st">${esc(s.title)}</div>
        ${s.desc ? `<div class="sd" style="opacity:${ease((local - 0.35) / 0.3)}">${esc(s.desc)}</div>` : ''}
      </div>
      ${s.icon ? `<div class="icon" style="transform:translateY(${Math.sin(local * 5) * 18}px) scale(${pop((local - .15) / .3)})">${s.icon}</div>` : ''}`;
  } else {
    local = t - (TOTAL - OUTRO); bg = PAL.bg[0];
    inner = `<div class="bar">${barFill(segs, 1)}</div><div class="c">
      <div class="emo" style="transform:scale(${pop(local / .3)})">📌</div>
      <div class="l1">${esc(spec.outro || '까먹기 전에')}</div>
      <div class="l2" style="transform:scale(${pop((local - .2) / .3)});transform-origin:left center">${esc(spec.outro2 || '저장해두기')}</div>
      <div class="sub" style="opacity:${ease((local - .6) / .3)}">${esc(spec.follow || '팔로우하면 매일 살림 꿀팁 하나씩')}</div></div>`;
  }
  return `<div id="s" style="background:${bg}"><div class="tag">${PAL.tag}</div>${inner}</div>`;
}

(async () => {
  const dir = fs.mkdtempSync('/tmp/reel-');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.setContent(html); await p.waitForTimeout(300);
  const n = Math.round(TOTAL * FPS);
  for (let k = 0; k < n; k++) {
    await p.evaluate((h) => { document.getElementById('s').outerHTML = h; }, frame(k / FPS));
    await p.screenshot({ path: path.join(dir, String(k).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 88 });
  }
  // 표지(썸네일)용: 훅이 다 보이는 순간
  await p.evaluate((h) => { document.getElementById('s').outerHTML = h; }, frame(1.6));
  await p.screenshot({ path: outPath.replace(/\.mp4$/, '_cover.jpg'), type: 'jpeg', quality: 90 });
  await b.close();
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, '%04d.jpg'), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outPath]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('완료', outPath, TOTAL.toFixed(1) + '초');
})();
