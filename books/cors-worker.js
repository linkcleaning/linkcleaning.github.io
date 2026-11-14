/* 다락서재 — 무료 고전 다운로드 중계 (Cloudflare Workers용)
   구텐베르크(gutenberg.org)·Gutendex는 브라우저에서 바로 받는 걸 막아 둬서, 이 작은 중계를 거쳐 받아요.
   올리는 방법: Cloudflare 대시보드 → Workers & Pages → 만들기 → Worker 만들기 → 배포
               → 코드 편집에서 아래 내용을 통째로 붙여넣고 배포 → 나온 주소(https://….workers.dev)를
               다락서재 설정 › '무료 고전 다운로드 중계 주소'에 붙여넣기
   보안: 아래 ALLOW에 적힌 곳만 중계해요 (아무 사이트나 중계하는 열린 프록시가 되지 않게). */
const ALLOW = ['gutendex.com', 'www.gutenberg.org', 'gutenberg.org', 'aleph.gutenberg.org'];
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Expose-Headers': 'Content-Length, Content-Type' };

export default {
  async fetch(req) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const raw = new URL(req.url).searchParams.get('url');
    let target;
    try { target = new URL(raw); } catch { return new Response('url 파라미터가 필요해요', { status: 400, headers: CORS }); }
    if (!ALLOW.includes(target.hostname)) return new Response('허용되지 않은 주소예요', { status: 403, headers: CORS });
    const r = await fetch(target.toString(), { headers: { 'User-Agent': 'DarakSeojae/1.0 (+https://linkcleaning.github.io/books/)' }, redirect: 'follow', cf: { cacheTtl: 86400, cacheEverything: true } });
    const h = new Headers(r.headers);
    for (const [k, v] of Object.entries(CORS)) h.set(k, v);
    h.delete('set-cookie');
    return new Response(r.body, { status: r.status, headers: h });
  }
};
