// 미디어를 공개 URL로 올리기 (Meta API는 공개 주소만 받음)
// 휴대폰에서 바로 업로드 → Vercel 요청 크기 제한(4.5MB)에 안 걸림
import type { Settings } from './storage'
import type { MediaItem } from './media'

async function uploadCloudinary(m: MediaItem, s: Settings): Promise<string> {
  if (!s.cloudName || !s.uploadPreset) throw new Error('설정에서 Cloudinary Cloud name과 Upload preset을 넣어 주세요.')
  const fd = new FormData()
  fd.append('file', m.file, m.name)
  fd.append('upload_preset', s.uploadPreset)
  fd.append('folder', 'dewalt-sns')
  const kind = m.type === 'video' ? 'video' : 'image'
  const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(s.cloudName)}/${kind}/upload`, { method: 'POST', body: fd })
  const j = (await res.json()) as any
  if (!res.ok) throw new Error('Cloudinary 업로드 실패: ' + (j?.error?.message ?? res.status))
  // 인스타·스레드 모두 MOV/MP4(HEVC·H.264)를 받으므로 아이폰 영상 원본 주소 그대로 사용
  return j.secure_url as string
}

async function uploadImgbb(m: MediaItem, s: Settings): Promise<string> {
  if (m.type === 'video') throw new Error('ImgBB는 영상을 못 올려요. 영상은 설정에서 Cloudinary를 선택해 주세요.')
  if (!s.imgbbKey) throw new Error('설정에서 ImgBB API 키를 넣어 주세요.')
  const fd = new FormData()
  fd.append('image', m.file, m.name)
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(s.imgbbKey)}`, { method: 'POST', body: fd })
  const j = (await res.json()) as any
  if (!res.ok || !j?.data?.url) throw new Error('ImgBB 업로드 실패: ' + (j?.error?.message ?? res.status))
  return j.data.url
}

export async function hostMedia(items: MediaItem[], s: Settings, log: (m: string) => void): Promise<MediaItem[]> {
  const out: MediaItem[] = []
  for (let i = 0; i < items.length; i++) {
    const m = items[i]
    if (m.url) {
      out.push(m)
      continue
    }
    log(`미디어 업로드 ${i + 1}/${items.length} (${m.type === 'video' ? '영상' : '사진'}, ${m.sizeMB.toFixed(1)}MB)…`)
    const url = s.hostProvider === 'imgbb' ? await uploadImgbb(m, s) : await uploadCloudinary(m, s)
    out.push({ ...m, url })
  }
  return out
}
