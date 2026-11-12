/** 주변 주유소 — 오피넷(가격 포함) 우선, 안 되면 OpenStreetMap */
export const OPINET_PROXY_URL = 'https://car-ledger-opinet.han0829.workers.dev';

export interface Station {
  id: string;
  name: string;
  brand?: string;
  address?: string;
  lat: number;
  lng: number;
  dist: number;
  price?: number | null;
  lpg?: boolean;
  source: 'opinet' | 'osm';
}
export interface Pos { lat: number; lng: number }

export const distanceM = (a: Pos, b: Pos) => {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
export const fmtDist = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10}m` : `${(m / 1000).toFixed(1)}km`);

export function getPosition(): Promise<Pos> {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('NO_GEO'));
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => rej(new Error(e.code === 1 ? 'DENIED' : 'FAIL')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  });
}
export async function geoGranted() {
  try {
    const p = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
    return p?.state === 'granted';
  } catch {
    return false;
  }
}

const cacheGet = <T,>(k: string, ms: number): T | null => {
  try {
    const c = JSON.parse(localStorage.getItem(k) ?? 'null');
    return c && Date.now() - c.t < ms ? c.v : null;
  } catch {
    return null;
  }
};
const cacheSet = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify({ t: Date.now(), v }));
  } catch {
    /* 공간 없음 */
  }
};

export const opinetSupports = (fuelType: string) => fuelType !== 'electric';

export async function findStations(pos: Pos, fuelType: string): Promise<Station[]> {
  if (OPINET_PROXY_URL && opinetSupports(fuelType)) {
    try {
      return await findOpinet(pos, fuelType);
    } catch (e) {
      console.warn('오피넷 실패, OpenStreetMap 사용', e);
    }
  }
  return findOsm(pos, fuelType);
}

async function findOpinet(pos: Pos, fuelType: string): Promise<Station[]> {
  const key = `scl-op:${fuelType}:${pos.lat.toFixed(3)},${pos.lng.toFixed(3)}`;
  const hit = cacheGet<Station[]>(key, 30 * 60000);
  if (hit) return withDist(hit, pos);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  const r = await fetch(`${OPINET_PROXY_URL}/around?lat=${pos.lat}&lng=${pos.lng}&fuel=${encodeURIComponent(fuelType)}&radius=5000&sort=distance`, { signal: ctrl.signal });
  clearTimeout(t);
  if (!r.ok) throw new Error(`opinet ${r.status}`);
  const j = await r.json();
  const list: Station[] = (j.stations ?? [])
    .filter((s: { lat: number | null; lng: number | null }) => s.lat != null && s.lng != null)
    .map((s: { id: string; name: string; brand: string; price: number | null; lat: number; lng: number }) => ({
      id: s.id, name: s.name, brand: s.brand, price: s.price, lat: s.lat, lng: s.lng, dist: 0, lpg: fuelType === 'lpg', source: 'opinet' as const,
    }));
  if (!list.length) throw new Error('opinet empty');
  cacheSet(key, list);
  return withDist(list, pos);
}

const BRANDS: [RegExp, string][] = [
  [/SK|에스케이/i, 'SK에너지'], [/GS|칼텍스/i, 'GS칼텍스'], [/S-?OIL|에쓰오일/i, 'S-OIL'],
  [/현대오일|오일뱅크|hyundai/i, 'HD현대오일뱅크'], [/알뜰/, '알뜰'], [/E1/i, 'E1'],
];

async function findOsm(pos: Pos, fuelType: string): Promise<Station[]> {
  const ev = fuelType === 'electric';
  const key = `scl-st:${ev ? 'ev' : 'fuel'}:${pos.lat.toFixed(2)},${pos.lng.toFixed(2)}`;
  let list = cacheGet<Station[]>(key, 7 * 864e5);
  if (!list) {
    const sel = ev ? '["amenity"="charging_station"]' : '["amenity"="fuel"]';
    list = [];
    for (const radius of [3000, 8000]) {
      const q = `[out:json][timeout:20];nwr${sel}(around:${radius},${pos.lat},${pos.lng});out center tags 80;`;
      list = await overpass(q);
      if (list.length >= 3) break;
    }
    cacheSet(key, list);
  }
  let out = withDist(list, pos);
  if (fuelType === 'lpg') {
    const only = out.filter((s) => s.lpg);
    if (only.length) out = only;
  }
  return out;
}

async function overpass(q: string): Promise<Station[]> {
  let err: unknown;
  for (const host of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
    try {
      const r = await fetch(host, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'content-type': 'application/x-www-form-urlencoded' } });
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json();
      return (j.elements ?? [])
        .map((e: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }) => {
          const t = e.tags ?? {};
          const lat = e.lat ?? e.center?.lat, lng = e.lon ?? e.center?.lon;
          if (lat == null || lng == null) return null;
          const label = `${t.brand ?? ''} ${t.operator ?? ''} ${t.name ?? ''}`;
          const brand = BRANDS.find(([re]) => re.test(label))?.[1];
          const addr = t['addr:full'] || [t['addr:city'], t['addr:district'], t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ');
          return {
            id: `${e.type}/${e.id}`,
            name: t['name:ko'] || t.name || (brand ? `${brand} 주유소` : '이름 없는 주유소'),
            brand, address: addr || undefined, lat, lng, dist: 0,
            lpg: t['fuel:lpg'] === 'yes' || /LPG|충전소/.test(t.name ?? ''),
            source: 'osm' as const,
          };
        })
        .filter(Boolean) as Station[];
    } catch (e) {
      err = e;
    }
  }
  throw err ?? new Error('NETWORK');
}

const withDist = (list: Station[], pos: Pos) =>
  list.map((s) => ({ ...s, dist: distanceM(pos, s) })).sort((a, b) => a.dist - b.dist);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let leafletP: Promise<any> | null = null;
export function loadLeaflet() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  leafletP ??= new Promise((res, rej) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    s.onload = () => res(w.L);
    s.onerror = () => {
      leafletP = null;
      rej(new Error('leaflet'));
    };
    document.head.appendChild(s);
  });
  return leafletP;
}
