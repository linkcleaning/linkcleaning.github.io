// 프론트엔드와 서버리스 함수(/api)가 함께 쓰는 타입

export type Category = 'repair' | 'new' | 'parts' | 'reels'

export const CATEGORY_LABEL: Record<Category, string> = {
  repair: 'AS/수리 사례',
  new: '신제품 입고',
  parts: '정품 부속/소모품',
  reels: '홍보 영상/릴스',
}

export type AiProvider = 'claude' | 'gemini'

export interface ShopInfo {
  name: string // 예: 광주 디월트 공식 AS센터
  address: string // 예: 광주광역시 북구 ...
  phone: string
  hours: string
  deliveryText: string // 택배 접수 문구
}

export interface GenerateRequest {
  provider: AiProvider
  apiKey?: string // 비우면 서버 환경변수 AI_API_KEY 사용
  model?: string
  category: Category
  memo: string
  includeDelivery: boolean
  includeVisit: boolean
  shop: ShopInfo
  baseHashtags: string[]
  /** 비전 분석용 작은 JPEG(base64, data: 접두어 없이). 최대 4장 */
  images: string[]
  hasVideo: boolean
}

export interface GenerateResult {
  instagram: string
  hashtags: string[]
  threads: string
}

/** Meta(인스타·스레드) API 한 번 호출 */
export interface MetaRequest {
  platform: 'instagram' | 'threads'
  method: 'GET' | 'POST'
  /** 예: /1784.../media, /1784.../media_publish, /{container-id}, /refresh_access_token */
  path: string
  params: Record<string, string>
  token?: string // 비우면 서버 환경변수 사용
  version?: string // 인스타 Graph API 버전 (예: v26.0)
}

export type MetaResponse = Record<string, unknown>
