// Vercel Serverless Function: POST /api/publish
// Meta Graph API(인스타그램 · 스레드) 호출 1단계씩 대신 실행
// (컨테이너 생성 → 상태 확인 → 발행 순서는 앱이 이 함수를 여러 번 불러 진행 — 영상 처리 대기로 시간초과 나지 않게)
import { metaRequest } from '../shared/meta.js'
import type { MetaRequest } from '../shared/types.js'

export async function POST(request: Request): Promise<Response> {
  try {
    const req = (await request.json()) as MetaRequest
    // 앱 설정에 토큰을 안 넣었으면 Vercel 환경변수 사용
    const envToken = req.platform === 'instagram' ? process.env.IG_ACCESS_TOKEN : process.env.THREADS_ACCESS_TOKEN
    const data = await metaRequest(req, envToken)
    return Response.json(data)
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 })
  }
}
