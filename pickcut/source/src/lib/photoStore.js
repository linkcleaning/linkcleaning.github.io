// ═════════════════════════════════════════════════════════════
// photoStore.js — 사진과 분석 결과를 폰 안에 저장 (IndexedDB)
//
// IndexedDB란? 브라우저에 들어 있는 작은 데이터베이스.
//   localStorage(글자만, 5MB)와 달리 사진 같은 파일(Blob)도 수백 MB까지 저장됩니다.
//   서버로 전송되지 않고 이 폰의 이 브라우저(앱)에만 남습니다.
//
// 저장하는 것 (사진 1장당 약 0.5MB)
//   { id, name, addedAt, work: Blob(편집용 2048px), thumb: Blob(격자용 400px),
//     result: 분석 결과, hash: 연사 지문, embedding: AI 지문(비슷한 사진용) }
//
// 원본 고화질 파일은 저장하지 않습니다. 원본은 폰 갤러리에 그대로 있으니까요.
// ═════════════════════════════════════════════════════════════

const DB_NAME = 'pickcut';
const DB_VERSION = 2; // 2: 설정(로고 등) 저장용 표 추가
const STORE = 'photos';
const SETTINGS = 'settings';

let dbPromise = null;

/** 데이터베이스 열기 (처음이면 표(store)를 만듦) */
function openDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        // 앱이 처음 실행되거나 DB_VERSION이 올라갔을 때만 실행
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(SETTINGS)) {
          db.createObjectStore(SETTINGS); // 열쇠(key)-값 형태: 'watermark' → {...}
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }).catch((err) => {
      dbPromise = null; // 다음에 다시 시도할 수 있게
      throw err;
    });
  }
  return dbPromise;
}

/** IndexedDB의 콜백 방식을 Promise(await 가능)로 바꿔주는 도우미 */
async function run(mode, action, storeName = STORE) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const req = action(tx.objectStore(storeName));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** 저장된 사진 전부 불러오기 (추가한 순서대로) */
export async function loadAllPhotos() {
  const rows = (await run('readonly', (s) => s.getAll())) ?? [];
  return rows.sort((a, b) => a.addedAt - b.addedAt);
}

/** 사진 1장 저장(같은 id가 있으면 덮어씀) */
export function savePhoto(record) {
  return run('readwrite', (s) => s.put(record));
}

/** 일부 값만 바꾸기 (예: 판정 수정) */
export async function updatePhoto(id, changes) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const get = store.get(id);
    get.onsuccess = () => {
      if (get.result) store.put({ ...get.result, ...changes });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 사진 1장 삭제 */
export function deletePhoto(id) {
  return run('readwrite', (s) => s.delete(id));
}

/** 전부 삭제 */
export function clearPhotos() {
  return run('readwrite', (s) => s.clear());
}

/**
 * 브라우저에게 "이 데이터는 함부로 지우지 마세요" 요청.
 * 저장 공간이 부족할 때 브라우저가 오래된 데이터를 자동 삭제하는 것을 막습니다.
 * (홈 화면에 설치한 PWA는 대부분 자동으로 허용됩니다)
 */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    /* 지원하지 않는 브라우저는 그냥 넘어감 */
  }
}

/** 설정 값 읽기 (없으면 undefined) */
export function getSetting(key) {
  return run('readonly', (s) => s.get(key), SETTINGS);
}

/** 설정 값 저장 (로고 이미지 Blob도 그대로 저장 가능) */
export function setSetting(key, value) {
  return run('readwrite', (s) => s.put(value, key), SETTINGS);
}
