// GET /api/health — 앱이 "서버 모드"로 돌 수 있는지 확인용
export function GET(): Response {
  return Response.json({
    ok: true,
    env: {
      ai: !!process.env.AI_API_KEY,
      instagram: !!process.env.IG_ACCESS_TOKEN,
      threads: !!process.env.THREADS_ACCESS_TOKEN,
    },
  })
}
