// 설정·기록을 이 폰(브라우저)에만 저장
import type { AiProvider, Category } from '../../shared/types'

export interface Settings {
  aiProvider: AiProvider
  aiKey: string
  aiModel: string
  igUserId: string
  igToken: string
  igTokenSavedAt?: number
  threadsUserId: string
  threadsToken: string
  threadsTokenSavedAt?: number
  graphVersion: string
  hostProvider: 'cloudinary' | 'imgbb'
  cloudName: string
  uploadPreset: string
  imgbbKey: string
  apiMode: 'auto' | 'server' | 'direct'
  shopName: string
  address: string
  phone: string
  hours: string
  deliveryText: string
  baseHashtags: string
}

export const DEFAULT_SETTINGS: Settings = {
  aiProvider: 'claude',
  aiKey: '',
  aiModel: '',
  igUserId: '',
  igToken: '',
  threadsUserId: '',
  threadsToken: '',
  graphVersion: 'v26.0',
  hostProvider: 'cloudinary',
  cloudName: '',
  uploadPreset: '',
  imgbbKey: '',
  apiMode: 'auto',
  shopName: '광주 디월트 공식 AS센터',
  address: '',
  phone: '',
  hours: '',
  deliveryText: '택배 접수 · 전국 발송 가능',
  baseHashtags: '#디월트 #디월트AS #광주디월트 #광주전동공구 #디월트수리 #전동공구부속 #현장필수템',
}

const SK = 'dw-sns-settings-v1'
const HK = 'dw-sns-history-v1'

export function loadSettings(): Settings {
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(SK) || '{}') as Partial<Settings>) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}
export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(SK, JSON.stringify(s))
  } catch {
    /* 저장 공간 부족 등 */
  }
}

export interface HistoryItem {
  id: string
  date: number
  category: Category
  memo: string
  thumb?: string // 작은 썸네일 dataURL
  mediaCount: number
  instagram: string // 해시태그 포함 최종 본문
  threads: string
  igLink?: string
  thLink?: string
  status: 'published' | 'partial' | 'manual'
}

export function loadHistory(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(HK) || '[]') as HistoryItem[]
  } catch {
    return []
  }
}
export function saveHistory(list: HistoryItem[]) {
  let l = list.slice(0, 150)
  // 저장 공간이 꽉 차면 오래된 것부터 줄임
  for (let i = 0; i < 5; i++) {
    try {
      localStorage.setItem(HK, JSON.stringify(l))
      return
    } catch {
      l = l.slice(0, Math.floor(l.length * 0.7))
    }
  }
}
export function upsertHistory(item: HistoryItem): HistoryItem[] {
  const list = loadHistory().filter((h) => h.id !== item.id)
  list.unshift(item)
  saveHistory(list)
  return list
}

/** 토큰 저장 후 경과일 → 장기 토큰(60일) 남은 날 */
export function tokenDaysLeft(savedAt?: number): number | null {
  if (!savedAt) return null
  return 60 - Math.floor((Date.now() - savedAt) / 86_400_000)
}
