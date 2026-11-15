/**
 * AI 비서실 · 네이버 순위 자동 체크 중계 서버 (Cloudflare Worker)
 *
 * 하는 일
 *  - 네이버 공식 검색 API로 키워드의 블로그 검색 상위 100개, 웹문서 검색 상위 100개를 받아
 *    내 블로그 글 / 내 홈페이지가 몇 번째인지 찾아서 돌려줍니다.
 *  - 네이버 API 키는 이 서버의 '환경 변수(비밀)'에만 저장되고 앱이나 브라우저에는 노출되지 않습니다.
 *
 *  - (선택) 네이버 검색광고 '키워드 도구'로 연관 키워드의 실제 월간 검색수·경쟁 정도를 받아
 *    황금키워드를 데이터로 고를 수 있게 돌려줍니다.
 *
 * 필요한 환경 변수 (Cloudflare › Workers › 설정 › 변수 및 비밀, 모두 '비밀(Secret)'로)
 *  [순위 자동 체크]  네이버 클라우드 플랫폼 › NAVER API HUB › Application (사용 API: 검색-블로그, 검색-웹문서)
 *    ※ 2026년 7월 31일부터 developers.naver.com의 검색 API 신규 신청이 종료되어 API HUB로 옮겨졌습니다.
 *  - NAVER_CLIENT_ID      : API HUB 인증 정보의 Client ID
 *  - NAVER_CLIENT_SECRET  : API HUB 인증 정보의 Client Secret
 *  - (선택) NAVER_API_MODE = legacy  : 예전에 developers.naver.com에서 받은 키를 쓰는 경우에만 추가
 *  [데이터 황금키워드]  searchad.naver.com › 도구 › API 사용 관리
 *  - SEARCHAD_API_KEY     : 엑세스라이선스
 *  - SEARCHAD_SECRET_KEY  : 비밀키
 *  - SEARCHAD_CUSTOMER_ID : CUSTOMER_ID (숫자)
 *
 * 황금키워드 호출 예시
 *  GET https://<워커주소>/?mode=kw&hints=제주입주청소,제주에어컨청소
 *   - hints : 기준 키워드 최대 5개 (쉼표 구분)
 *  응답: { ok, items: [{ kw, pc, mobile, total, comp }] }   // comp: 낮음 | 중간 | 높음
 *
 * 호출 예시
 *  GET https://<워커주소>/?q=제주입주청소&blog=linkclean&name=링크클린&site=linkclean.co.kr
 *   - q    : 검색 키워드 (필수)
 *   - blog : 내 네이버 블로그 ID 또는 주소 일부 (예: linkclean 또는 blog.naver.com/linkclean)
 *   - name : 블로그 이름 (blog를 모를 때 보조로 사용, 예: 링크클린)
 *   - site : 내 홈페이지 도메인 (예: linkclean.co.kr)
 *
 * 응답 예시
 *  { "ok": true, "keyword": "제주입주청소",
 *    "blog": { "rank": 3, "title": "...", "link": "..." },   // rank 0 = 100위 밖
 *    "web":  { "rank": 0 } }
 */

// 이 앱 주소에서만 호출을 허용합니다. 다른 주소에서도 쓰려면 목록에 추가하세요.
const ALLOWED_ORIGINS = ['https://linkcleaning.github.io', 'http://localhost:5173', 'http://localhost:8766'];

// 검색 API 주소: NAVER API HUB(기본) / 예전 개발자센터(legacy)
const HUB = 'https://naverapihub.apigw.ntruss.com/search/v1';
const LEGACY = 'https://openapi.naver.com/v1/search';

const SEARCHAD = 'https://api.searchad.naver.com';

async function hmacBase64(secret, message) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  let bin = '';
  new Uint8Array(sig).forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

/** '< 10' 같은 값도 숫자로 */
function toCount(v) {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').trim();
  if (s.startsWith('<')) return 5;
  const n = Number(s.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

async function keywordTool(hints, env) {
  const uri = '/keywordstool';
  const ts = String(Date.now());
  const signature = await hmacBase64(env.SEARCHAD_SECRET_KEY, `${ts}.GET.${uri}`);
  const qs = new URLSearchParams({ hintKeywords: hints.join(','), showDetail: '1' });
  const res = await fetch(`${SEARCHAD}${uri}?${qs.toString()}`, {
    headers: {
      'X-Timestamp': ts,
      'X-API-KEY': env.SEARCHAD_API_KEY,
      'X-Customer': String(env.SEARCHAD_CUSTOMER_ID),
      'X-Signature': signature,
    },
  });
  if (!res.ok) {
    let detail = '';
    try {
      const e = await res.json();
      detail = e.title || e.message || e.detail || '';
    } catch {
      /* noop */
    }
    throw Object.assign(new Error(`검색광고 API 오류 ${res.status} ${detail}`.trim()), { status: res.status });
  }
  const data = await res.json();
  return (data.keywordList || []).map((k) => {
    const pc = toCount(k.monthlyPcQcCnt);
    const mobile = toCount(k.monthlyMobileQcCnt);
    return { kw: k.relKeyword, pc, mobile, total: pc + mobile, comp: k.compIdx || '' };
  });
}

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders(origin) },
  });
}

const stripTags = (s = '') => s.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const norm = (s = '') => s.toLowerCase().replace(/^https?:\/\//, '').replace(/^(www\.|m\.)/, '').replace(/\/+$/, '');

/** 블로그 ID만 뽑기: 'https://blog.naver.com/linkclean/123' → 'linkclean' */
function blogIdOf(input = '') {
  const s = norm(input.trim());
  const m = s.match(/blog\.naver\.com\/([^/?#]+)/);
  return (m ? m[1] : s).toLowerCase();
}

/** 도메인만 뽑기: 'https://www.linkclean.co.kr/price' → 'linkclean.co.kr' */
function domainOf(input = '') {
  return norm(input.trim()).split(/[/?#]/)[0];
}

async function naverSearch(kind, query, env) {
  const legacy = String(env.NAVER_API_MODE || '').toLowerCase() === 'legacy';
  const qs = `query=${encodeURIComponent(query)}&display=100&start=1${kind === 'blog' ? '&sort=sim' : ''}`;
  const url = legacy ? `${LEGACY}/${kind}.json?${qs}` : `${HUB}/${kind}?${qs}`;
  const headers = legacy
    ? { 'X-Naver-Client-Id': env.NAVER_CLIENT_ID, 'X-Naver-Client-Secret': env.NAVER_CLIENT_SECRET }
    : { 'X-NCP-APIGW-API-KEY-ID': env.NAVER_CLIENT_ID, 'X-NCP-APIGW-API-KEY': env.NAVER_CLIENT_SECRET };
  const res = await fetch(url, { headers });
  if (!res.ok) {
    let detail = '';
    try {
      const e = await res.json();
      detail = e.errorMessage || e.error?.message || e.message || e.errorCode || '';
    } catch {
      /* noop */
    }
    throw Object.assign(new Error(`네이버 ${kind} API 오류 ${res.status} ${detail}`.trim()), { status: res.status });
  }
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}

function findBlogRank(items, blogId, blogName) {
  const id = blogId ? blogIdOf(blogId) : '';
  const name = (blogName || '').trim();
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const link = norm(it.link || '');
    const bloggerlink = norm(it.bloggerlink || '');
    const byId =
      id &&
      (bloggerlink.endsWith('/' + id) ||
        bloggerlink === id ||
        bloggerlink.includes('blog.naver.com/' + id) ||
        link.includes('blog.naver.com/' + id + '/') ||
        link.includes('blogid=' + id));
    const byName = !id && name && stripTags(it.bloggername || '').includes(name);
    if (byId || byName) return { rank: i + 1, title: stripTags(it.title), link: it.link, postdate: it.postdate };
  }
  return { rank: 0 };
}

function findWebRank(items, site) {
  const d = domainOf(site);
  if (!d) return { rank: 0 };
  for (let i = 0; i < items.length; i++) {
    const host = domainOf(items[i].link || '');
    if (host === d || host.endsWith('.' + d)) return { rank: i + 1, title: stripTags(items[i].title), link: items[i].link };
  }
  return { rank: 0 };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (request.method !== 'GET') return json({ ok: false, error: 'GET만 지원합니다.' }, 405, origin);

    const u = new URL(request.url);
    const keywordReady = !!(env.SEARCHAD_API_KEY && env.SEARCHAD_SECRET_KEY && env.SEARCHAD_CUSTOMER_ID);

    // ---- 데이터 황금키워드 (검색광고 키워드 도구) ----
    if (u.searchParams.get('mode') === 'kw') {
      if (!keywordReady)
        return json({ ok: false, error: '서버에 검색광고 API 비밀 값(SEARCHAD_API_KEY / SEARCHAD_SECRET_KEY / SEARCHAD_CUSTOMER_ID)이 없습니다.' }, 500, origin);
      const hints = (u.searchParams.get('hints') || '')
        .split(',')
        .map((h) => h.replace(/\s+/g, '').trim())
        .filter(Boolean)
        .slice(0, 5);
      if (!hints.length) return json({ ok: false, error: '기준 키워드(hints)가 없습니다.' }, 400, origin);
      try {
        const items = await keywordTool(hints, env);
        return json({ ok: true, hints, checkedAt: new Date().toISOString(), items: items.slice(0, 400) }, 200, origin);
      } catch (e) {
        return json({ ok: false, error: e.message || '검색광고 API 호출 실패' }, e.status === 429 ? 429 : 502, origin);
      }
    }

    const q = (u.searchParams.get('q') || '').trim();
    if (!q)
      return json(
        { ok: true, service: 'ai-secretary naver-rank', ready: !!(env.NAVER_CLIENT_ID && env.NAVER_CLIENT_SECRET), keywordReady },
        200,
        origin,
      );
    if (!env.NAVER_CLIENT_ID || !env.NAVER_CLIENT_SECRET)
      return json({ ok: false, error: '서버에 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 비밀 값이 없습니다.' }, 500, origin);
    if (q.length > 60) return json({ ok: false, error: '키워드가 너무 깁니다.' }, 400, origin);

    const blog = (u.searchParams.get('blog') || '').slice(0, 120);
    const name = (u.searchParams.get('name') || '').slice(0, 40);
    const site = (u.searchParams.get('site') || '').slice(0, 120);

    try {
      const [blogItems, webItems] = await Promise.all([
        blog || name ? naverSearch('blog', q, env) : Promise.resolve(null),
        site ? naverSearch('webkr', q, env) : Promise.resolve(null),
      ]);
      return json(
        {
          ok: true,
          keyword: q,
          checkedAt: new Date().toISOString(),
          blog: blogItems ? findBlogRank(blogItems, blog, name) : null,
          web: webItems ? findWebRank(webItems, site) : null,
        },
        200,
        origin,
      );
    } catch (e) {
      const status = e.status === 401 || e.status === 403 ? 502 : e.status === 429 ? 429 : 502;
      return json({ ok: false, error: e.message || '네이버 API 호출 실패' }, status, origin);
    }
  },
};
