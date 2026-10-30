// ═════════════════════════════════════════════════════════════
// samplePhotos.js — 체험·테스트용 샘플 사진을 즉석에서 그려 만듭니다.
// 실제 사진 없이도 스마트 컬링이 제대로 동작하는지 확인할 수 있게
// '선명한 컷 / 흔들린 컷 / 어두운 컷 / 날아간 컷 / 연사'를 섞어 둡니다.
// ═════════════════════════════════════════════════════════════

const W = 900;
const H = 900;

/** 바닷가 풍경 + 인물 실루엣 한 장 그리기 (seed로 조금씩 다르게) */
function drawScene(ctx, seed, palette) {
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.6);
  sky.addColorStop(0, palette[0]);
  sky.addColorStop(1, palette[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // 해
  ctx.fillStyle = palette[2];
  ctx.beginPath();
  ctx.arc(W * (0.3 + seed * 0.04), H * 0.32, 70, 0, Math.PI * 2);
  ctx.fill();

  // 바다 + 물결 무늬(선명도 측정에 쓰일 '경계'를 많이 만들어 줌)
  ctx.fillStyle = palette[3];
  ctx.fillRect(0, H * 0.58, W, H * 0.42);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 3;
  for (let y = H * 0.62; y < H; y += 22) {
    ctx.beginPath();
    for (let x = 0; x <= W; x += 30) {
      const yy = y + Math.sin(x / 40 + y + seed) * 5;
      x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }

  // 인물 실루엣(가운데) — 피사체 분리·배경 흐림 체험용
  ctx.fillStyle = '#1b1416';
  const cx = W / 2 + (seed - 2) * 8;
  ctx.beginPath();
  ctx.arc(cx, H * 0.47, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 130, H);
  ctx.quadraticCurveTo(cx - 120, H * 0.56, cx, H * 0.56);
  ctx.quadraticCurveTo(cx + 120, H * 0.56, cx + 130, H);
  ctx.fill();
}

/** 흔들림 흉내: 작게 줄였다가 키워서 경계를 뭉갬 */
function shake(canvas) {
  const s = document.createElement('canvas');
  s.width = W / 14;
  s.height = H / 14;
  s.getContext('2d').drawImage(canvas, 0, 0, s.width, s.height);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(s, 0, 0, W, H);
}

const PALETTES = {
  sunset: ['#2b3a67', '#f29e6d', '#ffd27a', '#2f5d7c'],
  noon: ['#5fa8e8', '#cfe6f7', '#fff6c9', '#1e6f9f'],
  dusk: ['#3d2c5a', '#c76b8f', '#ffc49b', '#2a3d63'],
};

// 만들 샘플 목록: [이름, 팔레트, seed, 후처리]
const RECIPES = [
  ['frame_01_노을_A.jpg', 'sunset', 1, null],
  ['frame_02_노을_B.jpg', 'sunset', 1.3, 'shake'],  // 같은 장면 연사 + 흔들림
  ['frame_03_노을_C.jpg', 'sunset', 1.1, null],     // 같은 장면 연사
  ['frame_04_한낮.jpg', 'noon', 3, null],
  ['frame_05_한낮_흔들림.jpg', 'noon', 3.4, 'shake'],
  ['frame_06_해질녘.jpg', 'dusk', 2, null],
  ['frame_07_어두움.jpg', 'dusk', 4, 'dark'],
  ['frame_08_날아감.jpg', 'noon', 5, 'bright'],
];

/** 샘플 File 배열 만들기 → usePhotoLibrary().addFiles()에 그대로 넣으면 됨 */
export async function createSamplePhotos() {
  const files = [];
  for (const [name, pal, seed, post] of RECIPES) {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    drawScene(ctx, seed, PALETTES[pal]);
    if (post === 'shake') shake(c);
    if (post === 'dark') {
      ctx.fillStyle = 'rgba(0,0,0,0.9)';
      ctx.fillRect(0, 0, W, H);
    }
    if (post === 'bright') {
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.fillRect(0, 0, W, H);
    }
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
    files.push(new File([blob], name, { type: 'image/jpeg' }));
  }
  return files;
}
