// 복사 · 앱 열기 · 사진 공유 (API 없이 쓰는 수동 백업)
import type { MediaItem } from './media'

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

/** 앱 스킴으로 열고, 앱이 없으면 웹으로 */
function openWithFallback(scheme: string, web: string) {
  const t = Date.now()
  window.location.href = scheme
  setTimeout(() => {
    if (document.visibilityState === 'visible' && Date.now() - t < 2500) window.location.href = web
  }, 1500)
}

export function openInstagram() {
  openWithFallback('instagram://camera', 'https://www.instagram.com/')
}

/** 스레드는 글이 미리 채워진 작성 화면으로 바로 열림 */
export function openThreads(text?: string) {
  const url = text ? `https://www.threads.com/intent/post?text=${encodeURIComponent(text)}` : 'https://www.threads.com/'
  window.location.href = url
}

/** 휴대폰 공유창으로 사진·영상 보내기 (인스타 선택 또는 "이미지 저장") */
export async function shareMedia(items: MediaItem[], text?: string): Promise<'shared' | 'unsupported' | 'cancel'> {
  const files = items.map((m) => new File([m.file], m.name, { type: m.type === 'video' ? m.file.type || 'video/mp4' : 'image/jpeg' }))
  const data: ShareData = { files }
  if (text) data.text = text
  if (!navigator.canShare || !navigator.canShare({ files })) return 'unsupported'
  try {
    await navigator.share(data)
    return 'shared'
  } catch {
    return 'cancel'
  }
}
