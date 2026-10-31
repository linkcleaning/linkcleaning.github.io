// ═════════════════════════════════════════════════════════════
// nativeBridge.js — 웹 픽컷 ↔ 아이폰 앱(픽컷 iOS) 연결 통로
//
// 같은 웹 화면을 두 곳에서 씁니다.
//   ① 사파리·크롬에서 열 때: 지금까지처럼 사진을 골라 올리고, 저장은 공유 시트로
//   ② 아이폰 앱 안에서 열 때: 앱이 사진첩을 직접 읽고, 사진첩에서 '진짜로' 삭제·저장
//
// 앱 안에서는 window.ReactNativeWebView 가 생기므로 그걸로 구분합니다.
// 요청: 웹 → 앱  window.ReactNativeWebView.postMessage(JSON)
// 응답: 앱 → 웹  window.__pickcutNative({ id, ok, data, error })
// ═════════════════════════════════════════════════════════════

/** 아이폰 앱 안에서 열렸는지 */
// (__PICKCUT_APP__ 는 앱이 화면을 열기 전에 미리 심어두는 표시 — 더 확실하게 구분)
export const isNative =
  typeof window !== 'undefined' && !!(window.ReactNativeWebView || window.__PICKCUT_APP__);

let seq = 0;
const pending = new Map();

if (isNative) {
  // 앱이 이 함수를 불러서 답을 돌려줌
  window.__pickcutNative = (msg) => {
    const p = pending.get(msg?.id);
    if (!p) return;
    pending.delete(msg.id);
    msg.ok ? p.resolve(msg.data) : p.reject(new Error(msg.error || '앱 오류'));
  };
}

/** 앱에 일을 시키고 답을 기다림 */
function call(type, payload = {}, timeoutMs = 120000) {
  if (!isNative) return Promise.reject(new Error('아이폰 앱이 아니에요'));
  return new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('앱 응답 시간 초과'));
    }, timeoutMs);
    pending.set(id, {
      resolve: (d) => (clearTimeout(timer), resolve(d)),
      reject: (e) => (clearTimeout(timer), reject(e)),
    });
    if (!window.ReactNativeWebView) {
      pending.delete(id);
      clearTimeout(timer);
      reject(new Error('앱 연결이 아직 준비되지 않았어요. 잠시 후 다시 시도하세요.'));
      return;
    }
    window.ReactNativeWebView.postMessage(JSON.stringify({ id, type, payload }));
  });
}

/** 사진첩 접근 권한 확인·요청 → { granted, access: 'all'|'limited'|'none' } */
export const requestPhotoAccess = () => call('permissions');

/**
 * 기간 안의 사진 목록 (사진 자체가 아니라 정보만, 오래된 순)
 * @returns {Promise<Array<{ id, filename, creationTime, width, height }>>}
 */
export const listLibraryPhotos = (fromTs, toTs, limit) => call('listAssets', { fromTs, toTs, limit });

/** 사진 1장을 분석용 크기(긴 변 maxSize)의 JPEG 파일로 받기 */
export async function getLibraryPhoto(asset, maxSize = 2048) {
  const { base64 } = await call('getImage', { id: asset.id, maxSize }, 60000);
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const name = (asset.filename || 'photo').replace(/\.\w+$/, '') + '.jpg';
  return new File([bytes], name, { type: 'image/jpeg', lastModified: asset.creationTime });
}

/**
 * 사진첩에서 삭제 → 아이폰이 "삭제할까요?" 확인 창을 띄움
 * @returns {Promise<boolean>} true = 삭제됨, false = 사용자가 취소
 */
export async function deleteLibraryPhotos(assetIds) {
  if (!assetIds.length) return true;
  const { deleted } = await call('deleteAssets', { ids: assetIds }, 300000);
  return deleted;
}

/** 파일들을 사진첩에 저장 → 저장된 장수 (한 장씩 보내서 큰 묶음도 안전하게) */
export async function saveToLibrary(files) {
  let saved = 0;
  for (const f of files) {
    const buf = new Uint8Array(await f.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    const r = await call('saveImages', { items: [{ name: f.name, base64: btoa(bin) }] }, 60000);
    saved += r.saved;
  }
  return saved;
}
