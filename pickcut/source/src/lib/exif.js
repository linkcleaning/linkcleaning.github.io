// ═════════════════════════════════════════════════════════════
// exif.js — 사진 '정보'(EXIF)에서 촬영 날짜를 읽고, 저장할 사진에 다시 넣기
//
// 왜 필요한가?
//   앱이 사진을 줄이거나 로고를 넣으면(캔버스로 다시 그리면) 사진 정보가 전부 사라집니다.
//   그러면 폰 갤러리가 '저장한 날(오늘)'로 정리해 버려서 사진 순서가 뒤죽박죽이 됩니다.
//   → 원본에서 촬영 날짜를 읽어 두었다가, 저장할 때 같은 날짜를 다시 적어 넣습니다.
//
// EXIF 날짜 형식: "2026:10:24 09:31:05" (콜론 구분, 시간대 없음 = 찍은 곳 현지 시각)
// ═════════════════════════════════════════════════════════════

const TAG_DATETIME = 0x0132;          // 수정한 날짜 (IFD0)
const TAG_EXIF_IFD = 0x8769;          // 세부 정보 묶음 위치
const TAG_DATETIME_ORIGINAL = 0x9003; // ★ 촬영한 날짜
const TAG_DATETIME_DIGITIZED = 0x9004;
const TAG_OFFSET_ORIGINAL = 0x9011;   // 시간대 (예: "+09:00")

/* ───────────── 읽기 ───────────── */

/**
 * 사진 파일에서 촬영 날짜 읽기
 * @param {File} file
 * @returns {Promise<{ exif: string, offset: string|null, ts: number, source: 'exif'|'file' } | null>}
 *   exif   : "2026:10:24 09:31:05"  (저장할 때 그대로 다시 씀)
 *   ts     : 정렬·표시용 숫자 시각
 *   source : 'exif' = 사진 정보에서 읽음, 'file' = 정보가 없어 파일 수정 시각으로 대신함
 */
export async function readCaptureDate(file) {
  try {
    // EXIF는 파일 앞부분에 있으므로 앞 128KB만 읽음 (큰 사진도 빠름)
    const buf = await file.slice(0, 128 * 1024).arrayBuffer();
    const found = parseJpegDates(new DataView(buf));
    if (found?.exif) {
      return { ...found, ts: exifToTs(found.exif), source: 'exif' };
    }
  } catch {
    /* 정보가 깨졌거나 JPEG가 아님 → 아래 대체 방법 */
  }
  // 대체: 파일 수정 시각 (안드로이드는 대개 촬영 시각과 같음, 아이폰은 고른 시각일 수 있음)
  if (file.lastModified) {
    const exif = tsToExif(file.lastModified);
    return { exif, offset: null, ts: file.lastModified, source: 'file' };
  }
  return null;
}

/** JPEG 안에서 EXIF 묶음(APP1)을 찾아 날짜 태그 읽기 */
function parseJpegDates(view) {
  if (view.getUint16(0) !== 0xffd8) return null; // JPEG 시작 표시가 아님
  let pos = 2;
  while (pos + 4 < view.byteLength) {
    const marker = view.getUint16(pos);
    const size = view.getUint16(pos + 2);
    if (marker === 0xffe1 && view.getUint32(pos + 4) === 0x45786966) {
      // "Exif" 발견 → 그 뒤 6바이트 다음부터 TIFF 구조
      return parseTiff(view, pos + 10);
    }
    if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) break; // 사진 데이터 시작 → 중단
    pos += 2 + size;
  }
  return null;
}

function parseTiff(view, start) {
  const little = view.getUint16(start) === 0x4949; // "II" = 리틀엔디언
  const u16 = (o) => view.getUint16(start + o, little);
  const u32 = (o) => view.getUint32(start + o, little);
  const readAscii = (entry) => {
    const count = u32(entry + 4);
    const off = count > 4 ? u32(entry + 8) : entry + 8;
    let s = '';
    for (let i = 0; i < count - 1; i++) s += String.fromCharCode(view.getUint8(start + off + i));
    return s.trim();
  };
  const readIfd = (ifdOff) => {
    const tags = {};
    const n = u16(ifdOff);
    for (let i = 0; i < n; i++) {
      const e = ifdOff + 2 + i * 12;
      const tag = u16(e);
      const type = u16(e + 2);
      tags[tag] = type === 2 ? readAscii(e) : u32(e + 8);
    }
    return tags;
  };

  const ifd0 = readIfd(u32(4));
  const exifIfd = ifd0[TAG_EXIF_IFD] ? readIfd(ifd0[TAG_EXIF_IFD]) : {};
  const exif = valid(exifIfd[TAG_DATETIME_ORIGINAL]) || valid(exifIfd[TAG_DATETIME_DIGITIZED]) || valid(ifd0[TAG_DATETIME]);
  return { exif, offset: exifIfd[TAG_OFFSET_ORIGINAL] || null };
}

/** "0000:00:00 00:00:00" 같은 빈 날짜 걸러내기 */
function valid(s) {
  return typeof s === 'string' && /^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/.test(s) && !s.startsWith('0000') ? s : null;
}

/* ───────────── 변환 도우미 ───────────── */

/** "2026:10:24 09:31:05" → 숫자 시각 (폰의 현지 시각 기준) */
export function exifToTs(exif) {
  const [d, t] = exif.split(' ');
  const [Y, M, D] = d.split(':').map(Number);
  const [h, m, s] = t.split(':').map(Number);
  return new Date(Y, M - 1, D, h, m, s).getTime();
}

/** 숫자 시각 → "2026:10:24 09:31:05" */
export function tsToExif(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}:${p(d.getMonth() + 1)}:${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 화면 표시용: "2026.10.24 (토) 09:31" */
export function formatCapture(exif) {
  if (!exif) return '';
  const ts = exifToTs(exif);
  const day = '일월화수목금토'[new Date(ts).getDay()];
  const [d, t] = exif.split(' ');
  return `${d.replaceAll(':', '.')} (${day}) ${t.slice(0, 5)}`;
}

/** 날짜 묶음 열쇠: "2026:10:24" */
export function dayKey(exif) {
  return exif ? exif.slice(0, 10) : 'unknown';
}

/* ───────────── 쓰기 ───────────── */

/**
 * JPEG 파일에 촬영 날짜 정보를 넣기
 * 회전 정보는 넣지 않습니다(캔버스가 이미 바르게 돌려서 그렸으므로, 넣으면 두 번 돌아감).
 * @param {Blob} jpeg    캔버스로 만든 JPEG
 * @param {string} exif  "2026:10:24 09:31:05"
 * @param {string|null} offset "+09:00"
 * @returns {Promise<Blob>}
 */
export async function stampCaptureDate(jpeg, exif, offset = null) {
  if (!valid(exif)) return jpeg;
  const bytes = new Uint8Array(await jpeg.arrayBuffer());
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return jpeg;

  const app1 = buildExifApp1(exif, offset);

  // JFIF 표시(APP0)가 있으면 그 뒤에, 없으면 맨 앞(SOI 바로 뒤)에 끼워 넣음
  let insertAt = 2;
  if (bytes[2] === 0xff && bytes[3] === 0xe0) insertAt = 4 + ((bytes[4] << 8) | bytes[5]);
  return new Blob([bytes.subarray(0, insertAt), app1, bytes.subarray(insertAt)], { type: 'image/jpeg' });
}

/** 최소한의 EXIF 묶음 만들기: 촬영일·디지털화일·수정일(+시간대) */
function buildExifApp1(exif, offset) {
  const ascii = (s) => [...s].map((c) => c.charCodeAt(0)).concat(0); // 끝에 0
  const dateBytes = ascii(exif); // 20바이트
  const exifTags = [
    { tag: TAG_DATETIME_ORIGINAL, data: dateBytes },
    { tag: TAG_DATETIME_DIGITIZED, data: dateBytes },
  ];
  if (offset && /^[+-]\d{2}:\d{2}$/.test(offset)) exifTags.push({ tag: TAG_OFFSET_ORIGINAL, data: ascii(offset) });

  // 배치: [TIFF 머리 8] [IFD0: 2 + 2×12 + 4] [ExifIFD: 2 + n×12 + 4] [값들]
  const ifd0Off = 8;
  const ifd0Size = 2 + 2 * 12 + 4;
  const exifOff = ifd0Off + ifd0Size;
  const exifSize = 2 + exifTags.length * 12 + 4;
  let dataOff = exifOff + exifSize;

  const out = [];
  const w16 = (v) => out.push((v >> 8) & 0xff, v & 0xff);
  const w32 = (v) => out.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
  const values = [];
  const entry = (tag, data) => {
    // 형식 2 = 글자(ASCII), 4바이트 넘으면 값 위치를 적음
    w16(tag); w16(2); w32(data.length); w32(dataOff);
    values.push(...data);
    dataOff += data.length;
  };

  // TIFF 머리: "MM"(빅엔디언) + 42 + IFD0 위치
  out.push(0x4d, 0x4d); w16(42); w32(ifd0Off);
  // IFD0: 수정일 + ExifIFD 위치 (태그 번호 오름차순)
  w16(2);
  entry(TAG_DATETIME, dateBytes);
  w16(TAG_EXIF_IFD); w16(4); w32(1); w32(exifOff);
  w32(0);
  // ExifIFD
  w16(exifTags.length);
  exifTags.forEach((t) => entry(t.tag, t.data));
  w32(0);
  out.push(...values);

  const payload = [0x45, 0x78, 0x69, 0x66, 0, 0, ...out]; // "Exif\0\0" + TIFF
  const len = payload.length + 2;
  return new Uint8Array([0xff, 0xe1, (len >> 8) & 0xff, len & 0xff, ...payload]);
}
