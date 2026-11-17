// 사진 압축 · 인스타 비율 맞추기 · 영상 썸네일
export interface MediaItem {
  id: string
  type: 'image' | 'video'
  file: File | Blob // 업로드할 실제 파일 (사진은 압축본)
  name: string
  preview: string // objectURL (사진: 압축본, 영상: 썸네일)
  vision: string // AI 분석용 작은 JPEG base64 (접두어 없음)
  thumb: string // 기록용 아주 작은 dataURL
  width: number
  height: number
  duration?: number
  sizeMB: number
  url?: string // 업로드 후 공개 URL
}

const DARK = '#1A1A1A'
const uid = () => Math.random().toString(36).slice(2, 10)

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = () => rej(new Error('사진을 열 수 없어요 (HEIC는 아이폰 설정 > 카메라 > 포맷 > "높은 호환성" 권장)'))
    img.src = src
  })
}

function toBlob(c: HTMLCanvasElement, q: number): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('압축 실패'))), 'image/jpeg', q))
}

/** 원본을 maxSide 이하로 줄이고, 인스타 허용 비율(4:5 ~ 1.91:1)을 벗어나면 어두운 여백을 넣어 맞춤 */
function drawFitted(src: CanvasImageSource, w: number, h: number, maxSide: number, fixRatio: boolean): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(w, h))
  const dw = Math.round(w * scale)
  const dh = Math.round(h * scale)
  let cw = dw
  let ch = dh
  if (fixRatio) {
    const r = dw / dh
    if (r < 0.8) cw = Math.round(dh * 0.8) // 너무 세로로 김 → 좌우 여백
    else if (r > 1.91) ch = Math.round(dw / 1.91) // 너무 가로로 김 → 위아래 여백
  }
  const c = document.createElement('canvas')
  c.width = cw
  c.height = ch
  const ctx = c.getContext('2d')!
  ctx.fillStyle = DARK
  ctx.fillRect(0, 0, cw, ch)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, Math.round((cw - dw) / 2), Math.round((ch - dh) / 2), dw, dh)
  return c
}

const b64 = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(',') + 1)

async function processImage(file: File): Promise<MediaItem> {
  const raw = URL.createObjectURL(file)
  try {
    const img = await loadImage(raw)
    const w = img.naturalWidth
    const h = img.naturalHeight
    const main = drawFitted(img, w, h, 1440, true)
    const blob = await toBlob(main, 0.86)
    const vision = drawFitted(img, w, h, 768, false).toDataURL('image/jpeg', 0.7)
    const thumb = drawFitted(img, w, h, 160, false).toDataURL('image/jpeg', 0.6)
    return {
      id: uid(),
      type: 'image',
      file: blob,
      name: file.name.replace(/\.\w+$/, '') + '.jpg',
      preview: URL.createObjectURL(blob),
      vision: b64(vision),
      thumb,
      width: main.width,
      height: main.height,
      sizeMB: blob.size / 1048576,
    }
  } finally {
    URL.revokeObjectURL(raw)
  }
}

async function processVideo(file: File): Promise<MediaItem> {
  const src = URL.createObjectURL(file)
  const v = document.createElement('video')
  v.muted = true
  v.playsInline = true
  v.preload = 'auto'
  v.src = src
  await new Promise<void>((res, rej) => {
    v.onloadedmetadata = () => res()
    v.onerror = () => rej(new Error('영상을 열 수 없어요'))
  })
  const duration = v.duration
  await new Promise<void>((res) => {
    v.onseeked = () => res()
    v.currentTime = Math.min(0.8, duration / 3)
    setTimeout(res, 2500) // 일부 브라우저는 seeked가 안 옴
  })
  const w = v.videoWidth || 720
  const h = v.videoHeight || 1280
  let vision = ''
  let thumb = ''
  let preview = ''
  try {
    const c = drawFitted(v, w, h, 768, false)
    vision = b64(c.toDataURL('image/jpeg', 0.7))
    thumb = drawFitted(v, w, h, 160, false).toDataURL('image/jpeg', 0.6)
    preview = c.toDataURL('image/jpeg', 0.8)
  } catch {
    /* 썸네일 실패해도 업로드는 가능 */
  }
  return {
    id: uid(),
    type: 'video',
    file,
    name: file.name,
    preview,
    vision,
    thumb,
    width: w,
    height: h,
    duration,
    sizeMB: file.size / 1048576,
  }
}

export async function processFiles(files: FileList | File[]): Promise<MediaItem[]> {
  const out: MediaItem[] = []
  for (const f of Array.from(files)) {
    if (f.type.startsWith('video/') || /\.(mp4|mov|m4v)$/i.test(f.name)) out.push(await processVideo(f))
    else if (f.type.startsWith('image/') || /\.(jpe?g|png|heic|webp)$/i.test(f.name)) out.push(await processImage(f))
  }
  return out
}

/** 영상 규격 경고 (인스타 릴스 3초~15분, 스레드 5분, Cloudinary 무료 100MB) */
export function videoWarnings(m: MediaItem): string[] {
  const w: string[] = []
  if (m.type !== 'video') return w
  if (m.duration && m.duration < 3) w.push('3초보다 짧으면 인스타 업로드가 안 돼요')
  if (m.duration && m.duration > 300) w.push('5분이 넘으면 스레드에 못 올려요')
  if (m.sizeMB > 100) w.push('100MB가 넘어 무료 Cloudinary 업로드가 안 될 수 있어요')
  return w
}
