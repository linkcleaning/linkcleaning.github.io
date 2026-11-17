// Vercel Serverless Function: POST /api/generate
// 사진(비전)·메모·카테고리 → 인스타용/스레드용 글 생성
import { generateCopy } from '../shared/generate.js'
import type { GenerateRequest } from '../shared/types.js'

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as GenerateRequest
    const result = await generateCopy(body, {
      browser: false,
      // 앱 설정에 키를 안 넣었으면 Vercel 환경변수 AI_API_KEY 사용
      fallbackKey: process.env.AI_API_KEY,
    })
    return Response.json(result)
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 })
  }
}
