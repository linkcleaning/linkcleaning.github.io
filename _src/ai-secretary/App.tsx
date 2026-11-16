import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSun,
  CloudFog,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  Droplets,
  Umbrella,
  Wind,
  RefreshCw,
  CircleCheck,
  Circle,
  Plus,
  Trash2,
  Pencil,
  X,
  Search,
  Sparkles,
  Copy,
  Settings,
  Flame,
  ClipboardList,
  Newspaper,
  KeyRound,
  StickyNote,
  Check,
  TriangleAlert,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Save,
  Volume2,
  Square,
  Mic,
  MicOff,
  Smartphone,
  Play,
  Download,
  TrendingUp,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';

/* =========================================================
 *  타입 정의
 * ========================================================= */
type Tab = 'brief' | 'routine' | 'sales' | 'keyword' | 'memo' | 'siri';
type CityKey = 'jeju' | 'seogwipo';
type PlaceKey = CityKey | 'here'; // here = 휴대폰 현재 위치
interface HerePos {
  lat: number;
  lon: number;
  name: string;
  at: number;
}
type WeatherKind = 'rain' | 'humid' | 'clear';
type Season = 'spring' | 'summer' | 'autumn' | 'winter';

interface Weather {
  place: PlaceKey;
  placeName: string;
  temp: number;
  feels: number;
  humidity: number;
  code: number;
  wind: number; // m/s
  popNow: number; // 현재 시간대 강수확률
  popRest: number; // 오늘 남은 시간 중 최고 강수확률
  popMax: number; // 오늘 하루 최고 강수확률
  tMax: number;
  tMin: number;
  fetchedAt: number;
}

interface Routine {
  id: string;
  category: string;
  title: string;
  emoji: string;
  subs: string[]; // 예: ['아침','점심','저녁'] — 비어 있으면 단일 체크
}

interface RoutineDay {
  date: string;
  checks: Record<string, boolean>;
}

type History = Record<string, { done: number; total: number }>;

interface Keyword {
  id: string;
  text: string;
}

interface RankRec {
  place?: number; // (구버전) 플레이스 수동 기록 — 0 = 권외
  blog?: number; // 블로그 검색 순위 — 0 = 권외
  web?: number; // 홈페이지(웹문서) 검색 순위 — 0 = 권외
  auto?: Partial<Record<RankField, boolean>>; // 자동 체크로 들어간 값 표시
}
type RankField = 'place' | 'blog' | 'web';
const RANK_FIELDS: { key: RankField; label: string; where: string }[] = [
  { key: 'blog', label: '블로그', where: 'm_blog' },
  { key: 'web', label: '홈페이지', where: 'm_web' },
];
const rankLabel = (f: RankField) => RANK_FIELDS.find((x) => x.key === f)?.label ?? '플레이스';

interface AutoRankResult {
  ok: boolean;
  error?: string;
  blog?: { rank: number; title?: string; link?: string } | null;
  web?: { rank: number; title?: string; link?: string } | null;
}
type RankBook = Record<string, Record<string, RankRec>>; // [날짜][키워드ID]
type GoldenMode = 'local' | 'ai' | 'data';

interface GoldenKeyword {
  kw: string;
  reason: string;
  total?: number; // 월간 검색수 (PC+모바일) — 데이터 추천일 때만
  pc?: number;
  mobile?: number;
  comp?: string; // 경쟁 정도: 낮음 | 중간 | 높음
  regional?: boolean;
}
interface GoldenTitle {
  title: string;
  intro: string;
}
interface Golden {
  date: string;
  source: 'ai' | 'local' | 'data' | 'agent';
  keywords: GoldenKeyword[];
  titles: GoldenTitle[];
  pool?: GoldenKeyword[]; // 데이터 추천 후보 TOP (점수순)
  titleBy?: 'ai' | 'local';
}

interface Memo {
  id: string;
  text: string;
  tag: string;
  done: boolean;
  createdAt: number;
}

interface AppSettings {
  geminiKey: string;
  geminiModel: string;
  company: string;
  years: number;
  defaultCity: CityKey;
  iconStyle?: IconStyle;
  rankWorkerUrl?: string; // 네이버 순위 자동 체크 중계 서버(Cloudflare Worker) 주소
  blogId?: string; // 내 네이버 블로그 ID 또는 주소
  siteDomain?: string; // 내 홈페이지 도메인
  monthlyTarget?: number; // 이번 달 매출 목표 (원)
  reviewUrl?: string; // 네이버 리뷰 작성 링크
  hubPin?: string; // 링크 허브(세무장부·순위노트·자동콜백) 읽기 비밀번호 — 코드에 넣지 않고 이 폰에만 저장
}

type IconStyle = 'vip' | 'emerald' | 'mono';

/* =========================================================
 *  기본값 & 상수
 * ========================================================= */
const CITIES: Record<CityKey, { name: string; lat: number; lon: number }> = {
  jeju: { name: '제주시', lat: 33.4996, lon: 126.5312 },
  seogwipo: { name: '서귀포시', lat: 33.2541, lon: 126.56 },
};

const DEFAULT_ROUTINES: Routine[] = [
  { id: 'r1', category: '오전 루틴', title: '출근 거울샷 촬영 완료', emoji: '📸', subs: [] },
  { id: 'r2', category: '건강 관리', title: '아침/점심/저녁 약 챙겨 먹기', emoji: '💊', subs: ['아침', '점심', '저녁'] },
  { id: 'r3', category: '마케팅 루틴', title: '네이버 블로그 포스팅 1건 작성', emoji: '✍️', subs: [] },
  { id: 'r4', category: '채널 관리', title: '스마트플레이스 새소식 / 당근마켓 소식 업데이트', emoji: '🥕', subs: [] },
  { id: 'r5', category: '현장 관리', title: '내일 청소 스케줄 확인 및 장비·약품 점검', emoji: '🛠️', subs: [] },
];

const DEFAULT_KEYWORDS: Keyword[] = [
  '제주청소업체',
  '제주입주청소',
  '제주이사청소',
  '서귀포입주청소',
  '서귀포청소업체',
  '제주상가청소',
].map((text, i) => ({ id: `k${i + 1}`, text }));

const DEFAULT_SETTINGS: AppSettings = {
  geminiKey: '',
  geminiModel: 'gemini-2.5-flash',
  company: '링크클린',
  years: 12,
  defaultCity: 'jeju',
  iconStyle: 'vip',
  rankWorkerUrl: '',
  blogId: '',
  siteDomain: 'linkclean.co.kr',
};

/** 중계 서버로 키워드 1개의 블로그·홈페이지 순위를 받아옴 */
async function fetchAutoRank(s: AppSettings, keyword: string): Promise<AutoRankResult> {
  const base = (s.rankWorkerUrl || '').trim().replace(/\/+$/, '');
  const qs = new URLSearchParams({ q: keyword });
  if (s.blogId?.trim()) qs.set('blog', s.blogId.trim());
  else if (s.company?.trim()) qs.set('name', s.company.trim());
  if (s.siteDomain?.trim()) qs.set('site', s.siteDomain.trim());
  const res = await fetch(`${base}/?${qs.toString()}`);
  let data: AutoRankResult;
  try {
    data = (await res.json()) as AutoRankResult;
  } catch {
    throw new Error(`중계 서버 응답 오류 (${res.status})`);
  }
  if (!res.ok || !data.ok) throw new Error(data.error || `중계 서버 오류 (${res.status})`);
  return data;
}

const MEMO_TAGS = [
  { key: '아이디어', cls: 'bg-cw/15 text-amber-200 border-cw/30' },
  { key: '고객', cls: 'bg-sky-400/15 text-sky-200 border-sky-400/30' },
  { key: '주문', cls: 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30' },
  { key: '할 일', cls: 'bg-rose-400/15 text-rose-200 border-rose-400/30' },
];

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const SK = 'aisec:'; // localStorage 키 접두어

/* =========================================================
 *  유틸
 * ========================================================= */
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (s: string, n: number) => {
  const [y, m, d] = s.split('-').map(Number);
  return ymd(new Date(y, m - 1, d + n));
};
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pickN<T>(arr: T[], n: number, r: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

const naverSearchUrl = (q: string, where?: string) =>
  `https://m.search.naver.com/search.naver?${where ? `where=${where}&` : ''}query=${encodeURIComponent(q)}`;

/* =========================================================
 *  음성: TTS(speechSynthesis) & 받아쓰기(SpeechRecognition)
 * ========================================================= */
function speakKo(text: string, onEnd?: () => void) {
  const synth = window.speechSynthesis;
  if (!synth) return false;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.rate = 1;
  u.pitch = 1;
  const voice = synth.getVoices().find((v) => (v.lang || '').replace('_', '-').toLowerCase().startsWith('ko'));
  if (voice) u.voice = voice;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  synth.speak(u);
  return true;
}

interface SRResultEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}
interface SRLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SRResultEvent) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
function getSpeechRecognition(): (new () => SRLike) | null {
  const w = window as unknown as Record<string, unknown>;
  return ((w.SpeechRecognition || w.webkitSpeechRecognition) as (new () => SRLike) | undefined) ?? null;
}

const STORAGE_KEYS = ['tab', 'settings', 'routines', 'routineDay', 'history', 'keywords', 'ranks', 'golden', 'memos', 'deals', 'agentDone'];

/* =========================================================
 *  훅: localStorage 동기화 / 오늘 날짜 감지
 * ========================================================= */
function useLocal<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(SK + key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(SK + key, JSON.stringify(value));
    } catch {
      /* 저장공간 부족 등은 무시 */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

/** 자정이 지나면(또는 다음 날 앱을 다시 열면) 새 날짜를 돌려줌 */
function useToday() {
  const [today, setToday] = useState(ymd());
  useEffect(() => {
    const check = () => setToday(ymd());
    const timer = setInterval(check, 30_000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, []);
  return today;
}

/* =========================================================
 *  날씨 (Open-Meteo, API 키 불필요)
 * ========================================================= */
/** 휴대폰 GPS로 현재 좌표 받기 (권한을 물어봄) */
function getPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('unsupported'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => reject(e),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

/** 좌표 → '제주시 노형동' 같은 동네 이름 (키 없는 무료 서비스, 실패하면 '현재 위치') */
async function placeNameOf(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ko`,
    );
    if (!res.ok) throw new Error();
    const d = (await res.json()) as { city?: string; locality?: string; principalSubdivision?: string };
    const city = (d.city || d.principalSubdivision || '').trim();
    const loc = (d.locality || '').trim();
    const name = loc && loc !== city ? `${city} ${loc}`.trim() : city;
    return name || '현재 위치';
  } catch {
    return '현재 위치';
  }
}

async function fetchWeather(place: PlaceKey, here?: HerePos | null): Promise<Weather> {
  const base = place === 'here' && here ? { lat: here.lat, lon: here.lon, name: here.name } : CITIES[place === 'here' ? 'jeju' : place];
  const { lat, lon } = base;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
    `&hourly=precipitation_probability` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&wind_speed_unit=ms&timezone=Asia%2FSeoul&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('weather fetch failed');
  const d = await res.json();

  const nowKey = String(d.current.time).slice(0, 13); // YYYY-MM-DDTHH
  const times: string[] = d.hourly?.time ?? [];
  const probs: (number | null)[] = d.hourly?.precipitation_probability ?? [];
  const idx = times.findIndex((t) => t.startsWith(nowKey));
  const popNow = idx >= 0 ? probs[idx] ?? 0 : 0;
  let popRest = popNow;
  if (idx >= 0) {
    for (let i = idx; i < probs.length; i++) popRest = Math.max(popRest, probs[i] ?? 0);
  }

  return {
    place,
    placeName: base.name,
    temp: Math.round(d.current.temperature_2m * 10) / 10,
    feels: Math.round(d.current.apparent_temperature * 10) / 10,
    humidity: Math.round(d.current.relative_humidity_2m),
    code: Number(d.current.weather_code),
    wind: Math.round(d.current.wind_speed_10m * 10) / 10,
    popNow,
    popRest,
    popMax: d.daily?.precipitation_probability_max?.[0] ?? popRest,
    tMax: Math.round(d.daily?.temperature_2m_max?.[0] ?? d.current.temperature_2m),
    tMin: Math.round(d.daily?.temperature_2m_min?.[0] ?? d.current.temperature_2m),
    fetchedAt: Date.now(),
  };
}

function weatherInfo(code: number): { label: string; Icon: LucideIcon } {
  if (code === 0) return { label: '맑음', Icon: Sun };
  if (code <= 2) return { label: '구름 조금', Icon: CloudSun };
  if (code === 3) return { label: '흐림', Icon: Cloud };
  if (code === 45 || code === 48) return { label: '안개', Icon: CloudFog };
  if (code >= 51 && code <= 57) return { label: '이슬비', Icon: CloudDrizzle };
  if (code >= 61 && code <= 67) return { label: '비', Icon: CloudRain };
  if (code >= 71 && code <= 77) return { label: '눈', Icon: CloudSnow };
  if (code >= 80 && code <= 82) return { label: '소나기', Icon: CloudRain };
  if (code === 85 || code === 86) return { label: '눈 소나기', Icon: CloudSnow };
  if (code >= 95) return { label: '뇌우', Icon: CloudLightning };
  return { label: '흐림', Icon: Cloud };
}

function weatherKind(w: Weather): WeatherKind {
  if (w.code >= 51 || w.popRest >= 60) return 'rain';
  if (w.humidity >= 75 || w.popRest >= 30) return 'humid';
  return 'clear';
}

const CONDITION: Record<WeatherKind, { label: string; desc: string; cls: string; dot: string }> = {
  clear: {
    label: '환기·건조 최적',
    desc: '창문 개방 환기, 외부 유리창·베란다 물청소, 침구 건조 작업에 좋은 날입니다.',
    cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40',
    dot: 'bg-emerald-400',
  },
  humid: {
    label: '습도 높음·제습/살균 추천',
    desc: '물기 마감이 늦어집니다. 제습기·송풍기 지참, 욕실·주방은 살균 마감까지 챙기세요.',
    cls: 'bg-yellow-500/15 text-yellow-200 border-yellow-400/40',
    dot: 'bg-yellow-400',
  },
  rain: {
    label: '우천·실내 곰팡이/케어 집중',
    desc: '외부 작업은 미루고 욕실 곰팡이, 주방 기름때, 실내 살균 위주로 동선을 재배치하세요.',
    cls: 'bg-rose-500/15 text-rose-300 border-rose-400/40',
    dot: 'bg-rose-400',
  },
};

function seasonOf(month: number): Season {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

/* =========================================================
 *  오늘의 제주/시즌 이슈
 * ========================================================= */
const MONTH_ISSUES: Record<number, { title: string; desc: string }[]> = {
  1: [
    { title: '겨울 결로·곰팡이 집중 관리', desc: '실내외 온도차로 창틀·베란다 결로가 심한 시기. 결로 제거 + 곰팡이 방지 코팅 제안 타이밍입니다.' },
    { title: '봄 이사철 조기예약 문의 시작', desc: '2~3월 이사철 대비 입주·이사청소 예약 문의가 늘기 시작합니다. 조기예약 할인 공지를 추천드립니다.' },
  ],
  2: [
    { title: '이사철 입주청소 성수기 진입', desc: '졸업·입학·인사이동으로 입주/이사청소가 몰립니다. 일정 선점과 인력 배치를 미리 점검하세요.' },
    { title: '겨우내 생긴 곰팡이 제거 수요', desc: '창틀 실리콘·벽지 모서리 곰팡이 제거 문의가 많은 시기입니다.' },
  ],
  3: [
    { title: '봄 이사철 최대 성수기', desc: '입주·이사청소 문의 피크. 후기 포스팅과 스마트플레이스 예약 응대 속도가 순위를 좌우합니다.' },
    { title: '황사 시작 – 창틀·방충망 청소', desc: '미세먼지·황사로 창틀과 방충망 오염이 빠르게 쌓입니다. 창틀 패키지 홍보 적기입니다.' },
  ],
  4: [
    { title: '송화가루·황사 창틀 청소 시즌', desc: '제주는 4~5월 송화가루가 심합니다. 창틀·베란다·방충망 청소 콘텐츠를 집중 발행하세요.' },
    { title: '신축 입주 물량 체크', desc: '신축 빌라·타운하우스 준공 일정을 확인하고 입주청소 단체 견적을 준비하세요.' },
  ],
  5: [
    { title: '에어컨 청소 예약 오픈 타이밍', desc: '본격 더위 전 에어컨 분해청소 예약을 미리 받으면 7월 과부하를 줄일 수 있습니다.' },
    { title: '여름 성수기 전 숙소 대청소', desc: '펜션·독채·한달살기 숙소의 여름 오픈 전 정비 청소 수요가 늘어납니다.' },
  ],
  6: [
    { title: '장마 대비 곰팡이·습기 케어', desc: '욕실·드레스룸·신발장 곰팡이 예방 청소와 제습 관리 콘텐츠가 잘 읽히는 시기입니다.' },
    { title: '에어컨 분해청소 피크 시작', desc: '에어컨 냄새 문의 급증. 작업 전후 사진으로 블로그 후기를 쌓으세요.' },
  ],
  7: [
    { title: '에어컨·곰팡이 최대 성수기', desc: '현장 일정이 가장 빡빡한 시기. 약품·필터 재고와 작업자 컨디션을 매일 점검하세요.' },
    { title: '관광 성수기 숙소 회전청소', desc: '체크아웃–체크인 사이 숙소 회전청소 수요가 많습니다. 고정 거래처 확보 기회입니다.' },
  ],
  8: [
    { title: '태풍·폭우 후 습기/침수 청소', desc: '태풍 소식이 있으면 침수·누수 후 청소, 곰팡이 긴급 케어 문의에 대비하세요.' },
    { title: '욕실·주방 악취 관리', desc: '고온다습으로 배수구·하수구 냄새 문의가 늘어납니다.' },
  ],
  9: [
    { title: '추석 전 대청소 수요', desc: '명절 전 거주청소·부모님 댁 청소 선물 수요를 겨냥한 포스팅을 추천합니다.' },
    { title: '태풍 후 외부 유리창·베란다 청소', desc: '염분·흙탕물 얼룩이 남은 외창·베란다 청소 문의가 늘어납니다.' },
  ],
  10: [
    { title: '가을 이사철 입주·이사청소', desc: '봄 다음 가는 이사 성수기입니다. 입주청소 후기 포스팅 비중을 높이세요.' },
    { title: '에어컨 청소 후 보관 & 환절기 케어', desc: '여름 내 사용한 에어컨 내부 곰팡이 제거 후 보관 청소를 제안할 타이밍입니다.' },
    { title: '감귤 수확철 – 별장·세컨하우스 관리', desc: '서귀포권 별장·세컨하우스 정기관리 문의가 늘어납니다. 정기계약 상품을 안내하세요.' },
  ],
  11: [
    { title: '겨울 전 결로 예방 청소', desc: '창틀 실리콘·결로 취약부 점검과 곰팡이 예방 코팅 제안 시기입니다.' },
    { title: '연말 상가·사무실 대청소 영업', desc: '연말 결산 전 상가·사무실 대청소 견적 문의가 늘어납니다. 상가청소 키워드를 강화하세요.' },
  ],
  12: [
    { title: '연말 대청소·사무실 청소 피크', desc: '종무식 전 사무실·상가 대청소 수요가 몰립니다. 일정 선점이 핵심입니다.' },
    { title: '결로·곰팡이 본격 시즌', desc: '난방 시작으로 결로가 심해집니다. 베란다·북향 방 곰팡이 케어 콘텐츠를 준비하세요.' },
  ],
};

function todayIssues(month: number, w: Weather | null) {
  const list: { tag: string; title: string; desc: string; warn?: boolean }[] = [];
  if (w) {
    const k = weatherKind(w);
    if (k === 'rain')
      list.push({ tag: '오늘 날씨', title: '우천 – 실내 작업 위주로 재배치', desc: '외부 유리창·베란다 물청소는 연기하고, 욕실·주방 곰팡이와 실내 살균 위주로 동선을 짜세요. 장비 방수 커버를 챙기세요.', warn: true });
    if (k === 'humid')
      list.push({ tag: '오늘 날씨', title: '고습도 – 제습·살균 마감 필수', desc: '물기가 늦게 마르면 얼룩·냄새가 남습니다. 제습기·송풍기를 지참하고 마무리 건조 시간을 넉넉히 잡으세요.' });
    if (k === 'clear')
      list.push({ tag: '오늘 날씨', title: '건조·환기 최적 – 외부 작업 적기', desc: '유리창·외벽·베란다 물청소와 매트리스·침구 건조 작업에 최적입니다. 비포/애프터 사진 찍기 좋은 날입니다.' });
    if (w.temp >= 30) list.push({ tag: '안전', title: '폭염 – 작업자 온열질환 주의', desc: '물·이온음료를 충분히 챙기고, 한낮 고강도 작업은 오전으로 당기세요.', warn: true });
    if (w.temp <= 3) list.push({ tag: '안전', title: '한파 – 물청소 동결 주의', desc: '외부 물청소 후 결빙 위험. 바닥 미끄럼과 장비 동파를 조심하세요.', warn: true });
    if (w.wind >= 9) list.push({ tag: '안전', title: '강풍 – 고소·외부 작업 주의', desc: '제주 특유의 강풍입니다. 사다리·외창 작업은 반드시 2인 1조로 진행하세요.', warn: true });
  }
  (MONTH_ISSUES[month] ?? []).forEach((i) => list.push({ tag: `${month}월 시즌`, ...i }));
  return list;
}

/* =========================================================
 *  황금키워드 – 내장 스마트 추천 알고리즘
 * ========================================================= */
const SEASON_POOL: Record<Season, GoldenKeyword[]> = {
  spring: [
    { kw: '제주 입주청소', reason: '봄 이사철 성수기로 검색량이 연중 최고 수준입니다.' },
    { kw: '제주 이사청소 비용', reason: '이사 앞둔 고객이 견적 비교 단계에서 가장 많이 찾는 롱테일입니다.' },
    { kw: '송화가루 창틀청소', reason: '4~5월 제주 송화가루로 창틀 오염 검색이 급증합니다.' },
    { kw: '제주 베란다 청소', reason: '황사·꽃가루 시즌에 베란다·방충망 청소 수요가 함께 오릅니다.' },
    { kw: '서귀포 입주청소', reason: '서귀포 신축·이주 수요로 경쟁 대비 전환율이 높은 키워드입니다.' },
    { kw: '제주 새집증후군 청소', reason: '신축 입주 고객이 입주청소와 함께 검색하는 연관 키워드입니다.' },
  ],
  summer: [
    { kw: '제주 에어컨청소', reason: '여름 피크 키워드. 사용 직전·사용 중 냄새 문의가 폭증합니다.' },
    { kw: '제주 곰팡이제거', reason: '고온다습한 제주 여름, 욕실·벽지 곰팡이 검색이 급증합니다.' },
    { kw: '제주 습기 제거 청소', reason: '장마철 눅눅함 해결을 찾는 정보성 검색이 많습니다.' },
    { kw: '서귀포 에어컨청소', reason: '서귀포권은 업체 수가 적어 상위노출이 상대적으로 쉽습니다.' },
    { kw: '제주 펜션 청소', reason: '관광 성수기 숙소 회전청소 거래처 확보용 키워드입니다.' },
    { kw: '제주 한달살기 숙소 청소', reason: '한달살기 운영자·이용자 모두 찾는 제주 특화 키워드입니다.' },
  ],
  autumn: [
    { kw: '제주 이사청소', reason: '가을 이사철로 검색량이 다시 오르는 시기입니다.' },
    { kw: '제주 입주청소 후기', reason: '업체 선택 직전 단계의 고객이 후기를 비교하는 키워드입니다.' },
    { kw: '에어컨 청소 후 보관', reason: '여름 사용 후 곰팡이 걱정으로 환절기에 꾸준히 검색됩니다.' },
    { kw: '제주 별장관리', reason: '세컨하우스·별장 정기관리 수요가 늘어나는 제주 특화 키워드입니다.' },
    { kw: '제주 거주청소', reason: '추석·환절기 대청소 수요로 생활 청소 검색이 늘어납니다.' },
    { kw: '서귀포 이사청소', reason: '서귀포권 경쟁이 약해 블로그 상위노출 가능성이 높습니다.' },
  ],
  winter: [
    { kw: '제주 결로 곰팡이', reason: '난방 시작과 함께 결로·곰팡이 고민 검색이 늘어납니다.' },
    { kw: '제주 입주청소 비용', reason: '봄 이사철 대비 미리 견적을 알아보는 고객이 늘어납니다.' },
    { kw: '제주 상가청소', reason: '연말·연초 상가·사무실 대청소 수요 키워드입니다.' },
    { kw: '제주 사무실 청소', reason: '연말 종무식·신년 준비 대청소 B2B 수요입니다.' },
    { kw: '신축 입주청소 체크리스트', reason: '입주 앞둔 고객이 정보 탐색 단계에서 찾는 정보성 키워드입니다.' },
    { kw: '서귀포 청소업체', reason: '연중 꾸준한 지역 대표 키워드로 플레이스 순위 관리에 중요합니다.' },
  ],
};

const COND_POOL: Record<WeatherKind, GoldenKeyword[]> = {
  rain: [
    { kw: '제주 곰팡이 제거업체', reason: '비 오는 날은 곰팡이 고민이 즉시 검색으로 이어집니다.' },
    { kw: '욕실 곰팡이 청소', reason: '우천 시 실내에 머무는 고객이 욕실 상태를 체감하는 날입니다.' },
    { kw: '비오는날 집청소 팁', reason: '정보성 글로 유입을 늘리고 상담으로 연결하기 좋은 키워드입니다.' },
  ],
  humid: [
    { kw: '제주 살균소독 청소', reason: '습도가 높은 날 위생·살균 관심도가 올라갑니다.' },
    { kw: '드레스룸 곰팡이', reason: '습한 날 옷장·드레스룸 냄새로 검색이 늘어납니다.' },
    { kw: '제주 습기 냄새 제거', reason: '제주 특유의 눅눅함을 해결하려는 정보성 검색입니다.' },
  ],
  clear: [
    { kw: '제주 유리창 청소', reason: '맑은 날은 창문 얼룩이 눈에 잘 띄어 유리창 청소 검색이 늘어납니다.' },
    { kw: '제주 외벽 청소', reason: '건조한 날 외부 작업 문의 전환율이 높습니다.' },
    { kw: '베란다 물청소', reason: '빨리 마르는 날이라 셀프·업체 베란다 청소 검색이 늘어납니다.' },
  ],
};

interface TitleCtx {
  company: string;
  years: number;
  month: number;
  year: number;
  region: string;
  weatherWord: string;
}

const TITLE_TEMPLATES: ((kw: string, c: TitleCtx) => GoldenTitle)[] = [
  (kw, c) => ({
    title: `${kw}, 업체 고르기 전 꼭 확인할 5가지 (${c.years}년차 현장 기준)`,
    intro: `${c.region}에서 ${c.years}년째 청소 현장을 다니며 가장 많이 듣는 질문이 있습니다. "어디에 맡겨야 후회가 없을까요?" 오늘은 견적 받기 전에 꼭 체크해야 할 5가지를 실제 현장 사진과 함께 정리했습니다.`,
  }),
  (kw, c) => ({
    title: `오늘 같은 ${c.weatherWord} 날, ${kw} 이렇게 하면 두 번 일 안 합니다`,
    intro: `${c.month}월 ${c.region} 날씨, 오늘은 유난히 ${c.weatherWord} 편이죠. 이런 날 청소를 잘못하면 금방 얼룩과 냄새가 다시 올라옵니다. 저희 현장에서 실제로 쓰는 순서와 약품 선택법을 공개합니다.`,
  }),
  (kw, c) => ({
    title: `[비포&애프터] ${kw} 실제 현장 후기 – 소요시간·비용까지 공개`,
    intro: `말보다 사진이 정확합니다. 이번 주 ${c.company} 팀이 다녀온 ${c.region} 현장의 작업 전후를 그대로 보여드릴게요. 비슷한 구조의 집이라면 견적 감 잡는 데 큰 도움이 되실 겁니다.`,
  }),
  (kw, c) => ({
    title: `${c.month}월 ${c.region}, ${kw} 미루면 생기는 일 3가지`,
    intro: `"나중에 하지 뭐" 하다가 비용이 두 배가 되는 경우를 현장에서 정말 많이 봤습니다. 지금 이 시기에 꼭 챙겨야 하는 이유를 ${c.years}년 현장 경험으로 짚어드립니다.`,
  }),
  (kw, c) => ({
    title: `${kw} 비용, 평수별로 솔직하게 정리했습니다 (${c.year} 최신)`,
    intro: `견적 문의 전화의 절반이 "그래서 얼마예요?"입니다. 평수·구조·오염도에 따라 비용이 어떻게 달라지는지, ${c.company}의 실제 기준으로 투명하게 정리했습니다.`,
  }),
];

const WEATHER_WORD: Record<WeatherKind, string> = { rain: '비 오는', humid: '눅눅한', clear: '맑은' };

function makeLocalTitles(keywords: GoldenKeyword[], date: string, w: Weather | null, s: AppSettings, nonce: string): GoldenTitle[] {
  const month = Number(date.slice(5, 7));
  const kind: WeatherKind = w ? weatherKind(w) : seasonOf(month) === 'summer' ? 'humid' : 'clear';
  const r = rng(hashStr(date + '|t|' + nonce + '|' + keywords.map((k) => k.kw).join()));
  const tpls = pickN(TITLE_TEMPLATES, Math.min(keywords.length, TITLE_TEMPLATES.length), r);
  return keywords.map((k, i) =>
    tpls[i % tpls.length](k.kw, {
      company: s.company || '저희 업체',
      years: s.years || 1,
      month,
      year: Number(date.slice(0, 4)),
      region: regionOf(k.kw),
      weatherWord: WEATHER_WORD[kind],
    }),
  );
}

function localGolden(date: string, w: Weather | null, s: AppSettings, nonce: string): Golden {
  const month = Number(date.slice(5, 7));
  const season = seasonOf(month);
  const kind: WeatherKind = w ? weatherKind(w) : season === 'summer' ? 'humid' : 'clear';
  const r = rng(hashStr(date + '|' + nonce + '|' + kind));
  const seasonPicks = pickN(SEASON_POOL[season], 2, r);
  const condPick = pickN(
    COND_POOL[kind].filter((k) => !seasonPicks.some((p) => p.kw === k.kw)),
    1,
    r,
  );
  const keywords = [...seasonPicks, ...condPick];
  return { date, source: 'local', keywords, titles: makeLocalTitles(keywords, date, w, s, nonce) };
}

/* =========================================================
 *  황금키워드 – 실제 검색량 데이터 (네이버 검색광고 키워드 도구)
 * ========================================================= */
const JEJU_AREAS = [
  '제주', '서귀포', '애월', '노형', '연동', '아라', '이도', '일도', '삼도', '도남', '화북', '삼양', '조천', '함덕', '구좌', '성산',
  '표선', '남원', '중문', '대정', '안덕', '한림', '한경', '외도', '용담', '오라', '하귀', '영어교육도시', '위미', '신제주', '구제주',
];
const SERVICE_TERMS = [
  '청소', '곰팡이', '에어컨', '세척', '소독', '방역', '줄눈', '코팅', '입주', '이사', '폐기물', '정리수납', '하우스키핑', '유리창',
  '외벽', '계단', '새집', '탄성', '결로', '습기', '냄새', '왁스', '광택', '케어', '세탁기', '매트리스', '후드', '타일',
];
const DEFAULT_SEEDS: Record<Season, string[]> = {
  spring: ['제주입주청소', '제주이사청소', '제주창틀청소'],
  summer: ['제주에어컨청소', '제주곰팡이제거', '제주입주청소'],
  autumn: ['제주이사청소', '제주입주청소', '제주에어컨청소'],
  winter: ['제주곰팡이제거', '제주입주청소', '제주사무실청소'],
};

const regionOf = (kw: string) => JEJU_AREAS.find((a) => kw.includes(a)) ?? '제주';
const isRegional = (kw: string) => JEJU_AREAS.some((a) => kw.includes(a));

/** 검색량은 많고(로그 스케일) 경쟁은 낮고 제주 지역이 붙은 키워드일수록 높은 점수 */
function goldenScore(k: GoldenKeyword, tracked: Set<string>) {
  const total = k.total ?? 0;
  const compF = k.comp === '낮음' ? 1.6 : k.comp === '높음' ? 0.55 : 1;
  const regionF = isRegional(k.kw) ? 1.5 : 0.7;
  const fresh = tracked.has(k.kw.replace(/\s+/g, '')) ? 0.85 : 1;
  return Math.log10(total + 10) * compF * regionF * fresh;
}

function dataReason(k: GoldenKeyword) {
  const tip =
    k.comp === '낮음'
      ? '경쟁이 낮아 블로그 상위노출을 노리기 좋습니다.'
      : k.comp === '높음'
        ? '수요는 크지만 경쟁이 셉니다. 지역명을 더 붙인 제목으로 공략하세요.'
        : '수요와 경쟁이 균형 잡힌 키워드입니다.';
  return `${isRegional(k.kw) ? '지역명이 붙은 키워드라 실제 문의로 이어질 확률이 높습니다. ' : ''}${tip}`;
}

async function fetchKeywordData(s: AppSettings, hints: string[]): Promise<GoldenKeyword[]> {
  const base = (s.rankWorkerUrl || '').trim().replace(/\/+$/, '');
  if (!base) throw new Error('no-worker');
  const qs = new URLSearchParams({ mode: 'kw', hints: hints.slice(0, 5).join(',') });
  const res = await fetch(`${base}/?${qs.toString()}`);
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; items?: GoldenKeyword[] };
  if (!res.ok || !data.ok) throw new Error(data.error || `서버 오류 (${res.status})`);
  return data.items ?? [];
}

async function dataGolden(date: string, w: Weather | null, s: AppSettings, tracked: string[]): Promise<Golden> {
  const month = Number(date.slice(5, 7));
  const r = rng(hashStr(date + '|seed'));
  const trackedClean = tracked.map((t) => t.replace(/\s+/g, ''));
  // 기준 키워드: 계절 기본 2개 + 추적 키워드 중 날마다 돌아가며 3개
  const seeds = [...DEFAULT_SEEDS[seasonOf(month)].slice(0, 2), ...pickN(trackedClean, 3, r)];
  const hints = Array.from(new Set(seeds)).slice(0, 5);
  const items = await fetchKeywordData(s, hints);
  const trackedSet = new Set(trackedClean);
  const pool = items
    .filter((k) => k.kw && (k.total ?? 0) >= 20 && SERVICE_TERMS.some((t) => k.kw.includes(t)))
    .map((k) => ({ ...k, regional: isRegional(k.kw), reason: dataReason(k) }))
    .sort((a, b) => goldenScore(b, trackedSet) - goldenScore(a, trackedSet))
    .slice(0, 15);
  if (pool.length === 0) throw new Error('관련 키워드 데이터가 없습니다.');
  const keywords = pool.slice(0, 3);
  let titles: GoldenTitle[] = makeLocalTitles(keywords, date, w, s, 'data');
  let titleBy: 'ai' | 'local' = 'local';
  if (s.geminiKey.trim()) {
    try {
      const ai = await geminiGolden(date, w, s, tracked, keywords);
      titles = ai.titles;
      titleBy = 'ai';
    } catch {
      /* 내장 제목 유지 */
    }
  }
  return { date, source: 'data', keywords, titles, pool, titleBy };
}

/* =========================================================
 *  황금키워드 – Gemini AI (설정에 키가 있을 때)
 * ========================================================= */
async function geminiGolden(
  date: string,
  w: Weather | null,
  s: AppSettings,
  myKeywords: string[],
  fixed?: GoldenKeyword[],
): Promise<Golden> {
  const month = Number(date.slice(5, 7));
  const [y, m, d] = date.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  const wText = w
    ? `${w.placeName} 기온 ${w.temp}℃, 습도 ${w.humidity}%, ${weatherInfo(w.code).label}, 오늘 최고 강수확률 ${w.popMax}%, 바람 ${w.wind}m/s`
    : '날씨 정보 없음';

  const prompt = `너는 제주 청소업체 '${s.company}'(제주 ${s.years}년차, 입주·이사·거주·상가·에어컨 청소)의 네이버 블로그 SEO 마케팅 전문가다.
오늘: ${date} (${month}월, ${weekday}요일)
제주 날씨: ${wText}
현재 관리 중인 핵심 키워드: ${myKeywords.join(', ')}

${
    fixed?.length
      ? `네이버 검색광고 실제 데이터로 고른 오늘의 황금키워드: ${fixed
          .map((k) => `${k.kw}(월 ${k.total ?? 0}회, 경쟁 ${k.comp || '-'})`)
          .join(', ')}

다음을 작성하라.
1) keywords에는 위 키워드 3개를 그대로 쓰고, reason에는 오늘 이 키워드로 글을 써야 하는 이유 1문장.
2) 위 키워드를 하나씩 제목 앞쪽에 정확히 넣은, 클릭을 부르는 네이버 블로그 제목 3개와 각각의 도입부(2~3문장, 대표가 직접 쓰는 친근하고 신뢰감 있는 말투).`
      : `다음을 작성하라.
1) 오늘 제주 지역 고객이 네이버에서 가장 많이 검색할 만한 청소 관련 '황금키워드' 3개. 경쟁이 너무 센 단일 키워드보다 '지역+서비스+상황' 조합의 롱테일 위주로. 각 키워드마다 오늘 추천하는 이유 1문장.
2) 클릭을 부르는 네이버 블로그 제목 3개와 각각의 도입부(2~3문장, 대표가 직접 쓰는 친근하고 신뢰감 있는 말투).`
  }

반드시 아래 JSON 형식으로만 답하라. 다른 설명은 쓰지 마라.
{"keywords":[{"kw":"","reason":""},{"kw":"","reason":""},{"kw":"","reason":""}],"titles":[{"title":"","intro":""},{"title":"","intro":""},{"title":"","intro":""}]}`;

  const model = encodeURIComponent((s.geminiModel || 'gemini-2.5-flash').trim());
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(s.geminiKey.trim())}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.9 },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const raw: string = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned) as { keywords?: GoldenKeyword[]; titles?: GoldenTitle[] };
  const keywords = (parsed.keywords ?? []).filter((k) => k && k.kw).slice(0, 3);
  const titles = (parsed.titles ?? []).filter((t) => t && t.title).slice(0, 3);
  if (!keywords.length || !titles.length) throw new Error('empty');
  return { date, source: 'ai', keywords, titles };
}

/* =========================================================
 *  루틴 진행률 계산
 * ========================================================= */
const routineUnits = (r: Routine) => (r.subs.length ? r.subs.map((s) => `${r.id}:${s}`) : [r.id]);

function computeProgress(routines: Routine[], checks: Record<string, boolean>) {
  let done = 0;
  let total = 0;
  routines.forEach((r) =>
    routineUnits(r).forEach((u) => {
      total++;
      if (checks[u]) done++;
    }),
  );
  return { done, total };
}

const isComplete = (h?: { done: number; total: number }) => !!h && h.total > 0 && h.done >= h.total;

/* =========================================================
 *  순위 비교
 * ========================================================= */
function prevRank(book: RankBook, today: string, kwId: string, field: RankField): number | undefined {
  const dates = Object.keys(book)
    .filter((d) => d < today)
    .sort()
    .reverse();
  for (const d of dates) {
    const v = book[d]?.[kwId]?.[field];
    if (typeof v === 'number') return v;
  }
  return undefined;
}

function RankDiff({ cur, prev }: { cur?: number; prev?: number }) {
  if (cur === undefined) return null;
  if (prev === undefined) return <span className="text-[10px] text-slate-400">첫 기록</span>;
  if (cur === 0 && prev === 0) return <span className="text-[11px] text-slate-400">-</span>;
  if (cur === 0) return <span className="text-[11px] font-bold text-rose-400">▼이탈</span>;
  if (prev === 0) return <span className="text-[11px] font-bold text-emerald-400">▲진입</span>;
  const diff = prev - cur;
  if (diff > 0) return <span className="text-[11px] font-bold text-emerald-400">▲{diff}</span>;
  if (diff < 0) return <span className="text-[11px] font-bold text-rose-400">▼{Math.abs(diff)}</span>;
  return <span className="text-[11px] text-slate-400">-</span>;
}

/* ---------------------------------------------------------
 *  아이콘 디자인 엔진 — 512 좌표계에서 그린 뒤 원하는 크기로 축소
 * --------------------------------------------------------- */
const ICON_STYLES: { key: IconStyle; name: string; short: string; desc: string }[] = [
  { key: 'vip', name: '① 골드 VIP 배지', short: '골드 VIP', desc: '네이비·로얄블루 + 골드 방패, VIP 마크' },
  { key: 'emerald', name: '② 에메랄드 클린 배지', short: '에메랄드', desc: '딥 에메랄드 + 민트 방패, CLEAN 마크' },
  { key: 'mono', name: '③ 블랙 시크 모노그램', short: '블랙 시크', desc: '블랙 + 골드 왕관 모노그램, CEO 마크' },
];

type Ctx = CanvasRenderingContext2D;

function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function shieldPath(ctx: Ctx, cx: number, top: number, w: number, h: number) {
  const hw = w / 2;
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.bezierCurveTo(cx + w * 0.16, top + h * 0.07, cx + w * 0.36, top + h * 0.1, cx + hw, top + h * 0.1);
  ctx.lineTo(cx + hw, top + h * 0.46);
  ctx.bezierCurveTo(cx + hw, top + h * 0.74, cx + w * 0.26, top + h * 0.9, cx, top + h);
  ctx.bezierCurveTo(cx - w * 0.26, top + h * 0.9, cx - hw, top + h * 0.74, cx - hw, top + h * 0.46);
  ctx.lineTo(cx - hw, top + h * 0.1);
  ctx.bezierCurveTo(cx - w * 0.36, top + h * 0.1, cx - w * 0.16, top + h * 0.07, cx, top);
  ctx.closePath();
}

function sparkle(ctx: Ctx, x: number, y: number, r: number, color: string, glow = true) {
  ctx.save();
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = r * 1.2;
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.12, y - r * 0.12, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.12, y + r * 0.12, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.12, y + r * 0.12, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.12, y - r * 0.12, x, y - r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function crownPath(ctx: Ctx, cx: number, base: number, w: number, h: number) {
  const l = cx - w / 2;
  ctx.beginPath();
  ctx.moveTo(l, base);
  ctx.lineTo(l - w * 0.04, base - h * 0.78);
  ctx.lineTo(l + w * 0.27, base - h * 0.4);
  ctx.lineTo(cx, base - h);
  ctx.lineTo(l + w * 0.73, base - h * 0.4);
  ctx.lineTo(l + w * 1.04, base - h * 0.78);
  ctx.lineTo(l + w, base);
  ctx.closePath();
}

/** 자간을 준 텍스트 (Safari 구버전은 ctx.letterSpacing 미지원이라 직접 배치) */
function spacedText(ctx: Ctx, text: string, cx: number, y: number, spacing: number) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = cx - total / 2;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    ctx.fillText(c, x, y);
    x += widths[i] + spacing;
  });
}

function goldGradient(ctx: Ctx, x0: number, y0: number, x1: number, y1: number) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#fff6cf');
  g.addColorStop(0.35, '#f3cf62');
  g.addColorStop(0.65, '#b88a2c');
  g.addColorStop(1, '#f7dc8a');
  return g;
}

const SANS = '-apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
const SERIF = '"Didot", "Bodoni 72", Georgia, "Times New Roman", serif';

function drawVip(ctx: Ctx) {
  // 배경: 다크 네이비 → 로얄 블루
  const bg = ctx.createLinearGradient(0, 0, 512, 512);
  bg.addColorStop(0, '#13245c');
  bg.addColorStop(0.55, '#0a1640');
  bg.addColorStop(1, '#040a1f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 512);
  const glow = ctx.createRadialGradient(256, 200, 10, 256, 200, 300);
  glow.addColorStop(0, 'rgba(70,120,255,0.45)');
  glow.addColorStop(1, 'rgba(70,120,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 512, 512);

  // 은은한 골드 테두리 (iOS 라운드 마스크 안쪽)
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 7;
  ctx.strokeStyle = goldGradient(ctx, 0, 0, 512, 512);
  roundRectPath(ctx, 34, 34, 444, 444, 96);
  ctx.stroke();
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 2;
  roundRectPath(ctx, 50, 50, 412, 412, 82);
  ctx.stroke();
  ctx.restore();

  // 골드 방패
  ctx.save();
  ctx.shadowColor = 'rgba(245,200,90,0.6)';
  ctx.shadowBlur = 40;
  shieldPath(ctx, 256, 92, 214, 250);
  ctx.fillStyle = goldGradient(ctx, 150, 92, 362, 342);
  ctx.fill();
  ctx.restore();
  // 방패 안쪽 네이비 + 에메랄드 체크
  shieldPath(ctx, 256, 116, 170, 200);
  const inner = ctx.createLinearGradient(0, 116, 0, 316);
  inner.addColorStop(0, '#16296a');
  inner.addColorStop(1, '#081233');
  ctx.fillStyle = inner;
  ctx.fill();
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 26;
  ctx.shadowColor = 'rgba(52,211,153,0.9)';
  ctx.shadowBlur = 24;
  const em = ctx.createLinearGradient(200, 180, 320, 280);
  em.addColorStop(0, '#a7f3d0');
  em.addColorStop(1, '#10b981');
  ctx.strokeStyle = em;
  ctx.beginPath();
  ctx.moveTo(205, 214);
  ctx.lineTo(244, 254);
  ctx.lineTo(312, 172);
  ctx.stroke();
  ctx.restore();

  // 스파클
  sparkle(ctx, 384, 112, 30, '#fff1b8');
  sparkle(ctx, 128, 300, 18, '#f3cf62');
  sparkle(ctx, 404, 250, 12, '#ffffff');

  // VIP
  ctx.save();
  ctx.font = `900 74px ${SANS}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = goldGradient(ctx, 170, 380, 342, 440);
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  spacedText(ctx, 'VIP', 256, 440, 16);
  ctx.restore();
}

function drawEmerald(ctx: Ctx) {
  const bg = ctx.createLinearGradient(0, 0, 512, 512);
  bg.addColorStop(0, '#0b5747');
  bg.addColorStop(0.55, '#053a30');
  bg.addColorStop(1, '#021714');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 512);
  const glow = ctx.createRadialGradient(256, 210, 10, 256, 210, 280);
  glow.addColorStop(0, 'rgba(110,231,183,0.4)');
  glow.addColorStop(1, 'rgba(110,231,183,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 512, 512);

  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 6;
  const silver = ctx.createLinearGradient(0, 0, 512, 512);
  silver.addColorStop(0, '#f0fdf9');
  silver.addColorStop(0.5, '#86cdb6');
  silver.addColorStop(1, '#e6fff6');
  ctx.strokeStyle = silver;
  roundRectPath(ctx, 34, 34, 444, 444, 96);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = 'rgba(110,231,183,0.7)';
  ctx.shadowBlur = 40;
  shieldPath(ctx, 256, 92, 214, 250);
  const sh = ctx.createLinearGradient(150, 92, 362, 342);
  sh.addColorStop(0, '#d1fae5');
  sh.addColorStop(0.4, '#34d399');
  sh.addColorStop(1, '#047857');
  ctx.fillStyle = sh;
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 30;
  ctx.strokeStyle = '#ffffff';
  ctx.shadowColor = 'rgba(2,44,34,0.5)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.moveTo(200, 214);
  ctx.lineTo(242, 256);
  ctx.lineTo(314, 170);
  ctx.stroke();
  ctx.restore();

  sparkle(ctx, 386, 110, 30, '#ffffff');
  sparkle(ctx, 126, 296, 18, '#a7f3d0');
  sparkle(ctx, 404, 250, 12, '#d1fae5');

  ctx.save();
  ctx.font = `800 62px ${SANS}`;
  ctx.fillStyle = '#ecfdf5';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  spacedText(ctx, 'CLEAN', 256, 438, 10);
  ctx.restore();
}

function drawMono(ctx: Ctx) {
  const bg = ctx.createRadialGradient(256, 200, 20, 256, 256, 380);
  bg.addColorStop(0, '#26262c');
  bg.addColorStop(1, '#050506');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 512);

  const gold = goldGradient(ctx, 0, 0, 512, 512);
  ctx.save();
  ctx.strokeStyle = gold;
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.9;
  roundRectPath(ctx, 40, 40, 432, 432, 92);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.5;
  roundRectPath(ctx, 54, 54, 404, 404, 80);
  ctx.stroke();
  ctx.restore();

  // 왕관
  ctx.save();
  ctx.shadowColor = 'rgba(245,200,90,0.55)';
  ctx.shadowBlur = 22;
  crownPath(ctx, 256, 150, 112, 62);
  ctx.fillStyle = goldGradient(ctx, 200, 88, 312, 150);
  ctx.fill();
  ctx.restore();
  [[256 - 60, 101], [256, 86], [256 + 60, 101]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#f7dc8a';
    ctx.fill();
  });

  // 모노그램
  ctx.save();
  ctx.font = `700 168px ${SERIF}`;
  ctx.textBaseline = 'alphabetic';
  const silverGold = ctx.createLinearGradient(0, 180, 0, 330);
  silverGold.addColorStop(0, '#ffffff');
  silverGold.addColorStop(0.5, '#E3E4E8');
  silverGold.addColorStop(1, '#a8997a');
  ctx.fillStyle = silverGold;
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  spacedText(ctx, 'AI', 256, 322, 6);
  ctx.restore();

  // 구분선 + CEO
  ctx.fillStyle = gold;
  ctx.fillRect(176, 352, 160, 3);
  ctx.save();
  ctx.font = `800 54px ${SANS}`;
  ctx.fillStyle = gold;
  spacedText(ctx, 'CEO', 256, 428, 22);
  ctx.restore();

  sparkle(ctx, 372, 196, 16, '#fff1b8');
  sparkle(ctx, 140, 230, 10, '#ffffff');
}

const ICON_DRAW: Record<IconStyle, (ctx: Ctx) => void> = { vip: drawVip, emerald: drawEmerald, mono: drawMono };

/** 원하는 크기의 PNG 캔버스 생성 (512로 그린 뒤 고품질 축소) */
function renderIconCanvas(style: IconStyle, size: number): HTMLCanvasElement {
  const master = document.createElement('canvas');
  master.width = master.height = 512;
  const mctx = master.getContext('2d');
  if (mctx) (ICON_DRAW[style] ?? drawVip)(mctx);
  if (size === 512) return master;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(master, 0, 0, size, size);
  }
  return c;
}

function iconDataUrl(style: IconStyle, size: number) {
  try {
    return renderIconCanvas(style, size).toDataURL('image/png');
  } catch {
    return '';
  }
}

/* =========================================================
 *  PWA: 홈 화면 추가용 메타태그·매니페스트·아이콘을 런타임에 주입
 * ========================================================= */
function usePwaSetup(iconStyle: IconStyle) {
  // 메타 태그 (한 번)
  useEffect(() => {
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.name = name;
        document.head.appendChild(el);
      }
      el.content = content;
    };
    setMeta('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
    setMeta('theme-color', '#FFD233');
    setMeta('apple-mobile-web-app-capable', 'yes');
    setMeta('mobile-web-app-capable', 'yes');
    setMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
    setMeta('apple-mobile-web-app-title', '링크 미래전략실');
    setMeta('application-name', '링크 미래전략실');
    if (!document.title || document.title === 'Vite + React + TS') document.title = '링크 미래전략실';
  }, []);

  // 아이콘·매니페스트 (디자인이 바뀔 때마다 교체)
  useEffect(() => {
    const icon180 = iconDataUrl(iconStyle, 180);
    const icon192 = iconDataUrl(iconStyle, 192);
    const icon512 = iconDataUrl(iconStyle, 512);
    if (!icon180 || !icon512) return;

    const upsertLinks = (rel: string, href: string, sizes?: string) => {
      const found = Array.from(document.head.querySelectorAll<HTMLLinkElement>(`link[rel="${rel}"]`));
      // 기존 정적 아이콘이 여러 개면 하나만 남기고 정리 (사파리는 마지막/가장 맞는 것을 고름)
      found.slice(1).forEach((l) => l.remove());
      const link = found[0] ?? document.createElement('link');
      link.rel = rel;
      link.href = href;
      if (sizes) link.setAttribute('sizes', sizes);
      else link.removeAttribute('sizes');
      if (!found[0]) document.head.appendChild(link);
    };
    upsertLinks('apple-touch-icon', icon180, '180x180');
    upsertLinks('apple-touch-icon-precomposed', icon180, '180x180');
    upsertLinks('icon', icon192, '192x192');

    const base = location.origin + location.pathname;
    const manifest = {
      name: '링크 미래전략실',
      short_name: '링크 미래전략실',
      start_url: base,
      scope: base,
      display: 'standalone',
      background_color: '#F2F3F5',
      theme_color: '#FFD233',
      lang: 'ko',
      icons: [
        { src: icon192, sizes: '192x192', type: 'image/png' },
        { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }));
    let m = document.head.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const prev = m?.href;
    if (!m) {
      m = document.createElement('link');
      m.rel = 'manifest';
      document.head.appendChild(m);
    }
    m.href = url;
    if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
  }, [iconStyle]);
}

/* =========================================================
 *  공통 UI
 * ========================================================= */
const card = 'rounded-[22px] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]';
const btnGhost = 'rounded-full bg-[#F2F3F5] px-3 py-2 text-sm font-semibold text-[#191919] active:scale-95 transition';
const input =
  'w-full rounded-xl border border-[#E9EAEE] bg-[#F2F3F5] px-3 py-3 text-base text-[#191919] placeholder:text-[#9aa5a6] outline-none focus:border-[#191919]';

function SectionTitle({ icon: Icon, title, right }: { icon: LucideIcon; title: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2.5 text-[17px] font-extrabold tracking-tight text-slate-50">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cw">
          <Icon className="h-[18px] w-[18px] text-[#191919]" />
        </span>
        {title}
      </h2>
      {right}
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-4 w-full overflow-hidden rounded-full bg-[#F2F3F5]">
      <div
        className={`h-full rounded-full transition-all duration-700 ${
          pct >= 100 ? 'bg-gradient-to-r from-emerald-400 to-cw' : 'bg-gradient-to-r from-cw to-yellow-300'
        }`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 2.2 + Math.random() * 1.6,
        color: ['#f5d067', '#34d399', '#60a5fa', '#f472b6', '#fbbf24', '#ffffff'][i % 6],
        size: 6 + Math.random() * 8,
      })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 block rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.5,
            background: p.color,
            animation: `aisec-fall ${p.dur}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
      <div className="absolute inset-x-0 top-1/3 flex justify-center px-6">
        <div
          className="rounded-[14px] border border-cw/50 bg-white px-6 py-5 text-center"
          style={{ animation: 'aisec-pop 0.6s ease-out' }}
        >
          <p className="text-4xl">🏆</p>
          <p className="mt-2 text-lg font-extrabold text-amber-200">오늘 루틴 100% 완벽 달성!</p>
          <p className="mt-1 text-sm text-slate-300">대표님, 오늘도 훌륭하셨습니다.</p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
 *  [탭 1] 브리핑
 * ========================================================= */
function BriefingTab(props: {
  city: PlaceKey;
  setCity: (c: PlaceKey) => void;
  hereName: string;
  locating: boolean;
  weather: Weather | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
  month: number;
  progress: { done: number; total: number };
  streak: number;
  golden: Golden | null;
  goTab: (t: Tab) => void;
  top?: React.ReactNode;
  bottom?: React.ReactNode;
}) {
  const { city, setCity, hereName, locating, weather: w, loading, error, onRefresh, month, progress, streak, golden, goTab, top, bottom } = props;
  const info = w ? weatherInfo(w.code) : null;
  const cond = w ? CONDITION[weatherKind(w)] : null;
  const issues = todayIssues(month, w);
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {top}
      {/* 날씨 카드 */}
      <section className={card}>
        <SectionTitle
          icon={Umbrella}
          title="현장 날씨"
          right={
            <button onClick={onRefresh} className={btnGhost} aria-label="새로고침">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          }
        />
        <div className="mb-4 grid grid-cols-3 gap-1 rounded-2xl bg-[#F2F3F5] p-1">
          {(['here', ...Object.keys(CITIES)] as PlaceKey[]).map((c) => (
            <button
              key={c}
              onClick={() => setCity(c)}
              className={`rounded-xl py-3 text-sm font-bold transition ${city === c ? 'bg-cw text-[#191919]' : 'text-slate-300'}`}
            >
              {c === 'here' ? (locating ? '📍 찾는 중…' : '📍 내 위치') : CITIES[c].name}
            </button>
          ))}
        </div>
        {w && (
          <p className="-mt-2 mb-3 text-center text-xs text-slate-400">
            {w.place === 'here' ? `📍 ${hereName || w.placeName} 기준` : `${w.placeName} 기준`}
          </p>
        )}

        {!w && loading && <div className="h-40 animate-pulse rounded-2xl bg-[#F2F3F5]" />}
        {!w && !loading && error && (
          <div className="flex items-center gap-2 rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-200">
            <TriangleAlert className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {w && info && cond && (
          <>
            <div className="flex items-center gap-4">
              <info.Icon className="h-16 w-16 text-amber-300" strokeWidth={1.5} />
              <div>
                <p className="text-5xl font-num font-normal tracking-tight">
                  {w.temp}
                  <span className="text-2xl text-slate-400">℃</span>
                </p>
                <p className="text-sm text-slate-300">
                  {info.label} · 체감 {w.feels}℃ · 최고 {w.tMax}° / 최저 {w.tMin}°
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-[#F2F3F5] p-3">
                <Droplets className="mx-auto h-5 w-5 text-sky-300" />
                <p className="mt-1 text-xl font-bold">{w.humidity}%</p>
                <p className="text-[11px] text-slate-400">습도</p>
              </div>
              <div className="rounded-2xl bg-[#F2F3F5] p-3">
                <Umbrella className="mx-auto h-5 w-5 text-indigo-300" />
                <p className="mt-1 text-xl font-bold">{w.popNow}%</p>
                <p className="text-[11px] text-slate-400">강수확률 (오늘 최고 {w.popMax}%)</p>
              </div>
              <div className="rounded-2xl bg-[#F2F3F5] p-3">
                <Wind className="mx-auto h-5 w-5 text-teal-300" />
                <p className="mt-1 text-xl font-bold">{w.wind}</p>
                <p className="text-[11px] text-slate-400">바람 m/s</p>
              </div>
            </div>

            <div className={`mt-4 rounded-2xl border p-4 ${cond.cls}`}>
              <p className="flex items-center gap-2 text-base font-extrabold">
                <span className={`h-3 w-3 rounded-full ${cond.dot}`} />
                청소 현장 컨디션 · {cond.label}
              </p>
              <p className="mt-1 text-sm leading-relaxed opacity-90">{cond.desc}</p>
            </div>
            <p className="mt-3 text-right text-[11px] text-slate-500">
              업데이트 {new Date(w.fetchedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} · Open-Meteo
            </p>
          </>
        )}
      </section>

      {/* 오늘의 이슈 */}
      <section className={card}>
        <SectionTitle icon={Newspaper} title="오늘의 제주·시즌 이슈" />
        <ul className="space-y-3">
          {issues.map((it, i) => (
            <li key={i} className={`rounded-2xl p-4 ${it.warn ? 'bg-rose-500/10' : 'bg-[#F2F3F5]'}`}>
              <span className="rounded-full border border-cw/30 px-2 py-0.5 text-[11px] text-amber-200">{it.tag}</span>
              <p className="mt-2 font-bold text-slate-50">{it.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{it.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 요약 */}
      <section className={card}>
        <SectionTitle icon={ClipboardList} title="비서실 요약" />
        <button onClick={() => goTab('routine')} className="w-full text-left">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-slate-300">
              데일리 루틴 {progress.done}/{progress.total}
            </span>
            <span className="flex items-center gap-1 font-bold text-amber-300">
              <Flame className="h-4 w-4" /> {streak}일 연속
            </span>
          </div>
          <ProgressBar pct={pct} />
        </button>
        {golden && (
          <button onClick={() => goTab('keyword')} className="mt-4 w-full text-left">
            <p className="mb-2 text-sm text-slate-300">오늘의 황금키워드</p>
            <div className="flex flex-wrap gap-2">
              {golden.keywords.map((k) => (
                <span key={k.kw} className="rounded-full bg-cw/15 px-3 py-1.5 text-sm font-semibold text-amber-200">
                  #{k.kw}
                </span>
              ))}
            </div>
          </button>
        )}
      </section>
      {bottom}
    </div>
  );
}

/* =========================================================
 *  [탭 2] 데일리 루틴
 * ========================================================= */
function RoutineForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Routine;
  onSave: (r: Omit<Routine, 'id'>) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState(initial?.category ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '✅');
  const [subs, setSubs] = useState(initial?.subs.join(', ') ?? '');

  const save = () => {
    if (!title.trim()) return;
    onSave({
      category: category.trim() || '루틴',
      title: title.trim(),
      emoji: emoji.trim() || '✅',
      subs: subs
        .split(/[,，/]/)
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="space-y-2 rounded-2xl border border-cw/30 bg-[#F2F3F5] p-4">
      <div className="flex gap-2">
        <input className={`${input} w-20 text-center`} value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="😀" />
        <input className={input} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="분류 (예: 건강 관리)" />
      </div>
      <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="루틴 내용 (예: 물 2L 마시기)" />
      <input
        className={input}
        value={subs}
        onChange={(e) => setSubs(e.target.value)}
        placeholder="개별 체크 항목 (쉼표 구분, 예: 아침, 점심, 저녁)"
      />
      <p className="text-[11px] text-slate-500">개별 체크 항목을 비워두면 한 번 터치로 완료되는 루틴이 됩니다.</p>
      <div className="flex gap-2 pt-1">
        <button onClick={save} className="flex-1 rounded-xl bg-cw py-3 font-bold text-[#191919] active:scale-95">
          저장
        </button>
        <button onClick={onCancel} className="flex-1 rounded-xl bg-[#F2F3F5] py-3 font-semibold text-slate-200 active:scale-95">
          취소
        </button>
      </div>
    </div>
  );
}

function RoutineTab(props: {
  today: string;
  routines: Routine[];
  setRoutines: React.Dispatch<React.SetStateAction<Routine[]>>;
  checks: Record<string, boolean>;
  toggle: (key: string) => void;
  progress: { done: number; total: number };
  streak: number;
  history: History;
}) {
  const { today, routines, setRoutines, checks, toggle, progress, streak, history } = props;
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  const move = (idx: number, dir: -1 | 1) => {
    setRoutines((list) => {
      const next = [...list];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return list;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <section className={card}>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-slate-400">오늘의 루틴 달성률</p>
            <p className="text-5xl font-num font-normal text-amber-300">
              {pct}
              <span className="text-2xl">%</span>
            </p>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1 text-lg font-extrabold text-orange-300">
              <Flame className="h-5 w-5" />
              {streak}일 연속
            </p>
            <p className="text-xs text-slate-400">
              {progress.done}/{progress.total} 완료
            </p>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar pct={pct} />
        </div>
        {streak > 0 && (
          <p className="mt-3 text-center text-sm font-bold text-orange-200">🔥 {streak}일 연속 완벽 달성!</p>
        )}
        <div className="mt-4 grid grid-cols-7 gap-1 text-center">
          {last7.map((d) => {
            const h = d === today ? progress : history[d];
            const ok = isComplete(h);
            const partial = !!h && h.done > 0 && !ok;
            const [yy, mm, dd] = d.split('-').map(Number);
            return (
              <div key={d}>
                <div
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    ok ? 'bg-emerald-400 text-white' : partial ? 'bg-cw/30 text-amber-100' : 'bg-[#F2F3F5] text-slate-500'
                  } ${d === today ? 'ring-2 ring-cw' : ''}`}
                >
                  {ok ? <Check className="h-4 w-4" /> : dd}
                </div>
                <p className="mt-1 text-[10px] text-slate-500">{WEEKDAYS[new Date(yy, mm - 1, dd).getDay()]}</p>
              </div>
            );
          })}
        </div>
        {pct === 100 && (
          <div className="mt-4 rounded-2xl bg-emerald-400/15 p-3 text-center text-sm font-bold text-emerald-200">
            🎉 오늘 루틴을 모두 챙기셨습니다. 내일 00시에 새 체크리스트가 준비됩니다.
          </div>
        )}
      </section>

      <section className={card}>
        <SectionTitle
          icon={ClipboardList}
          title="데일리 루틴"
          right={
            <button
              onClick={() => {
                setEditMode((v) => !v);
                setEditingId(null);
                setAdding(false);
              }}
              className={`${btnGhost} ${editMode ? 'border-cw/60 text-amber-200' : ''}`}
            >
              {editMode ? '편집 완료' : '편집'}
            </button>
          }
        />
        <ul className="space-y-3">
          {routines.map((r, idx) => {
            if (editingId === r.id)
              return (
                <li key={r.id}>
                  <RoutineForm
                    initial={r}
                    onCancel={() => setEditingId(null)}
                    onSave={(v) => {
                      setRoutines((list) => list.map((x) => (x.id === r.id ? { ...x, ...v } : x)));
                      setEditingId(null);
                    }}
                  />
                </li>
              );

            const units = routineUnits(r);
            const allDone = units.every((u) => checks[u]);
            const single = r.subs.length === 0;

            return (
              <li
                key={r.id}
                className={`rounded-2xl border p-4 transition ${
                  allDone ? 'border-emerald-400/40 bg-emerald-400/10' : 'border-[#E9EAEE] bg-[#F2F3F5]'
                }`}
              >
                <div
                  className={`flex items-center gap-3 ${single && !editMode ? 'cursor-pointer' : ''}`}
                  onClick={() => single && !editMode && toggle(r.id)}
                >
                  <span className="text-3xl">{r.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-amber-300/90">[{r.category}]</p>
                    <p className={`text-base font-bold leading-snug ${allDone ? 'text-emerald-100 line-through decoration-emerald-400/60' : 'text-slate-50'}`}>
                      {r.title}
                    </p>
                  </div>
                  {!editMode && single && (
                    allDone ? <CircleCheck className="h-9 w-9 shrink-0 text-emerald-400" /> : <Circle className="h-9 w-9 shrink-0 text-slate-500" />
                  )}
                  {editMode && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => move(idx, -1)} className="rounded-lg p-2 text-slate-300 active:bg-[#F2F3F5]" aria-label="위로">
                        <ChevronUp className="h-5 w-5" />
                      </button>
                      <button onClick={() => move(idx, 1)} className="rounded-lg p-2 text-slate-300 active:bg-[#F2F3F5]" aria-label="아래로">
                        <ChevronDown className="h-5 w-5" />
                      </button>
                      <button onClick={() => setEditingId(r.id)} className="rounded-lg p-2 text-sky-300 active:bg-[#F2F3F5]" aria-label="수정">
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`'${r.title}' 루틴을 삭제할까요?`)) setRoutines((list) => list.filter((x) => x.id !== r.id));
                        }}
                        className="rounded-lg p-2 text-rose-300 active:bg-[#F2F3F5]"
                        aria-label="삭제"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>

                {!single && (
                  <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(r.subs.length, 4)}, minmax(0,1fr))` }}>
                    {r.subs.map((s) => {
                      const key = `${r.id}:${s}`;
                      const on = !!checks[key];
                      return (
                        <button
                          key={s}
                          disabled={editMode}
                          onClick={() => toggle(key)}
                          className={`flex items-center justify-center gap-1 rounded-xl py-3 text-base font-bold transition active:scale-95 ${
                            on ? 'bg-emerald-400 text-white' : 'bg-white text-slate-200'
                          }`}
                        >
                          {on ? <Check className="h-4 w-4" /> : null}
                          {s}
                        </button>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-4">
          {adding ? (
            <RoutineForm
              onCancel={() => setAdding(false)}
              onSave={(v) => {
                setRoutines((list) => [...list, { id: uid(), ...v }]);
                setAdding(false);
              }}
            />
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-cw/40 py-4 font-bold text-amber-200 active:scale-[0.98]"
            >
              <Plus className="h-5 w-5" /> 루틴 추가
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

/* =========================================================
 *  [탭 3] 키워드 순위 & 황금키워드
 * ========================================================= */
function RankSheet({
  title,
  current,
  onPick,
  onClose,
}: {
  title: string;
  current?: number;
  onPick: (v: number | undefined) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div
        className="w-full rounded-t-3xl border-t border-[#E9EAEE] bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+20px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-bold">{title}</p>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mx-auto grid max-w-md grid-cols-5 gap-2">
          {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => onPick(n)}
              className={`rounded-xl py-3 text-lg font-bold active:scale-95 ${
                current === n ? 'bg-cw text-[#191919]' : 'bg-[#F2F3F5] text-slate-100'
              }`}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => onPick(0)}
            className={`col-span-3 rounded-xl py-3 font-bold active:scale-95 ${
              current === 0 ? 'bg-rose-400 text-white' : 'bg-rose-500/15 text-rose-200'
            }`}
          >
            권외 (순위 밖)
          </button>
          <button onClick={() => onPick(undefined)} className="col-span-2 rounded-xl bg-[#F2F3F5] py-3 font-semibold text-slate-300 active:scale-95">
            기록 지우기
          </button>
        </div>
      </div>
    </div>
  );
}

function KeywordTab(props: {
  today: string;
  keywords: Keyword[];
  setKeywords: React.Dispatch<React.SetStateAction<Keyword[]>>;
  ranks: RankBook;
  setRank: (kwId: string, field: RankField, v: number | undefined) => void;
  golden: Golden | null;
  gLoading: boolean;
  hasKey: boolean;
  onGenerate: (mode: GoldenMode) => void;
  toast: (m: string) => void;
  settings: AppSettings;
  applyAutoRanks: (kwId: string, r: AutoRankResult) => void;
  openSettings: () => void;
}) {
  const { today, keywords, setKeywords, ranks, setRank, golden, gLoading, hasKey, onGenerate, toast, settings, applyAutoRanks, openSettings } =
    props;
  const [newKw, setNewKw] = useState('');
  const [checking, setChecking] = useState<{ done: number; total: number } | null>(null);
  const autoReady = !!settings.rankWorkerUrl?.trim();
  const dataReady = autoReady;

  const runAutoCheck = async () => {
    if (!autoReady) {
      toast('⚙️ 설정에서 순위 자동 체크 서버 주소를 먼저 입력해 주세요.');
      openSettings();
      return;
    }
    if (checking) return;
    const list = [...keywords];
    let fail = 0;
    let lastErr = '';
    setChecking({ done: 0, total: list.length });
    for (let i = 0; i < list.length; i++) {
      try {
        const r = await fetchAutoRank(settings, list[i].text);
        applyAutoRanks(list[i].id, r);
      } catch (e) {
        fail++;
        lastErr = e instanceof Error ? e.message : String(e);
      }
      setChecking({ done: i + 1, total: list.length });
    }
    setChecking(null);
    if (fail === 0) toast(`✅ 키워드 ${list.length}개 순위를 자동으로 기록했습니다.`);
    else if (fail === list.length) toast(`자동 체크 실패: ${lastErr || '서버 주소와 네이버 API 키를 확인해 주세요.'}`);
    else toast(`${list.length - fail}개 기록, ${fail}개 실패 (${lastErr})`);
  };
  const [editMode, setEditMode] = useState(false);
  const [sheet, setSheet] = useState<{ kwId: string; field: RankField } | null>(null);
  // 네이버 검색을 열고 앱으로 돌아오면 그 키워드의 순위 입력창을 자동으로 띄움
  const pending = useRef<{ kwId: string; field: RankField } | null>(null);
  useEffect(() => {
    const onBack = () => {
      if (document.visibilityState !== 'visible' || !pending.current) return;
      const p = pending.current;
      pending.current = null;
      setTimeout(() => setSheet(p), 250);
    };
    document.addEventListener('visibilitychange', onBack);
    window.addEventListener('focus', onBack);
    return () => {
      document.removeEventListener('visibilitychange', onBack);
      window.removeEventListener('focus', onBack);
    };
  }, []);

  const addKeyword = () => {
    const t = newKw.trim();
    if (!t) return;
    if (keywords.some((k) => k.text === t)) {
      toast('이미 등록된 키워드입니다.');
      return;
    }
    setKeywords((l) => [...l, { id: uid(), text: t }]);
    setNewKw('');
  };

  const todayRec = ranks[today] ?? {};
  const sheetKw = sheet ? keywords.find((k) => k.id === sheet.kwId) : null;

  return (
    <div className="space-y-4">
      {/* 황금키워드 */}
      <section className={`${card} border-cw/30 bg-white`}>
        <SectionTitle
          icon={Sparkles}
          title="오늘의 황금키워드"
          right={
            golden && (
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  golden.source === 'data'
                    ? 'bg-sky-400/20 text-sky-200'
                    : golden.source === 'ai'
                      ? 'bg-emerald-400/20 text-emerald-200'
                      : 'bg-[#F2F3F5] text-slate-300'
                }`}
              >
                {golden.source === 'agent'
                  ? '전략수석실 리서치'
                  : golden.source === 'data'
                    ? '📊 실제 검색량'
                    : golden.source === 'ai'
                      ? 'Gemini AI'
                      : '내장 추천'}
              </span>
            )
          }
        />

        {!golden && (
          <p className="mb-3 text-sm text-slate-400">날씨와 계절을 분석해 오늘 검색이 몰릴 키워드를 추천해 드립니다.</p>
        )}

        {golden && (
          <>
            <ul className="space-y-2">
              {golden.keywords.map((k, i) => (
                <li key={k.kw} className="rounded-2xl bg-[#F2F3F5] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-extrabold text-amber-200">
                      {i + 1}. {k.kw}
                    </p>
                    <a
                      href={naverSearchUrl(k.kw)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex shrink-0 items-center gap-1 rounded-lg bg-[#03c75a] px-2.5 py-1.5 text-xs font-bold text-white"
                    >
                      <Search className="h-3.5 w-3.5" /> 검색
                    </a>
                  </div>
                  {k.total !== undefined && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-bold">
                      <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-sky-200">월 {k.total.toLocaleString()}회</span>
                      <span className="rounded-full bg-[#F2F3F5] px-2 py-0.5 text-slate-300">
                        모바일 {Math.round(((k.mobile ?? 0) / Math.max(1, k.total)) * 100)}%
                      </span>
                      {k.comp && (
                        <span
                          className={`rounded-full px-2 py-0.5 ${
                            k.comp === '낮음' ? 'bg-emerald-400/15 text-emerald-200' : k.comp === '높음' ? 'bg-rose-400/15 text-rose-200' : 'bg-cw/15 text-amber-200'
                          }`}
                        >
                          경쟁 {k.comp}
                        </span>
                      )}
                    </div>
                  )}
                  <p className="mt-1 text-sm text-slate-300">{k.reason}</p>
                </li>
              ))}
            </ul>

            {golden.pool && golden.pool.length > 3 && (
              <details className="mt-3 rounded-2xl bg-[#F2F3F5] p-3">
                <summary className="cursor-pointer text-sm font-bold text-sky-200">📊 데이터 후보 TOP {golden.pool.length} 보기</summary>
                <ul className="mt-2 divide-y divide-[#E9EAEE]">
                  {golden.pool.map((k, i) => {
                    const tracked = keywords.some((x) => x.text.replace(/\s+/g, '') === k.kw.replace(/\s+/g, ''));
                    return (
                      <li key={k.kw} className="flex items-center gap-2 py-2 text-sm">
                        <span className="w-5 shrink-0 text-right text-xs text-slate-500">{i + 1}</span>
                        <span className="min-w-0 flex-1 truncate font-semibold text-slate-100">{k.kw}</span>
                        <span className="shrink-0 text-xs tabular-nums text-slate-400">{(k.total ?? 0).toLocaleString()}</span>
                        <span
                          className={`w-8 shrink-0 text-center text-[11px] font-bold ${
                            k.comp === '낮음' ? 'text-emerald-300' : k.comp === '높음' ? 'text-rose-300' : 'text-amber-200'
                          }`}
                        >
                          {k.comp || '-'}
                        </span>
                        <button
                          disabled={tracked}
                          onClick={() => {
                            setKeywords((l) => [...l, { id: uid(), text: k.kw }]);
                            toast(`'${k.kw}'를 순위 체크 키워드에 추가했습니다.`);
                          }}
                          className="shrink-0 rounded-lg bg-[#F2F3F5] px-2 py-1 text-[11px] font-bold text-slate-200 disabled:opacity-40"
                        >
                          {tracked ? '추적중' : '+추적'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-[11px] text-slate-500">숫자 = 월간 검색수(PC+모바일) · 네이버 검색광고 키워드 도구 기준</p>
              </details>
            )}

            <p className="mb-2 mt-5 text-sm font-bold text-slate-200">✍️ 클릭을 부르는 블로그 제목 & 도입부</p>
            <ul className="space-y-3">
              {golden.titles.map((t, i) => (
                <li key={i} className="rounded-2xl border border-[#E9EAEE] bg-[#F2F3F5] p-4">
                  <p className="font-bold leading-snug text-slate-50">{t.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.intro}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={async () => toast((await copyText(t.title)) ? '제목을 복사했습니다.' : '복사에 실패했습니다.')}
                      className={`${btnGhost} flex items-center gap-1 text-xs`}
                    >
                      <Copy className="h-3.5 w-3.5" /> 제목 복사
                    </button>
                    <button
                      onClick={async () =>
                        toast((await copyText(`${t.title}\n\n${t.intro}`)) ? '제목+도입부를 복사했습니다.' : '복사에 실패했습니다.')
                      }
                      className={`${btnGhost} flex items-center gap-1 text-xs`}
                    >
                      <Copy className="h-3.5 w-3.5" /> 전체 복사
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {dataReady && (
          <button
            onClick={() => onGenerate('data')}
            disabled={gLoading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#191919] py-3.5 font-extrabold text-white active:scale-[0.98] disabled:opacity-60"
          >
            <Search className={`h-4 w-4 ${gLoading ? 'animate-pulse' : ''}`} />
            {gLoading ? '분석 중…' : '실제 검색량으로 황금키워드 찾기'}
          </button>
        )}
        <div className={`${dataReady ? 'mt-2' : 'mt-4'} grid grid-cols-2 gap-2`}>
          <button
            onClick={() => onGenerate('local')}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#F2F3F5] py-3 font-bold text-slate-100 active:scale-95"
          >
            <RefreshCw className="h-4 w-4" /> 다른 추천
          </button>
          <button
            onClick={() => (hasKey ? onGenerate('ai') : toast('우측 상단 ⚙️ 설정에서 Gemini API 키를 입력해 주세요.'))}
            disabled={gLoading}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 font-bold active:scale-95 ${
              hasKey ? 'bg-cw text-[#191919]' : 'bg-cw/20 text-amber-200'
            } disabled:opacity-60`}
          >
            <Sparkles className={`h-4 w-4 ${gLoading ? 'animate-pulse' : ''}`} />
            {golden?.source === 'data' ? 'AI 제목 다시' : 'AI로 생성'}
          </button>
        </div>
      </section>

      {/* 순위 체크 */}
      <section className={card}>
        <SectionTitle
          icon={KeyRound}
          title="네이버 순위 체크"
          right={
            <button
              onClick={() => setEditMode((v) => !v)}
              className={`${btnGhost} ${editMode ? 'border-cw/60 text-amber-200' : ''}`}
            >
              {editMode ? '완료' : '편집'}
            </button>
          }
        />
        {autoReady ? (
          <>
            <button
              onClick={runAutoCheck}
              disabled={!!checking}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#191919] py-3.5 text-base font-extrabold text-white active:scale-[0.98] disabled:opacity-80"
            >
              <RefreshCw className={`h-5 w-5 ${checking ? 'animate-spin' : ''}`} />
              {checking ? `자동 체크 중… ${checking.done}/${checking.total}` : '블로그·홈페이지 순위 자동 체크'}
            </button>
            {checking && (
              <div className="mb-3 h-2 overflow-hidden rounded-full bg-[#F2F3F5]">
                <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${(checking.done / Math.max(1, checking.total)) * 100}%` }} />
              </div>
            )}
            <p className="mb-3 text-xs leading-relaxed text-slate-400">
              네이버 공식 검색 API 기준 상위 100위까지 찾아 기록합니다. 칸을 터치하면 직접 고칠 수 있습니다.
            </p>
          </>
        ) : (
          <div className="mb-3 rounded-2xl bg-[#F2F3F5] p-3 text-xs leading-relaxed text-slate-300">
            <b className="text-amber-200">빠른 기록:</b> 아래 <b>블로그 / 홈페이지</b> 버튼을 누르면 네이버 검색이 열립니다. 우리 업체가 몇 번째인지 보고 이 앱으로
            돌아오면 <b>순위 입력창이 자동으로 열립니다.</b> 숫자만 누르면 끝!
          </div>
        )}

        <ul className="space-y-3">
          {keywords.map((k) => {
            const rec = todayRec[k.id] ?? {};
            return (
              <li key={k.id} className="rounded-2xl border border-[#E9EAEE] bg-[#F2F3F5] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-base font-bold text-slate-50">{k.text}</p>
                  {editMode ? (
                    <button
                      onClick={() => {
                        if (confirm(`'${k.text}' 키워드를 삭제할까요?`)) setKeywords((l) => l.filter((x) => x.id !== k.id));
                      }}
                      className="rounded-lg p-2 text-rose-300"
                      aria-label="삭제"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  ) : (
                    <a
                      href={naverSearchUrl(k.text)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => (pending.current = { kwId: k.id, field: 'blog' })}
                      className="flex shrink-0 items-center gap-1 rounded-xl bg-[#03c75a] px-3 py-2 text-sm font-bold text-white active:scale-95"
                    >
                      <ExternalLink className="h-4 w-4" /> 통합검색
                    </a>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {RANK_FIELDS.map(({ key: f, label, where }) => (
                    <a
                      key={f}
                      href={naverSearchUrl(k.text, where)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => (pending.current = { kwId: k.id, field: f })}
                      className="flex items-center justify-center gap-1 rounded-xl border border-[#03c75a]/40 bg-[#03c75a]/10 py-2 text-xs font-bold text-[#0a8a3e] active:scale-95"
                    >
                      <Search className="h-3.5 w-3.5" /> {label} 검색
                    </a>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {RANK_FIELDS.map(({ key: f, label }) => {
                    const cur = rec[f];
                    const prev = prevRank(ranks, today, k.id, f);
                    return (
                      <button
                        key={f}
                        onClick={() => setSheet({ kwId: k.id, field: f })}
                        className="flex items-center justify-between gap-1 whitespace-nowrap rounded-xl bg-white px-2.5 py-2.5 active:scale-95"
                      >
                        <span className="flex flex-col items-start text-xs text-slate-400">
                          {label}
                          {rec.auto?.[f] && cur !== undefined && <span className="text-[9px] font-bold text-emerald-300">자동</span>}
                        </span>
                        <span className="flex flex-col items-end leading-tight">
                          <span className={`text-base font-extrabold ${cur === undefined ? 'text-slate-600' : cur === 0 ? 'text-rose-300' : 'text-amber-200'}`}>
                            {cur === undefined ? '기록' : cur === 0 ? '권외' : `${cur}위`}
                          </span>
                          <RankDiff cur={cur} prev={prev} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex gap-2">
          <input
            className={input}
            value={newKw}
            onChange={(e) => setNewKw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
            placeholder="키워드 추가 (예: 제주에어컨청소)"
          />
          <button onClick={addKeyword} className="shrink-0 rounded-xl bg-cw px-4 font-bold text-[#191919] active:scale-95" aria-label="추가">
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </section>

      {sheet && sheetKw && (
        <RankSheet
          title={`${sheetKw.text} · ${rankLabel(sheet.field)} 오늘 순위`}
          current={todayRec[sheet.kwId]?.[sheet.field]}
          onClose={() => setSheet(null)}
          onPick={(v) => {
            setRank(sheet.kwId, sheet.field, v);
            setSheet(null);
          }}
        />
      )}
    </div>
  );
}

/* =========================================================
 *  [탭 3] 영업 성과 — 문의 → 견적 → 계약 → 완료 파이프라인
 * ========================================================= */
type DealStage = 'inquiry' | 'quote' | 'won' | 'done' | 'lost';

interface Deal {
  id: string;
  createdAt: number;
  date: string; // 문의일 YYYY-MM-DD
  name: string;
  phone?: string;
  service: string;
  channel: string;
  stage: DealStage;
  stageAt: string; // 현재 단계로 바뀐 날
  amount?: number; // 원
  workDate?: string; // 작업 예정일
  wonAt?: string; // 계약일 (매출 집계 기준)
  doneAt?: string;
  reviewAsked?: boolean;
  followedAt?: string; // 마지막 팔로업 연락일
  note?: string;
}

const STAGES: { key: DealStage; label: string; cls: string }[] = [
  { key: 'inquiry', label: '문의', cls: 'bg-sky-400/15 text-sky-200 border-sky-400/30' },
  { key: 'quote', label: '견적', cls: 'bg-cw/15 text-amber-200 border-cw/30' },
  { key: 'won', label: '계약', cls: 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30' },
  { key: 'done', label: '완료', cls: 'bg-violet-400/15 text-violet-200 border-violet-400/30' },
  { key: 'lost', label: '보류·실패', cls: 'bg-[#F2F3F5] text-slate-400 border-[#E9EAEE]' },
];
const stageOf = (k: DealStage) => STAGES.find((s) => s.key === k) ?? STAGES[0];
const NEXT_STAGE: Partial<Record<DealStage, DealStage>> = { inquiry: 'quote', quote: 'won', won: 'done' };

const SERVICES = ['입주청소', '이사청소', '거주청소', '상가·사무실', '에어컨', '곰팡이', '별장·숙소', '기타'];
const CHANNELS = ['네이버 블로그', '플레이스', '홈페이지', '전화', '당근', '인스타', '지인 소개', '재방문', '기타'];

const FOLLOW_DAYS = 2; // 견적 후 N일 지나면 팔로업 알림

/** 매출 표시 — 실제 금액 그대로 */
const SALES_X = 1;
const fmtSales = (n: number) => fmtWon(n * SALES_X);
const fmtWon = (n: number) => {
  if (!n) return '0원';
  if (Math.abs(n) >= 10000) {
    const man = n / 10000;
    return `${man.toLocaleString('ko-KR', { maximumFractionDigits: man >= 100 ? 0 : 1 })}만원`;
  }
  return `${n.toLocaleString('ko-KR')}원`;
};
const daysBetween = (a: string, b: string) => {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
};
const daysInMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};
const telHref = (p?: string) => (p ? `tel:${p.replace(/[^0-9+]/g, '')}` : '');
const smsHref = (p: string, body: string) => `sms:${p.replace(/[^0-9+]/g, '')}&body=${encodeURIComponent(body)}`;

function followMsg(d: Deal, s: AppSettings) {
  return `안녕하세요 ${d.name || ''} 고객님, ${s.company || '저희 업체'}입니다. 지난번 문의 주신 ${d.service} 견적 관련해서 궁금하신 점은 없으신지 연락드렸습니다. 원하시는 날짜 말씀 주시면 일정 먼저 잡아두겠습니다. 감사합니다!`;
}
function reviewMsg(d: Deal, s: AppSettings) {
  const link = s.reviewUrl?.trim() ? `\n👉 후기 남기기: ${s.reviewUrl.trim()}` : '';
  return `안녕하세요 ${d.name || ''} 고객님, ${s.company || '저희 업체'}입니다. ${d.service} 믿고 맡겨 주셔서 진심으로 감사합니다. 결과가 마음에 드셨다면 네이버 리뷰 한 줄 부탁드려도 될까요? 사진과 함께 남겨주시면 저희 팀에게 큰 힘이 됩니다 🙏${link}`;
}

interface SalesStats {
  month: string;
  inquiries: number;
  quotes: number;
  wins: number;
  revenue: number;
  target: number;
  pct: number;
  conv: number; // 문의→계약 전환율 %
  avg: number; // 평균 객단가
  remainDays: number;
  needPerDay: number;
  followUps: Deal[];
  reviewAsks: Deal[];
  todayJobs: Deal[];
  tomorrowJobs: Deal[];
  byChannel: { channel: string; inquiries: number; wins: number; revenue: number }[];
}

function computeSales(deals: Deal[], today: string, target: number): SalesStats {
  const month = today.slice(0, 7);
  const inMonth = deals.filter((d) => d.date.startsWith(month));
  const wonInMonth = deals.filter((d) => (d.stage === 'won' || d.stage === 'done') && (d.wonAt ?? d.date).startsWith(month));
  const revenue = wonInMonth.reduce((a, d) => a + (d.amount ?? 0), 0);
  const winsFromMonthInq = inMonth.filter((d) => d.stage === 'won' || d.stage === 'done').length;
  const remainDays = daysInMonth(month) - Number(today.slice(8, 10)) + 1;
  const tomorrow = addDays(today, 1);

  const chan = new Map<string, { channel: string; inquiries: number; wins: number; revenue: number }>();
  CHANNELS.forEach((c) => chan.set(c, { channel: c, inquiries: 0, wins: 0, revenue: 0 }));
  inMonth.forEach((d) => {
    const c = chan.get(d.channel) ?? chan.get('기타')!;
    c.inquiries++;
  });
  wonInMonth.forEach((d) => {
    const c = chan.get(d.channel) ?? chan.get('기타')!;
    c.wins++;
    c.revenue += d.amount ?? 0;
  });

  return {
    month,
    inquiries: inMonth.length,
    quotes: inMonth.filter((d) => d.stage !== 'inquiry').length,
    wins: wonInMonth.length,
    revenue,
    target,
    pct: target > 0 ? Math.round((revenue / target) * 100) : 0,
    conv: inMonth.length ? Math.round((winsFromMonthInq / inMonth.length) * 100) : 0,
    avg: wonInMonth.length ? Math.round(revenue / wonInMonth.length) : 0,
    remainDays,
    needPerDay: target > revenue ? Math.ceil((target - revenue) / Math.max(1, remainDays)) : 0,
    followUps: deals.filter(
      (d) => (d.stage === 'quote' || d.stage === 'inquiry') && daysBetween(d.followedAt ?? d.stageAt, today) >= FOLLOW_DAYS,
    ),
    reviewAsks: deals.filter((d) => d.stage === 'done' && !d.reviewAsked),
    todayJobs: deals.filter((d) => d.stage === 'won' && d.workDate === today),
    tomorrowJobs: deals.filter((d) => d.stage === 'won' && d.workDate === tomorrow),
    byChannel: [...chan.values()].filter((c) => c.inquiries || c.wins).sort((a, b) => b.revenue - a.revenue || b.inquiries - a.inquiries),
  };
}

function DealForm({
  initial,
  today,
  onSave,
  onCancel,
}: {
  initial?: Deal;
  today: string;
  onSave: (d: Omit<Deal, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [service, setService] = useState(initial?.service ?? SERVICES[0]);
  const [channel, setChannel] = useState(initial?.channel ?? CHANNELS[0]);
  const [stage, setStage] = useState<DealStage>(initial?.stage ?? 'inquiry');
  const [amountMan, setAmountMan] = useState(initial?.amount ? String(initial.amount / 10000) : '');
  const [workDate, setWorkDate] = useState(initial?.workDate ?? '');
  const [note, setNote] = useState(initial?.note ?? '');

  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-semibold transition active:scale-95 ${
      on ? 'border-cw bg-cw text-[#191919]' : 'border-[#E9EAEE] bg-[#F2F3F5] text-slate-300'
    }`;

  const save = () => {
    const amt = Number(amountMan.replace(/,/g, ''));
    const changed = !initial || initial.stage !== stage;
    onSave({
      date: initial?.date ?? today,
      name: name.trim(),
      phone: phone.trim() || undefined,
      service,
      channel,
      stage,
      stageAt: changed ? today : initial!.stageAt,
      amount: Number.isFinite(amt) && amt > 0 ? Math.round(amt * 10000) : undefined,
      workDate: workDate || undefined,
      wonAt: stage === 'won' || stage === 'done' ? initial?.wonAt ?? today : undefined,
      doneAt: stage === 'done' ? initial?.doneAt ?? today : undefined,
      reviewAsked: initial?.reviewAsked,
      followedAt: initial?.followedAt,
      note: note.trim() || undefined,
    });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-cw/30 bg-[#F2F3F5] p-4">
      <div className="grid grid-cols-2 gap-2">
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="고객명 (예: 노형 김사장)" />
        <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="연락처 (선택)" inputMode="tel" />
      </div>
      <div>
        <p className="mb-1.5 text-xs text-slate-400">서비스</p>
        <div className="flex flex-wrap gap-1.5">
          {SERVICES.map((v) => (
            <button key={v} type="button" onClick={() => setService(v)} className={chip(service === v)}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs text-slate-400">어디서 알고 연락했나요? (유입 채널)</p>
        <div className="flex flex-wrap gap-1.5">
          {CHANNELS.map((v) => (
            <button key={v} type="button" onClick={() => setChannel(v)} className={chip(channel === v)}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs text-slate-400">진행 단계</p>
        <div className="flex flex-wrap gap-1.5">
          {STAGES.map((v) => (
            <button key={v.key} type="button" onClick={() => setStage(v.key)} className={chip(stage === v.key)}>
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">금액 (만원)</span>
          <input className={input} value={amountMan} onChange={(e) => setAmountMan(e.target.value)} placeholder="예: 35" inputMode="decimal" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">작업 예정일</span>
          <input className={`${input} `} type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
        </label>
      </div>
      <input className={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="메모 (평수, 특이사항 등)" />
      <div className="flex gap-2 pt-1">
        <button onClick={save} className="flex-1 rounded-xl bg-cw py-3 font-bold text-[#191919] active:scale-95">
          저장
        </button>
        <button onClick={onCancel} className="flex-1 rounded-xl bg-[#F2F3F5] py-3 font-semibold text-slate-200 active:scale-95">
          취소
        </button>
      </div>
    </div>
  );
}

function SalesTab(props: {
  today: string;
  deals: Deal[];
  setDeals: React.Dispatch<React.SetStateAction<Deal[]>>;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  stats: SalesStats;
  toast: (m: string) => void;
}) {
  const { today, deals, setDeals, settings, setSettings, stats, toast } = props;
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'open' | 'month' | 'all'>('open');
  const [editTarget, setEditTarget] = useState(false);
  const [targetMan, setTargetMan] = useState(settings.monthlyTarget ? String((settings.monthlyTarget * SALES_X) / 10000) : '');
  const [reviewUrl, setReviewUrl] = useState(settings.reviewUrl ?? '');

  const update = (id: string, patch: Partial<Deal>) => setDeals((l) => l.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const advance = (d: Deal) => {
    const next = NEXT_STAGE[d.stage];
    if (!next) return;
    const patch: Partial<Deal> = { stage: next, stageAt: today };
    if (next === 'won') patch.wonAt = today;
    if (next === 'done') patch.doneAt = today;
    update(d.id, patch);
    toast(
      next === 'won'
        ? `🎉 ${d.name || '고객'} 계약! ${d.amount ? fmtSales(d.amount) + ' 매출에 반영했습니다.' : '금액을 입력하면 매출에 반영됩니다.'}`
        : next === 'done'
          ? '✅ 작업 완료. 오늘 안에 후기 요청을 보내면 리뷰 받을 확률이 가장 높습니다.'
          : `${stageOf(next).label} 단계로 옮겼습니다.`,
    );
  };

  const copyMsg = async (text: string, done: string) => toast((await copyText(text)) ? done : '복사에 실패했습니다.');

  const list = deals
    .filter((d) =>
      filter === 'open'
        ? d.stage === 'inquiry' || d.stage === 'quote' || d.stage === 'won'
        : filter === 'month'
          ? d.date.startsWith(stats.month) || (d.wonAt ?? '').startsWith(stats.month)
          : true,
    )
    .sort((a, b) => {
      const order: Record<DealStage, number> = { won: 0, quote: 1, inquiry: 2, done: 3, lost: 4 };
      return order[a.stage] - order[b.stage] || (a.workDate ?? '9').localeCompare(b.workDate ?? '9') || b.createdAt - a.createdAt;
    });

  const maxChanRev = Math.max(1, ...stats.byChannel.map((c) => c.revenue));
  const topChan = stats.byChannel[0];

  return (
    <div className="space-y-4">
      {/* 이번 달 성과 */}
      <section className={`${card} border-emerald-400/25 bg-white`}>
        <SectionTitle
          icon={Flame}
          title={`${Number(stats.month.slice(5))}월 매출 현황`}
          right={
            <button onClick={() => setEditTarget((v) => !v)} className={`${btnGhost} text-xs`}>
              {editTarget ? '닫기' : '목표·설정'}
            </button>
          }
        />
        {editTarget && (
          <div className="mb-4 space-y-2 rounded-2xl bg-[#F2F3F5] p-3">
            <label className="block">
              <span className="mb-1 block text-xs text-slate-400">이번 달 매출 목표 (만원)</span>
              <input className={input} value={targetMan} onChange={(e) => setTargetMan(e.target.value)} inputMode="decimal" placeholder="예: 1500" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-400">네이버 리뷰 작성 링크 (후기 요청 문자에 들어갑니다)</span>
              <input className={input} value={reviewUrl} onChange={(e) => setReviewUrl(e.target.value)} placeholder="https://naver.me/..." inputMode="url" />
            </label>
            <button
              onClick={() => {
                const t = Number(targetMan.replace(/,/g, ''));
                setSettings((p) => ({ ...p, monthlyTarget: Number.isFinite(t) && t > 0 ? Math.round((t * 10000) / SALES_X) : 0, reviewUrl: reviewUrl.trim() }));
                setEditTarget(false);
                toast('목표를 저장했습니다.');
              }}
              className="w-full rounded-xl bg-cw py-3 font-bold text-[#191919] active:scale-95"
            >
              저장
            </button>
          </div>
        )}

        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-slate-400">계약 기준 매출</p>
            <p className="text-4xl font-num font-normal tabular-nums text-[#191919]">{fmtSales(stats.revenue)}</p>
          </div>
          {stats.target > 0 ? (
            <div className="text-right">
              <p className="text-xs text-slate-400">목표 {fmtSales(stats.target)}</p>
              <p className="text-2xl font-num font-normal text-amber-300">{stats.pct}%</p>
            </div>
          ) : (
            <button onClick={() => setEditTarget(true)} className="text-right text-xs font-bold text-amber-200 underline underline-offset-2">
              목표 설정하기
            </button>
          )}
        </div>
        {stats.target > 0 && (
          <>
            <div className="mt-3">
              <ProgressBar pct={stats.pct} />
            </div>
            <p className="mt-2 text-xs text-slate-300">
              {stats.pct >= 100
                ? '🏆 이번 달 목표 달성! 초과분은 모두 성장입니다.'
                : `남은 ${stats.remainDays}일 동안 하루 평균 ${fmtSales(stats.needPerDay)}씩 계약하면 목표 달성입니다.`}
            </p>
          </>
        )}

        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[
            { k: '문의', v: `${stats.inquiries}` },
            { k: '계약', v: `${stats.wins}` },
            { k: '전환율', v: `${stats.conv}%` },
            { k: '객단가', v: stats.avg ? fmtSales(stats.avg).replace('만원', '만') : '-' },
          ].map((x) => (
            <div key={x.k} className="rounded-2xl bg-[#F2F3F5] px-1 py-3">
              <p className="whitespace-nowrap text-lg font-extrabold tabular-nums text-slate-50">{x.v}</p>
              <p className="text-[11px] text-slate-400">{x.k}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 오늘 챙길 일 */}
      {(stats.todayJobs.length > 0 || stats.followUps.length > 0 || stats.reviewAsks.length > 0) && (
        <section className={`${card} border-cw/30`}>
          <SectionTitle icon={TriangleAlert} title="오늘 챙길 고객" />
          <ul className="space-y-2">
            {stats.todayJobs.map((d) => (
              <li key={'j' + d.id} className="rounded-2xl bg-emerald-400/10 p-3">
                <p className="text-sm font-bold text-emerald-200">🧹 오늘 작업 · {d.name || '고객'} · {d.service}</p>
                {d.note && <p className="mt-0.5 text-xs text-slate-300">{d.note}</p>}
                <div className="mt-2 flex gap-2">
                  {d.phone && (
                    <a href={telHref(d.phone)} className={`${btnGhost} text-xs`}>
                      📞 전화
                    </a>
                  )}
                  <button onClick={() => advance(d)} className="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-bold text-white active:scale-95">
                    작업 완료 처리
                  </button>
                </div>
              </li>
            ))}
            {stats.followUps.map((d) => (
              <li key={'f' + d.id} className="rounded-2xl bg-cw/10 p-3">
                <p className="text-sm font-bold text-amber-200">
                  📞 팔로업 · {d.name || '고객'} · {d.service} {stageOf(d.stage).label} 후 {daysBetween(d.followedAt ?? d.stageAt, today)}일째 연락 없음
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {d.phone && (
                    <>
                      <a href={telHref(d.phone)} className={`${btnGhost} text-xs`}>
                        전화
                      </a>
                      <a href={smsHref(d.phone, followMsg(d, settings))} className={`${btnGhost} text-xs`}>
                        문자 보내기
                      </a>
                    </>
                  )}
                  <button onClick={() => copyMsg(followMsg(d, settings), '팔로업 문자를 복사했습니다. 카톡에 붙여넣으세요.')} className={`${btnGhost} text-xs`}>
                    문구 복사
                  </button>
                  <button
                    onClick={() => {
                      update(d.id, { followedAt: today });
                      toast(`연락 완료로 표시했습니다. ${FOLLOW_DAYS}일 뒤 다시 알려드립니다.`);
                    }}
                    className="rounded-xl bg-cw px-3 py-2 text-xs font-bold text-[#191919] active:scale-95"
                  >
                    연락함
                  </button>
                </div>
              </li>
            ))}
            {stats.reviewAsks.map((d) => (
              <li key={'r' + d.id} className="rounded-2xl bg-violet-400/10 p-3">
                <p className="text-sm font-bold text-violet-200">⭐ 후기 요청 · {d.name || '고객'} · {d.service} 완료</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {d.phone && (
                    <a href={smsHref(d.phone, reviewMsg(d, settings))} className={`${btnGhost} text-xs`}>
                      문자 보내기
                    </a>
                  )}
                  <button onClick={() => copyMsg(reviewMsg(d, settings), '후기 요청 문구를 복사했습니다.')} className={`${btnGhost} text-xs`}>
                    문구 복사
                  </button>
                  <button
                    onClick={() => {
                      update(d.id, { reviewAsked: true });
                      toast('후기 요청 완료로 표시했습니다.');
                    }}
                    className="rounded-xl bg-violet-300 px-3 py-2 text-xs font-bold text-white active:scale-95"
                  >
                    요청함
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 고객 목록 */}
      <section className={card}>
        <SectionTitle
          icon={ClipboardList}
          title="고객 문의 관리"
          right={
            !adding && (
              <button onClick={() => setAdding(true)} className="flex items-center gap-1 rounded-xl bg-cw px-3 py-2 text-sm font-bold text-[#191919] active:scale-95">
                <Plus className="h-4 w-4" /> 새 문의
              </button>
            )
          }
        />
        {adding && (
          <div className="mb-4">
            <DealForm
              today={today}
              onCancel={() => setAdding(false)}
              onSave={(v) => {
                setDeals((l) => [{ id: uid(), createdAt: Date.now(), ...v }, ...l]);
                setAdding(false);
                toast('문의를 등록했습니다.');
              }}
            />
          </div>
        )}

        <div className="mb-3 grid grid-cols-3 gap-1 rounded-2xl bg-[#F2F3F5] p-1 text-sm">
          {(
            [
              ['open', '진행 중'],
              ['month', '이번 달'],
              ['all', '전체'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-xl py-2 font-bold ${filter === k ? 'bg-cw text-[#191919]' : 'text-slate-300'}`}>
              {l}
            </button>
          ))}
        </div>

        {list.length === 0 && (
          <div className="rounded-2xl bg-[#F2F3F5] p-5 text-center text-sm leading-relaxed text-slate-400">
            아직 등록된 문의가 없습니다.
            <br />
            전화·카톡 문의가 오면 <b className="text-amber-200">[새 문의]</b>로 바로 적어두세요.
            <br />
            어느 채널에서 매출이 나오는지 자동으로 분석해 드립니다.
          </div>
        )}

        <ul className="space-y-2">
          {list.map((d) =>
            editingId === d.id ? (
              <li key={d.id}>
                <DealForm
                  initial={d}
                  today={today}
                  onCancel={() => setEditingId(null)}
                  onSave={(v) => {
                    update(d.id, v);
                    setEditingId(null);
                    toast('수정했습니다.');
                  }}
                />
              </li>
            ) : (
              <li key={d.id} className="rounded-2xl border border-[#E9EAEE] bg-[#F2F3F5] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${stageOf(d.stage).cls}`}>{stageOf(d.stage).label}</span>
                      <p className="truncate font-bold text-slate-50">{d.name || '이름 없음'}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {d.service} · {d.channel}
                      {d.amount ? ` · ${fmtSales(d.amount)}` : ''}
                      {d.workDate ? ` · 작업 ${Number(d.workDate.slice(5, 7))}/${Number(d.workDate.slice(8))}` : ''}
                    </p>
                    {d.note && <p className="mt-0.5 truncate text-xs text-slate-500">{d.note}</p>}
                  </div>
                  <div className="flex shrink-0 items-center">
                    {d.phone && (
                      <a href={telHref(d.phone)} className="rounded-lg p-2 text-emerald-300" aria-label="전화">
                        📞
                      </a>
                    )}
                    <button onClick={() => setEditingId(d.id)} className="rounded-lg p-2 text-sky-300" aria-label="수정">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`'${d.name || '이 문의'}'를 삭제할까요?`)) setDeals((l) => l.filter((x) => x.id !== d.id));
                      }}
                      className="rounded-lg p-2 text-slate-500"
                      aria-label="삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {(NEXT_STAGE[d.stage] || d.stage === 'inquiry' || d.stage === 'quote') && (
                  <div className="mt-2 flex gap-2">
                    {NEXT_STAGE[d.stage] && (
                      <button
                        onClick={() => advance(d)}
                        className="flex-1 rounded-xl bg-emerald-400/90 py-2 text-sm font-bold text-white active:scale-95"
                      >
                        {stageOf(NEXT_STAGE[d.stage]!).label}
                        {d.stage === 'won' ? ' 처리' : '으로 →'}
                      </button>
                    )}
                    {(d.stage === 'inquiry' || d.stage === 'quote') && (
                      <button
                        onClick={() => update(d.id, { stage: 'lost', stageAt: today })}
                        className="rounded-xl bg-[#F2F3F5] px-3 py-2 text-sm font-semibold text-slate-300 active:scale-95"
                      >
                        보류
                      </button>
                    )}
                  </div>
                )}
              </li>
            ),
          )}
        </ul>
      </section>

      {/* 채널 분석 */}
      <section className={card}>
        <SectionTitle icon={Search} title="어디서 매출이 나오나 (이번 달)" />
        {stats.byChannel.length === 0 ? (
          <p className="text-sm text-slate-400">문의를 등록하면 채널별 문의·계약·매출이 여기에 쌓입니다.</p>
        ) : (
          <>
            {topChan && topChan.revenue > 0 && (
              <p className="mb-3 rounded-2xl bg-emerald-400/10 p-3 text-sm leading-relaxed text-emerald-100">
                💡 이번 달 매출의 <b>{Math.round((topChan.revenue / Math.max(1, stats.revenue)) * 100)}%</b>가 <b>{topChan.channel}</b>에서 나왔습니다.
                {topChan.channel === '네이버 블로그' || topChan.channel === '홈페이지'
                  ? ' 키워드 탭의 황금키워드로 이 채널에 글을 더 쌓으세요.'
                  : topChan.channel === '지인 소개' || topChan.channel === '재방문'
                    ? ' 기존 고객 관리가 성장 동력입니다. 후기 요청을 빠짐없이 보내세요.'
                    : ' 이 채널 활동을 꾸준히 늘려보세요.'}
              </p>
            )}
            <ul className="space-y-2.5">
              {stats.byChannel.map((c) => (
                <li key={c.channel}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">{c.channel}</span>
                    <span className="tabular-nums text-slate-400">
                      문의 {c.inquiries} · 계약 {c.wins} · <b className="text-emerald-300">{fmtSales(c.revenue)}</b>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[#F2F3F5]">
                    <div className="h-full rounded-full bg-[#3F8F2E]" style={{ width: `${(c.revenue / maxChanRev) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

/* =========================================================
 *  🤵 비서 자동 업무 — 매일 아침 Claude가 직접 작성해 올려두는 결과물
 *   - data/today.json : 블로그 초안, 스레드 글, 황금키워드, 현장 메모, 오늘의 이슈
 *   - data/ranks.json : 네이버 순위 자동 기록 (PC 브라우저로 직접 검색한 결과)
 * ========================================================= */
interface AgentDaily {
  date: string; // 이 브리핑이 대상으로 하는 날 (YYYY-MM-DD)
  generatedAt?: string; // ISO 시각
  headline?: string; // 비서의 한 줄 코멘트
  todo?: string[]; // 오늘 할 마케팅·영업 일 (최대 3~4개)
  fieldMemo?: string[]; // 날씨·시즌 기반 현장 메모
  issues?: { title: string; desc: string; source?: string; url?: string }[];
  golden?: { kw: string; reason: string }[];
  blog?: { keyword?: string; title: string; body: string };
  threads?: { text: string; tags?: string[] }; // 아침 스레드
  threadsEvening?: { text: string; tags?: string[] }; // 저녁 스레드
}

interface AgentRanks {
  updatedAt?: string;
  byDate?: Record<string, Record<string, { blog?: number; web?: number }>>; // [날짜][키워드 텍스트]
}

async function fetchAgentJson<T>(file: string): Promise<T | null> {
  try {
    const res = await fetch(`./data/${file}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

const normKw = (s: string) => s.replace(/\s+/g, '');

/* 비서실 업무 현황 — 각 예약 작업이 끝날 때 data/status.json 에 기록 */
interface AgentStatus {
  date?: string;
  items?: Record<string, { done?: boolean; at?: string; note?: string }>;
}
interface SecJob { key: string; label: string; who: string; when: string }
function secJobsFor(date: string): SecJob[] {
  const [y, m, d] = date.split('-').map(Number);
  const wd = new Date(y, m - 1, d).getDay(); // 0=일
  const jobs: SecJob[] = [{ key: 'report', label: '아침 보고서', who: '비서실장', when: '07:17' }];
  if (wd === 1 || wd === 4) jobs.push({ key: 'blog', label: '블로그 초안', who: '홍보수석', when: '07:17' });
  jobs.push({ key: 'threads', label: '아침 스레드 게시', who: '소통수석', when: '버튼' });
  if (wd === 2 || wd === 5) jobs.push({ key: 'tip', label: '청소팁 카드', who: '콘텐츠비서관', when: '10:37' });
  if (wd >= 1 && wd <= 5) jobs.push({ key: 'bids', label: '입찰·공고 찾기', who: '입찰비서관', when: '08:23' });
  jobs.push({ key: 'coupang', label: '쿠팡 글 준비', who: '제휴수석', when: '18:43' });
  jobs.push({ key: 'evening', label: '저녁 6곳 홍보', who: '홍보수석', when: '20:47' });
  return jobs;
}
function secJobState(job: SecJob, status: AgentStatus | null, agent: AgentDaily | null, today: string): 'done' | 'fail' | 'wait' {
  const it = status && status.date === today ? status.items?.[job.key] : undefined;
  if (it) return it.done ? 'done' : 'fail';
  // 예전 방식 호환: 아침 보고서·블로그는 today.json 으로 확인
  if (agent && agent.date === today) {
    if (job.key === 'report') return 'done';
    if (job.key === 'blog' && agent.blog) return 'done';
  }
  return 'wait';
}

interface BidItem { title: string; org?: string; kind?: string; deadline?: string; amount?: string; url?: string; why?: string; new?: boolean; found?: string }
interface BidsData { date?: string; updatedAt?: string; note?: string; items?: BidItem[] }

function BidsCard({ bids, today }: { bids: BidsData | null; today: string }) {
  const [all, setAll] = useState(false);
  const items = (bids?.items || []).filter((b) => !b.deadline || b.deadline >= today);
  const shown = all ? items : items.slice(0, 4);
  const dday = (d?: string) => {
    if (!d) return '';
    const n = daysBetween(today, d);
    return n === 0 ? '오늘 마감' : n > 0 ? `D-${n}` : '';
  };
  return (
    <section className={card}>
      <SectionTitle
        icon={ClipboardList}
        title="입찰·공고 비서관"
        right={bids?.date ? <span className="text-[11px] text-slate-400">{Number(bids.date.slice(5, 7))}/{Number(bids.date.slice(8))} 확인</span> : undefined}
      />
      {!bids?.date ? (
        <p className="text-sm leading-relaxed text-slate-400">
          평일 아침 8시 23분에 제주도청·제주시·서귀포시·나라장터에서 <b className="text-slate-200">청소·미화·방역·폐기물</b> 관련 입찰과 견적 공고를 찾아 여기에 올려 둡니다.
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400">지금 열려 있는 청소 관련 공고가 없어요. {bids.note ? `(${bids.note})` : ''}</p>
      ) : (
        <>
          <ul className="space-y-2">
            {shown.map((b, i) => (
              <li key={i}>
                <a href={b.url || '#'} target="_blank" rel="noreferrer" className="block rounded-2xl bg-[#F2F3F5] p-3 active:scale-[0.99]">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    {b.new && <span className="rounded-full bg-[#F04438] px-1.5 py-0.5 text-[10px] font-extrabold text-white">NEW</span>}
                    {b.kind && <span className="rounded-full bg-cw px-2 py-0.5 text-[10px] font-extrabold text-[#191919]">{b.kind}</span>}
                    {dday(b.deadline) && <span className="rounded-full bg-[#191919] px-2 py-0.5 text-[10px] font-extrabold text-cw">{dday(b.deadline)}</span>}
                    {b.org && <span className="truncate text-[11px] text-slate-400">{b.org}</span>}
                  </div>
                  <p className="text-sm font-bold leading-snug text-slate-100">{b.title}</p>
                  {(b.why || b.amount) && (
                    <p className="mt-0.5 text-[12px] leading-snug text-slate-400">
                      {b.amount ? `💰 ${b.amount} · ` : ''}
                      {b.why}
                    </p>
                  )}
                </a>
              </li>
            ))}
          </ul>
          {items.length > 4 && (
            <button onClick={() => setAll(!all)} className={`${btnGhost} mt-2 w-full text-xs`}>
              {all ? '접기' : `${items.length - 4}건 더 보기`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function SecretaryWork({ status, agent, today }: { status: AgentStatus | null; agent: AgentDaily | null; today: string }) {
  const jobs = secJobsFor(today);
  return (
    <ul className="space-y-1.5">
      {jobs.map((j) => {
        const st = secJobState(j, status, agent, today);
        const it = status && status.date === today ? status.items?.[j.key] : undefined;
        return (
          <li key={j.key} className="flex items-center gap-2 rounded-xl bg-[#F2F3F5] p-2.5">
            {st === 'done' ? (
              <CircleCheck className="h-5 w-5 shrink-0 text-emerald-400" />
            ) : st === 'fail' ? (
              <TriangleAlert className="h-5 w-5 shrink-0 text-rose-400" />
            ) : (
              <Circle className="h-5 w-5 shrink-0 text-slate-500" />
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold leading-snug ${st === 'done' ? 'text-slate-100' : 'text-slate-300'}`}>{j.label}</p>
              <p className="truncate text-[11px] text-slate-400">
                {j.who}
                {it?.note ? ` · ${it.note}` : ''}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                st === 'done' ? 'bg-emerald-400/15 text-emerald-200' : st === 'fail' ? 'bg-rose-400/15 text-rose-300' : 'bg-white text-slate-400'
              }`}
            >
              {st === 'done' ? `${it?.at || ''} 완료`.trim() : st === 'fail' ? '못 함' : j.when === '버튼' ? '버튼 대기' : `${j.when} 예정`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function AgentCard({
  agent,
  today,
  toast,
  onDoneTodo,
  doneTodos,
  status,
}: {
  agent: AgentDaily | null;
  today: string;
  toast: (m: string) => void;
  onDoneTodo: (i: number) => void;
  doneTodos: number[];
  status: AgentStatus | null;
}) {
  const [open, setOpen] = useState<'blog' | 'threads' | 'threadsEvening' | null>(null);
  const [view, setView] = useState<'me' | 'sec'>('me');
  const jobs = secJobsFor(today);
  const secDone = jobs.filter((j) => secJobState(j, status, agent, today) === 'done').length;
  const tomorrow = addDays(today, 1);
  const valid = agent && (agent.date === today || agent.date === tomorrow);

  if (!valid) {
    return (
      <section className={`${card} border-dashed border-cw/30`}>
        <SectionTitle icon={Sparkles} title="비서실장 아침 보고" />
        <p className="text-sm leading-relaxed text-slate-400">
          비서실장이 매일 <b className="text-amber-200">아침 8시 전</b>에 오늘 올릴 블로그 글 초안, 스레드 글, 황금키워드, 현장 메모를 직접 써서 여기에 올려둡니다.
          대표님은 확인하고 복사만 하시면 됩니다.
        </p>
        <p className="mb-2 mt-4 text-xs font-bold text-slate-300">
          비서들이 한 일 <b className="text-emerald-300">{secDone}</b>/{jobs.length}
        </p>
        <SecretaryWork status={status} agent={agent} today={today} />
      </section>
    );
  }

  const a = agent!;
  const isTomorrow = a.date === tomorrow;
  const at = a.generatedAt ? new Date(a.generatedAt) : null;
  const copy = async (t: string, msg: string) => toast((await copyText(t)) ? msg : '복사에 실패했습니다.');
  // 스레드는 본문에 해시태그를 넣지 않고, 주제 태그는 게시할 때 따로 고름
  const threadOf = (th?: { text: string; tags?: string[] }) => th?.text ?? '';
  const threadBlocks = (
    [
      ['threads', '소통수석실 · 아침 스레드 글', a.threads],
      ['threadsEvening', '소통수석실 · 저녁 스레드 글', a.threadsEvening],
    ] as const
  ).filter(([, , th]) => !!th);

  return (
    <section className={`${card} border-cw/40 bg-white`}>
      <SectionTitle
        icon={Sparkles}
        title={isTomorrow ? '비서실장 내일 보고 (미리)' : '비서실장 아침 보고'}
        right={
          at && (
            <span className="text-[11px] text-slate-400">
              {at.getMonth() + 1}/{at.getDate()} {String(at.getHours()).padStart(2, '0')}:{String(at.getMinutes()).padStart(2, '0')} 작성
            </span>
          )
        }
      />
      {a.headline && <p className="mb-4 rounded-2xl bg-cw/10 p-3 text-[15px] font-semibold leading-relaxed text-amber-50">{a.headline}</p>}

      <div className="mb-2 grid grid-cols-2 gap-1 rounded-full bg-[#F2F3F5] p-1">
        <button onClick={() => setView('me')} className={`rounded-full py-2 text-[13px] font-extrabold ${view === 'me' ? 'bg-cw text-[#191919]' : 'text-slate-400'}`}>
          대표님 할 일 {(a.todo || []).filter((_, i) => doneTodos.includes(i)).length}/{(a.todo || []).length}
        </button>
        <button onClick={() => setView('sec')} className={`rounded-full py-2 text-[13px] font-extrabold ${view === 'sec' ? 'bg-cw text-[#191919]' : 'text-slate-400'}`}>
          비서들이 한 일 {secDone}/{jobs.length}
        </button>
      </div>
      {view === 'sec' && (
        <div className="mb-4">
          <SecretaryWork status={status} agent={agent} today={today} />
        </div>
      )}
      {view === 'me' && a.todo && a.todo.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-bold text-slate-300"><span className="text-amber-200">비서실장</span> · 오늘 이것만 하시면 됩니다</p>
          <ul className="space-y-1.5">
            {a.todo.map((t, i) => {
              const done = doneTodos.includes(i);
              return (
                <li key={i}>
                  <button onClick={() => onDoneTodo(i)} className="flex w-full items-start gap-2 rounded-xl bg-[#F2F3F5] p-2.5 text-left active:scale-[0.99]">
                    {done ? <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />}
                    <span className={`text-sm leading-snug ${done ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{t}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {a.blog && (
        <div className="mb-3 rounded-2xl border border-[#E9EAEE] bg-[#F2F3F5] p-4">
          <p className="text-[11px] font-bold text-sky-300">홍보수석실 · 오늘의 블로그 초안{a.blog.keyword ? ` · #${a.blog.keyword}` : ''}</p>
          <p className="mt-1 font-bold leading-snug text-slate-50">{a.blog.title}</p>
          <p className={`mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-300 ${open === 'blog' ? '' : 'line-clamp-3'}`}>{a.blog.body}</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setOpen(open === 'blog' ? null : 'blog')} className={`${btnGhost} text-xs`}>
              {open === 'blog' ? '접기' : '전체 보기'}
            </button>
            <button
              onClick={() => copy(`${a.blog!.title}\n\n${a.blog!.body}`, '블로그 초안을 복사했습니다. 네이버 블로그 앱에 붙여넣고 현장 사진만 넣으세요.')}
              className="flex items-center gap-1 rounded-xl bg-cw px-3 py-2 text-xs font-bold text-[#191919] active:scale-95"
            >
              <Copy className="h-3.5 w-3.5" /> 전체 복사
            </button>
          </div>
        </div>
      )}

      {threadBlocks.map(([key, label, th]) => (
        <div key={key} className="mb-3 rounded-2xl border border-[#E9EAEE] bg-[#F2F3F5] p-4">
          <p className="text-[11px] font-bold text-violet-300">{label}</p>
          <p className={`mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-200 ${open === key ? '' : 'line-clamp-4'}`}>{th!.text}</p>
          {th!.tags && th!.tags.length > 0 && (
            <p className="mt-1.5 text-xs text-sky-300">
              주제 태그: {th!.tags.map((t) => t.replace(/^#/, '')).join(', ')} <span className="text-slate-500">(게시할 때 따로 선택)</span>
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button onClick={() => setOpen(open === key ? null : key)} className={`${btnGhost} text-xs`}>
              {open === key ? '접기' : '전체 보기'}
            </button>
            <button
              onClick={() => copy(threadOf(th), '스레드 글을 복사했습니다.')}
              className="flex items-center gap-1 rounded-xl bg-violet-300 px-3 py-2 text-xs font-bold text-white active:scale-95"
            >
              <Copy className="h-3.5 w-3.5" /> 복사
            </button>
          </div>
        </div>
      ))}

      {a.fieldMemo && a.fieldMemo.length > 0 && (
        <div className="mb-3 rounded-2xl bg-emerald-400/10 p-3">
          <p className="mb-1 text-[11px] font-bold text-emerald-300">부속실 · 오늘 현장 메모</p>
          <ul className="space-y-1 text-sm leading-relaxed text-emerald-50">
            {a.fieldMemo.map((m, i) => (
              <li key={i}>• {m}</li>
            ))}
          </ul>
        </div>
      )}

      {a.issues && a.issues.length > 0 && (
        <div className="rounded-2xl bg-[#F2F3F5] p-3">
          <p className="mb-1.5 text-[11px] font-bold text-slate-300">전략수석실 · 오늘의 소식</p>
          <ul className="space-y-2">
            {a.issues.map((it, i) => (
              <li key={i} className="text-sm">
                <p className="font-semibold text-slate-100">{it.title}</p>
                <p className="text-xs leading-relaxed text-slate-400">
                  {it.desc}
                  {it.url ? (
                    <>
                      {' '}
                      <a href={it.url} target="_blank" rel="noreferrer" className="text-sky-300 underline underline-offset-2">
                        {it.source || '원문'} ↗
                      </a>
                    </>
                  ) : it.source ? (
                    ` (${it.source})`
                  ) : (
                    ''
                  )}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/* =========================================================
 *  경영 브리핑 · 순위 변동 · 주간 리포트
 * ========================================================= */
interface RankMove {
  kw: string;
  label: string;
  cur: number;
  prev: number;
  diff: number; // +면 상승
}

/** baseBefore 이전(미만) 마지막 기록 vs curUpTo 이하 마지막 기록 비교 */
function rankMovesBetween(ranks: RankBook, keywords: Keyword[], curUpTo: string, baseBefore: string): RankMove[] {
  const dates = Object.keys(ranks).sort().reverse();
  const out: RankMove[] = [];
  keywords.forEach((k) =>
    RANK_FIELDS.forEach(({ key, label }) => {
      let cur: number | undefined;
      let curDate = '';
      for (const d of dates) {
        if (d > curUpTo) continue;
        const v = ranks[d]?.[k.id]?.[key];
        if (typeof v === 'number') {
          cur = v;
          curDate = d;
          break;
        }
      }
      if (cur === undefined) return;
      let prev: number | undefined;
      for (const d of dates) {
        if (d >= baseBefore || d >= curDate) continue;
        const v = ranks[d]?.[k.id]?.[key];
        if (typeof v === 'number') {
          prev = v;
          break;
        }
      }
      if (prev === undefined) return;
      const c = cur === 0 ? 101 : cur;
      const p = prev === 0 ? 101 : prev;
      if (c !== p) out.push({ kw: k.text, label, cur, prev, diff: p - c });
    }),
  );
  return out.sort((a, b) => b.diff - a.diff);
}

const rankText = (n: number) => (n === 0 ? '권외' : `${n}위`);

function ExecBrief({
  stats,
  moves,
  goTab,
}: {
  stats: SalesStats;
  moves: RankMove[];
  goTab: (t: Tab) => void;
}) {
  const ups = moves.filter((m) => m.diff > 0).slice(0, 3);
  const downs = moves.filter((m) => m.diff < 0).slice(-3).reverse();
  const todo = stats.followUps.length + stats.reviewAsks.length;
  return (
    <section className={`${card} border-emerald-400/25`}>
      <SectionTitle icon={Flame} title="영업수석실 · 경영 현황" />
      <button onClick={() => goTab('sales')} className="w-full text-left">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-slate-400">{Number(stats.month.slice(5))}월 계약 매출</p>
            <p className="text-3xl font-num font-normal tabular-nums text-[#191919]">{fmtSales(stats.revenue)}</p>
          </div>
          <p className="text-right text-xs text-slate-400">
            {stats.target > 0 ? (
              <>
                목표 {fmtSales(stats.target)}
                <br />
                <b className="text-xl text-amber-300">{stats.pct}%</b>
              </>
            ) : (
              <span className="font-bold text-amber-200 underline underline-offset-2">월 목표 설정하기 ›</span>
            )}
          </p>
        </div>
        {stats.target > 0 && (
          <div className="mt-2">
            <ProgressBar pct={stats.pct} />
          </div>
        )}
      </button>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <button onClick={() => goTab('sales')} className="rounded-2xl bg-[#F2F3F5] p-3 active:scale-95">
          <p className="text-2xl font-num font-normal text-slate-50">{stats.todayJobs.length}</p>
          <p className="text-[11px] text-slate-400">오늘 작업</p>
        </button>
        <button onClick={() => goTab('sales')} className="rounded-2xl bg-[#F2F3F5] p-3 active:scale-95">
          <p className="text-2xl font-num font-normal text-slate-50">{stats.tomorrowJobs.length}</p>
          <p className="text-[11px] text-slate-400">내일 작업</p>
        </button>
        <button onClick={() => goTab('sales')} className={`rounded-2xl p-3 active:scale-95 ${todo ? 'bg-cw/15' : 'bg-[#F2F3F5]'}`}>
          <p className={`text-2xl font-num font-normal ${todo ? 'text-amber-300' : 'text-slate-50'}`}>{todo}</p>
          <p className="text-[11px] text-slate-400">연락할 고객</p>
        </button>
      </div>

      {(ups.length > 0 || downs.length > 0) && (
        <button onClick={() => goTab('keyword')} className="mt-4 w-full rounded-2xl bg-[#F2F3F5] p-3 text-left">
          <p className="mb-1.5 text-xs font-bold text-slate-300">네이버 순위 변동</p>
          <ul className="space-y-1 text-sm">
            {ups.map((m) => (
              <li key={'u' + m.kw + m.label} className="flex justify-between gap-2">
                <span className="truncate text-slate-200">
                  {m.kw} <span className="text-xs text-slate-500">{m.label}</span>
                </span>
                <span className="shrink-0 font-bold text-emerald-300">
                  {rankText(m.prev)} → {rankText(m.cur)} ▲
                </span>
              </li>
            ))}
            {downs.map((m) => (
              <li key={'d' + m.kw + m.label} className="flex justify-between gap-2">
                <span className="truncate text-slate-200">
                  {m.kw} <span className="text-xs text-slate-500">{m.label}</span>
                </span>
                <span className="shrink-0 font-bold text-rose-300">
                  {rankText(m.prev)} → {rankText(m.cur)} ▼
                </span>
              </li>
            ))}
          </ul>
        </button>
      )}
    </section>
  );
}

/* =========================================================
 *  🔗 링크 허브 — 세무장부 · 순위노트 · 자동콜백 앱이 보내준 자료
 * ========================================================= */
const HUB_BASE = 'https://linkclean-promo.han0829.workers.dev/api/hub';
interface HubLedgerBiz { sales: number; salesVat: number; salesCount: number; purchase: number; purchaseVat: number; labor: number; cats?: Record<string, number> }
interface HubCall { id: string; t: number; n: string; k: string; s?: string; tpl?: string; a?: boolean }
interface HubData {
  at?: string;
  ledger?: { updatedAt?: string; data?: { bizList?: { id: string; name: string }[]; months?: Record<string, Record<string, HubLedgerBiz>> } } | null;
  rank?: { updatedAt?: string; data?: { keywords?: { id: string; name: string }[]; places?: string[]; ranks?: Record<string, Record<string, (number | null)[]>> } } | null;
  calls?: { updatedAt?: string; events?: HubCall[] } | null;
}

async function fetchHub(pin: string): Promise<HubData | 'badpin' | null> {
  try {
    const r = await fetch(`${HUB_BASE}?hpin=${encodeURIComponent(pin)}&t=${Date.now()}`, { cache: 'no-store' });
    if (r.status === 401 || r.status === 403) return 'badpin';
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.ok ? (j as HubData) : null;
  } catch {
    return null;
  }
}

const phoneDigits = (s?: string) => (s || '').replace(/\D/g, '');
const prettyPhone = (s: string) => {
  const d = phoneDigits(s);
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return d.startsWith('02') ? `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}` : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return s;
};
/** 숫자(ms) 또는 허브의 'YYYY-MM-DD HH:MM'(한국시간) 문자열 */
const hubTime = (t?: number | string) => {
  if (typeof t === 'number') return t;
  const mm = typeof t === 'string' ? t.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/) : null;
  return mm ? Date.UTC(+mm[1], +mm[2] - 1, +mm[3], +mm[4] - 9, +mm[5]) : 0;
};
const agoText = (t0?: number | string) => {
  const t = hubTime(t0);
  if (!t) return '';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  if (m < 1440) return `${Math.round(m / 60)}시간 전`;
  return `${Math.round(m / 1440)}일 전`;
};

function HubCard({
  hub,
  hasPin,
  status,
  today,
  deals,
  onRefresh,
  onAddDeal,
  onOpenSettings,
}: {
  hub: HubData | null;
  hasPin: boolean;
  status: '' | 'loading' | 'badpin' | 'error';
  today: string;
  deals: Deal[];
  onRefresh: () => void;
  onAddDeal: (c: HubCall) => void;
  onOpenSettings: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  if (!hasPin) {
    return (
      <section className={`${card} border-dashed`}>
        <SectionTitle icon={Sparkles} title="🔗 링크 허브 · 다른 앱 연결" />
        <p className="text-sm leading-relaxed text-slate-400">
          세무장부 매출, 자동콜백 통화 기록, 순위노트 플레이스 순위를 이 화면에서 함께 봅니다. 비밀번호를 한 번만 넣어주세요.
        </p>
        <button onClick={onOpenSettings} className="mt-3 rounded-xl bg-cw px-4 py-2.5 text-sm font-bold text-[#191919] active:scale-95">
          허브 비밀번호 넣기
        </button>
      </section>
    );
  }

  const ym = today.slice(0, 7);
  const [y, m] = ym.split('-').map(Number);
  const prevYm = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, '0')}`;
  const L = hub?.ledger?.data;
  const sumMonth = (k: string) => {
    const M = L?.months?.[k];
    const o = { sales: 0, salesVat: 0, salesCount: 0, purchase: 0, purchaseVat: 0, labor: 0 };
    if (M) Object.values(M).forEach((b) => (Object.keys(o) as (keyof typeof o)[]).forEach((x) => (o[x] += Number(b[x]) || 0)));
    return o;
  };
  const cur = sumMonth(ym);
  const prev = sumMonth(prevYm);
  const vatDue = cur.salesVat - cur.purchaseVat;

  const known = new Set(deals.map((d) => phoneDigits(d.phone)).filter(Boolean));
  const since = Date.now() - 3 * 86400000;
  const calls = (hub?.calls?.events ?? [])
    .filter((c) => (c.k === '수신' || c.k === '부재중') && c.t >= since)
    .sort((a, b) => b.t - a.t);
  const seen = new Set<string>();
  const uniq = calls.filter((c) => {
    const d = phoneDigits(c.n);
    if (!d || seen.has(d)) return false;
    seen.add(d);
    return true;
  });
  const shown = showAll ? uniq : uniq.slice(0, 5);

  const R = hub?.rank?.data;
  const rDates = Object.keys(R?.ranks ?? {}).sort();
  const lastD = rDates[rDates.length - 1];
  const prevD = rDates[rDates.length - 2];
  const places = R?.places?.length ? R.places : ['제주시점', '서귀포점'];
  const rk = (d: string | undefined, kid: string, i: number) => {
    const v = d ? R?.ranks?.[d]?.[kid]?.[i] : undefined;
    return v === undefined || v === null ? null : Number(v);
  };
  const rt = (v: number | null) => (v === null ? '-' : v === 0 ? '권외' : `${v}위`);

  return (
    <section className={`${card} border-[#191919]/20`}>
      <SectionTitle
        icon={Sparkles}
        title="🔗 링크 허브 · 연결된 앱"
        right={
          <button onClick={onRefresh} className="flex items-center gap-1 text-[11px] text-slate-400" aria-label="허브 새로고침">
            <RefreshCw className={`h-3.5 w-3.5 ${status === 'loading' ? 'animate-spin' : ''}`} />
            {hub?.at ? agoText(hub.at) : ''}
          </button>
        }
      />
      {status === 'badpin' && (
        <p className="mb-3 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-300">
          허브 비밀번호가 맞지 않습니다.{' '}
          <button onClick={onOpenSettings} className="font-bold underline">
            설정에서 다시 넣기
          </button>
        </p>
      )}
      {status === 'error' && !hub && <p className="mb-3 text-sm text-slate-400">허브에 연결하지 못했습니다. 잠시 후 새로고침을 눌러주세요.</p>}

      {/* 세무장부 */}
      <div className="mb-3 rounded-2xl bg-[#F2F3F5] p-3">
        <p className="mb-1 flex justify-between text-[11px] font-bold text-slate-300">
          <span>📒 세무장부 · {m}월 장부</span>
          {hub?.ledger?.updatedAt && <span className="font-normal text-slate-500">{agoText(hub.ledger.updatedAt)} 갱신</span>}
        </p>
        {L ? (
          <>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-slate-400">매출 {cur.salesCount}건</p>
                <p className="text-2xl font-num font-normal tabular-nums text-[#191919]">{fmtSales(cur.sales)}</p>
              </div>
              {prev.sales > 0 && (
                <p className="text-right text-xs text-slate-400">
                  지난달 {fmtSales(prev.sales)}
                  <br />
                  <b className={cur.sales >= prev.sales ? 'text-emerald-300' : 'text-slate-300'}>{Math.round((cur.sales / prev.sales) * 100)}%</b>
                </p>
              )}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5 text-center text-[11px]">
              <div className="rounded-xl bg-white p-2">
                <p className="text-slate-400">매입</p>
                <p className="font-bold text-slate-100">{fmtWon(cur.purchase)}</p>
              </div>
              <div className="rounded-xl bg-white p-2">
                <p className="text-slate-400">인건비</p>
                <p className="font-bold text-slate-100">{fmtWon(cur.labor)}</p>
              </div>
              <div className="rounded-xl bg-white p-2">
                <p className="text-slate-400">예상 부가세</p>
                <p className="font-bold text-amber-300">{fmtWon(Math.max(0, vatDue))}</p>
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-400">세무장부 앱을 한 번 열면 월별 합계가 여기로 옵니다.</p>
        )}
      </div>

      {/* 자동콜백 */}
      <div className="mb-3 rounded-2xl bg-[#F2F3F5] p-3">
        <p className="mb-1.5 flex justify-between text-[11px] font-bold text-slate-300">
          <span>📞 자동콜백 · 최근 3일 걸려온 전화</span>
          {hub?.calls?.updatedAt && <span className="font-normal text-slate-500">{agoText(hub.calls.updatedAt)} 갱신</span>}
        </p>
        {uniq.length === 0 ? (
          <p className="text-xs text-slate-400">{hub?.calls ? '최근 3일 동안 들어온 전화가 없습니다.' : '안드로이드 자동콜백 앱을 업데이트하면 통화 기록이 여기로 옵니다.'}</p>
        ) : (
          <ul className="space-y-1.5">
            {shown.map((c) => {
              const reg = known.has(phoneDigits(c.n));
              return (
                <li key={c.id + c.t} className="flex items-center gap-2 rounded-xl bg-white p-2">
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${c.k === '부재중' ? 'bg-rose-400/15 text-rose-300' : 'bg-sky-400/15 text-sky-200'}`}>{c.k}</span>
                  <a href={`tel:${phoneDigits(c.n)}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100">
                    {prettyPhone(c.n)}
                    <span className="ml-1.5 text-[11px] font-normal text-slate-500">{agoText(c.t)}</span>
                  </a>
                  {reg ? (
                    <span className="shrink-0 text-[11px] text-slate-500">등록됨</span>
                  ) : (
                    <button onClick={() => onAddDeal(c)} className="shrink-0 rounded-lg bg-[#191919] px-2.5 py-1.5 text-[11px] font-bold text-white active:scale-95">
                      문의로 등록
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {uniq.length > 5 && (
          <button onClick={() => setShowAll(!showAll)} className="mt-1.5 w-full text-center text-[11px] text-slate-400">
            {showAll ? '접기' : `${uniq.length - 5}건 더 보기`}
          </button>
        )}
      </div>

      {/* 순위노트 */}
      <div className="rounded-2xl bg-[#F2F3F5] p-3">
        <p className="mb-1.5 flex justify-between text-[11px] font-bold text-slate-300">
          <span>📍 순위노트 · 플레이스 순위{lastD ? ` (${Number(lastD.slice(5, 7))}/${Number(lastD.slice(8))})` : ''}</span>
          {hub?.rank?.updatedAt && <span className="font-normal text-slate-500">{agoText(hub.rank.updatedAt)} 갱신</span>}
        </p>
        {R?.keywords?.length && lastD ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-slate-500">
                <th className="py-1 text-left font-normal">키워드</th>
                {places.slice(0, 2).map((p) => (
                  <th key={p} className="py-1 text-right font-normal">
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {R.keywords.slice(0, 8).map((k) => (
                <tr key={k.id} className="border-t border-[#E9EAEE]">
                  <td className="truncate py-1.5 pr-2 text-slate-200">{k.name}</td>
                  {places.slice(0, 2).map((p, i) => {
                    const v = rk(lastD, k.id, i);
                    const pv = rk(prevD, k.id, i);
                    const better = v !== null && pv !== null && v > 0 && (pv === 0 || v < pv);
                    const worse = v !== null && pv !== null && pv > 0 && (v === 0 || v > pv);
                    return (
                      <td key={p} className={`py-1.5 text-right font-bold tabular-nums ${better ? 'text-emerald-300' : worse ? 'text-rose-300' : 'text-slate-100'}`}>
                        {rt(v)}
                        {better ? ' ▲' : worse ? ' ▼' : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-slate-400">순위노트 앱에 순위를 기록하면 여기에 함께 보입니다.</p>
        )}
      </div>
    </section>
  );
}

function mondayOf(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  const wd = new Date(y, m - 1, d).getDay(); // 0=일
  return addDays(date, wd === 0 ? -6 : 1 - wd);
}

function WeeklyReport({
  today,
  history,
  progress,
  deals,
  ranks,
  keywords,
  settings,
  toast,
}: {
  today: string;
  history: History;
  progress: { done: number; total: number };
  deals: Deal[];
  ranks: RankBook;
  keywords: Keyword[];
  settings: AppSettings;
  toast: (m: string) => void;
}) {
  const start = mondayOf(today);
  const days: string[] = [];
  for (let d = start; d <= today; d = addDays(d, 1)) days.push(d);
  const h = { ...history, [today]: progress };
  const perfect = days.filter((d) => isComplete(h[d])).length;
  const avg = Math.round(
    (days.reduce((a, d) => a + (h[d]?.total ? h[d].done / h[d].total : 0), 0) / Math.max(1, days.length)) * 100,
  );
  const inRange = (x?: string) => !!x && x >= start && x <= today;
  const inq = deals.filter((d) => inRange(d.date)).length;
  const wonList = deals.filter((d) => (d.stage === 'won' || d.stage === 'done') && inRange(d.wonAt));
  const rev = wonList.reduce((a, d) => a + (d.amount ?? 0), 0);
  const done = deals.filter((d) => d.stage === 'done' && inRange(d.doneAt)).length;
  const reviews = deals.filter((d) => d.reviewAsked && inRange(d.doneAt)).length;
  const moves = rankMovesBetween(ranks, keywords, today, start);
  const ups = moves.filter((m) => m.diff > 0);
  const downs = moves.filter((m) => m.diff < 0);
  const [, mm, dd] = start.split('-').map(Number);

  const lines = [
    `📋 ${settings.company || '우리 회사'} 주간 리포트 (${mm}/${dd}~${Number(today.slice(5, 7))}/${Number(today.slice(8))})`,
    '',
    `💰 계약 ${wonList.length}건 · 매출 ${fmtSales(rev)}`,
    `📞 신규 문의 ${inq}건 · 작업 완료 ${done}건 · 후기 요청 ${reviews}건`,
    `✅ 루틴 완벽 달성 ${perfect}/${days.length}일 (평균 ${avg}%)`,
    ups.length ? `📈 순위 상승: ${ups.slice(0, 5).map((m) => `${m.kw}(${m.label} ${rankText(m.prev)}→${rankText(m.cur)})`).join(', ')}` : '📈 순위 상승: 없음',
    downs.length ? `📉 순위 하락: ${downs.slice(-5).map((m) => `${m.kw}(${m.label} ${rankText(m.prev)}→${rankText(m.cur)})`).join(', ')}` : '',
  ].filter((l, i) => i === 1 || l);

  return (
    <section className={card}>
      <SectionTitle icon={Newspaper} title="이번 주 리포트" />
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-2xl bg-[#F2F3F5] p-3">
          <p className="text-xl font-extrabold text-emerald-300">{fmtSales(rev)}</p>
          <p className="text-[11px] text-slate-400">계약 {wonList.length}건</p>
        </div>
        <div className="rounded-2xl bg-[#F2F3F5] p-3">
          <p className="text-xl font-extrabold text-slate-50">{inq}건</p>
          <p className="text-[11px] text-slate-400">신규 문의</p>
        </div>
        <div className="rounded-2xl bg-[#F2F3F5] p-3">
          <p className="text-xl font-extrabold text-amber-300">
            {perfect}/{days.length}일
          </p>
          <p className="text-[11px] text-slate-400">루틴 완벽 달성</p>
        </div>
        <div className="rounded-2xl bg-[#F2F3F5] p-3">
          <p className="text-xl font-extrabold text-sky-300">
            ▲{ups.length} <span className="text-rose-300">▼{downs.length}</span>
          </p>
          <p className="text-[11px] text-slate-400">순위 변동 키워드</p>
        </div>
      </div>
      <button
        onClick={async () => toast((await copyText(lines.join('\n'))) ? '주간 리포트를 복사했습니다. 카톡 ‘나와의 채팅’에 붙여넣어 보관하세요.' : '복사에 실패했습니다.')}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F2F3F5] py-3 font-bold active:scale-95"
      >
        <Copy className="h-4 w-4" /> 카톡용 리포트 복사
      </button>
    </section>
  );
}

/* =========================================================
 *  [탭 5] 3초 메모장
 * ========================================================= */
function MemoTab({
  memos,
  setMemos,
  toast,
}: {
  memos: Memo[];
  setMemos: React.Dispatch<React.SetStateAction<Memo[]>>;
  toast: (m: string) => void;
}) {
  const [text, setText] = useState('');
  const [tag, setTag] = useState(MEMO_TAGS[0].key);
  const [filter, setFilter] = useState<string>('전체');
  const [listening, setListening] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<SRLike | null>(null);

  useEffect(() => () => recRef.current?.stop(), []);

  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const SR = getSpeechRecognition();
    if (!SR) {
      toast('이 브라우저는 음성 인식을 지원하지 않습니다. 키보드의 🎤 받아쓰기 버튼을 이용해 주세요.');
      taRef.current?.focus();
      return;
    }
    const rec = new SR();
    rec.lang = 'ko-KR';
    rec.interimResults = true;
    rec.continuous = false;
    const base = text ? text.trimEnd() + ' ' : '';
    rec.onresult = (e) => {
      let said = '';
      for (let i = 0; i < e.results.length; i++) said += e.results[i][0].transcript;
      setText(base + said);
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') toast('마이크 권한을 허용해 주세요. (설정 › Safari › 마이크)');
      else if (e.error !== 'aborted' && e.error !== 'no-speech') toast('음성 인식 중 문제가 발생했습니다. 다시 시도해 주세요.');
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
      toast('음성 인식을 시작하지 못했습니다. 키보드 🎤 받아쓰기를 이용해 주세요.');
    }
  };

  const add = () => {
    const t = text.trim();
    if (!t) return;
    setMemos((l) => [{ id: uid(), text: t, tag, done: false, createdAt: Date.now() }, ...l]);
    setText('');
    taRef.current?.focus();
  };

  const visible = memos
    .filter((m) => filter === '전체' || m.tag === filter)
    .sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt);
  const doneCount = memos.filter((m) => m.done).length;
  const tagCls = (k: string) => MEMO_TAGS.find((t) => t.key === k)?.cls ?? 'bg-[#F2F3F5] text-slate-300 border-[#E9EAEE]';

  return (
    <div className="space-y-4">
      <section className={card}>
        <SectionTitle icon={StickyNote} title="비서실 3초 메모" />
        <div className="mb-2 flex flex-wrap gap-2">
          {MEMO_TAGS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTag(t.key)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                tag === t.key ? t.cls + ' ring-2 ring-[#191919]/30' : 'border-[#E9EAEE] text-slate-400'
              }`}
            >
              {t.key}
            </button>
          ))}
        </div>
        <textarea
          ref={taRef}
          rows={3}
          className={`${input} resize-none`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) add();
          }}
          placeholder="현장 아이디어, 고객 특이사항, 주문할 용품을 바로 적으세요"
        />
        {listening && (
          <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-rose-300">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-400" /> 듣고 있습니다… 말씀이 끝나면 자동으로 멈춥니다.
          </p>
        )}
        <div className="mt-2 grid grid-cols-[auto_1fr] gap-2">
          <button
            onClick={toggleMic}
            className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-base font-bold active:scale-95 ${
              listening ? 'bg-rose-500 text-white' : 'bg-[#F2F3F5] text-slate-100'
            }`}
            aria-label="음성으로 메모"
          >
            {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            {listening ? '중지' : '말로'}
          </button>
          <button
            onClick={add}
            className="flex items-center justify-center gap-2 rounded-xl bg-cw py-3.5 text-base font-bold text-[#191919] active:scale-[0.98]"
          >
            <Save className="h-5 w-5" /> 저장
          </button>
        </div>
      </section>

      <section className={card}>
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {['전체', ...MEMO_TAGS.map((t) => t.key)].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
                filter === f ? 'bg-cw text-[#191919]' : 'bg-[#F2F3F5] text-slate-300'
              }`}
            >
              {f} {f === '전체' ? memos.length : memos.filter((m) => m.tag === f).length}
            </button>
          ))}
        </div>

        {visible.length === 0 && <p className="py-8 text-center text-sm text-slate-500">아직 메모가 없습니다.</p>}

        <ul className="space-y-2">
          {visible.map((m) => (
            <li key={m.id} className={`flex items-start gap-3 rounded-2xl p-3 ${m.done ? 'bg-[#F2F3F5]/60' : 'bg-[#F2F3F5]'}`}>
              <button
                onClick={() => setMemos((l) => l.map((x) => (x.id === m.id ? { ...x, done: !x.done } : x)))}
                className="mt-0.5 shrink-0"
                aria-label="완료"
              >
                {m.done ? <CircleCheck className="h-7 w-7 text-emerald-400" /> : <Circle className="h-7 w-7 text-slate-500" />}
              </button>
              <div className="min-w-0 flex-1">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tagCls(m.tag)}`}>{m.tag}</span>
                <p className={`mt-1 whitespace-pre-wrap break-words text-base ${m.done ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
                  {m.text}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {new Date(m.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={() => setMemos((l) => l.filter((x) => x.id !== m.id))} className="shrink-0 rounded-lg p-2 text-slate-500" aria-label="삭제">
                <Trash2 className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>

        {doneCount > 0 && (
          <button
            onClick={() => setMemos((l) => l.filter((m) => !m.done))}
            className="mt-4 w-full rounded-xl border border-rose-400/30 bg-rose-500/10 py-3 font-bold text-rose-200 active:scale-[0.98]"
          >
            완료한 메모 {doneCount}개 지우기
          </button>
        )}
      </section>
    </div>
  );
}

/* =========================================================
 *  [탭 5] 시리 연동 가이드
 * ========================================================= */
function SiriTab({
  toast,
  onSpeakTest,
  iconStyle,
  onIconStyle,
}: {
  toast: (m: string) => void;
  onSpeakTest: () => void;
  iconStyle: IconStyle;
  onIconStyle: (s: IconStyle) => void;
}) {
  const base = `${location.origin}${location.pathname}`;
  const [importText, setImportText] = useState('');

  const shortcuts = [
    { phrase: '비서 브리핑', desc: '앱을 열고 음성 브리핑을 바로 재생합니다.', url: `${base}?action=briefing` },
    { phrase: '약 먹었어', desc: '지금 시간대(아침/점심/저녁) 약 복용을 체크합니다.', url: `${base}?action=medicine` },
    { phrase: '거울샷 완료', desc: '출근 거울샷 촬영 루틴을 완료 처리합니다.', url: `${base}?action=mirror` },
    { phrase: '블로그 완료', desc: '블로그 포스팅 루틴을 완료 처리합니다.', url: `${base}?action=blog` },
  ];

  const copy = async (t: string, label = '링크를 복사했습니다.') => toast((await copyText(t)) ? label : '복사에 실패했습니다.');

  const exportData = async () => {
    const data: Record<string, unknown> = {};
    STORAGE_KEYS.forEach((k) => {
      const raw = localStorage.getItem(SK + k);
      if (raw) data[k] = JSON.parse(raw);
    });
    copy(JSON.stringify(data), '전체 데이터를 복사했습니다. 다른 곳의 [데이터 붙여넣기]에 넣어주세요.');
  };

  const importData = () => {
    try {
      const data = JSON.parse(importText) as Record<string, unknown>;
      const keys = Object.keys(data).filter((k) => STORAGE_KEYS.includes(k));
      if (!keys.length) throw new Error('empty');
      if (!confirm('현재 기기의 데이터를 붙여넣은 데이터로 덮어쓸까요?')) return;
      keys.forEach((k) => localStorage.setItem(SK + k, JSON.stringify(data[k])));
      location.reload();
    } catch {
      toast('데이터 형식이 올바르지 않습니다.');
    }
  };

  return (
    <div className="space-y-4">
      <section className={card}>
        <SectionTitle icon={Smartphone} title="아이폰 시리 연동" />
        <p className="text-sm leading-relaxed text-slate-300">
          아이폰 기본 <b className="text-amber-200">‘단축어’</b> 앱에 아래 링크를 등록하면, “시리야 비서 브리핑”처럼 말로 비서실을 부를 수 있습니다.
        </p>
        <div className="mt-3 rounded-2xl bg-[#F2F3F5] p-3">
          <p className="text-[11px] text-slate-400">감지된 내 앱 주소</p>
          <p className="mt-1 break-all font-mono text-sm text-emerald-300">{base}</p>
        </div>
        <button onClick={onSpeakTest} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F2F3F5] py-3 font-bold active:scale-95">
          <Volume2 className="h-5 w-5" /> 음성 브리핑 미리 듣기
        </button>
      </section>

      <section className={card}>
        <SectionTitle icon={ClipboardList} title="1분 등록법 (링크형)" />
        <ol className="mb-4 space-y-2 text-sm leading-relaxed text-slate-300">
          <li><b className="text-amber-200">①</b> 아래에서 원하는 명령의 <b>[복사]</b>를 누릅니다.</li>
          <li><b className="text-amber-200">②</b> ‘단축어’ 앱 → 우측 상단 <b>＋</b> → <b>동작 추가</b> → <b>‘URL 열기’</b> 검색·선택</li>
          <li><b className="text-amber-200">③</b> URL 칸에 붙여넣기</li>
          <li><b className="text-amber-200">④</b> 맨 위 단축어 이름을 <b>시리에게 말할 문장</b>(예: 비서 브리핑)으로 바꾸고 완료</li>
          <li><b className="text-amber-200">⑤</b> “시리야, 비서 브리핑” 하고 말해보세요.</li>
        </ol>
        <ul className="space-y-3">
          {shortcuts.map((s) => (
            <li key={s.phrase} className="rounded-2xl border border-[#E9EAEE] bg-[#F2F3F5] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-extrabold text-amber-200">“시리야, {s.phrase}”</p>
                <button onClick={() => copy(s.url)} className="flex shrink-0 items-center gap-1 rounded-xl bg-cw px-3 py-2 text-sm font-bold text-[#191919] active:scale-95">
                  <Copy className="h-4 w-4" /> 복사
                </button>
              </div>
              <p className="mt-1 text-sm text-slate-300">{s.desc}</p>
              <p className="mt-1 break-all font-mono text-[11px] text-slate-500">{s.url}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={card}>
        <SectionTitle icon={Mic} title="“시리야, 비서 메모” 등록법" />
        <ol className="space-y-2 text-sm leading-relaxed text-slate-300">
          <li><b className="text-amber-200">①</b> 새 단축어 → 동작 <b>‘텍스트 받아쓰기’</b> 추가</li>
          <li><b className="text-amber-200">②</b> 동작 <b>‘URL 인코딩’</b> 추가 (입력: 받아쓴 텍스트)</li>
          <li>
            <b className="text-amber-200">③</b> 동작 <b>‘텍스트’</b> 추가 → 아래 주소를 붙여넣고, 맨 끝에 변수 <b>‘URL 인코딩된 텍스트’</b>를 삽입
          </li>
          <li><b className="text-amber-200">④</b> 동작 <b>‘URL 열기’</b> 추가 (입력: 텍스트)</li>
          <li><b className="text-amber-200">⑤</b> 이름을 <b>비서 메모</b>로 저장 → “시리야, 비서 메모” 후 내용을 말하면 메모장에 자동 저장</li>
        </ol>
        <button onClick={() => copy(`${base}?memo=`)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-cw py-3 font-bold text-[#191919] active:scale-95">
          <Copy className="h-4 w-4" /> 메모용 주소 복사
        </button>
        <p className="mt-2 break-all font-mono text-[11px] text-slate-500">{base}?memo=</p>
        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          약 복용 시간대를 직접 지정하려면 주소 뒤에 <span className="font-mono text-slate-300">&amp;slot=아침</span>을 붙이세요. 메모 분류는{' '}
          <span className="font-mono text-slate-300">&amp;tag=주문</span>처럼 지정할 수 있습니다.
        </p>
      </section>

      <section className={`${card} border-yellow-400/30`}>
        <SectionTitle icon={TriangleAlert} title="꼭 알아두실 점" />
        <ul className="space-y-2 text-sm leading-relaxed text-slate-300">
          <li>• 단축어의 ‘URL 열기’는 <b>사파리</b>로 열립니다. 아이폰은 홈 화면 앱과 사파리의 저장공간이 분리되어 있어, 시리로 체크한 기록은 사파리 쪽에 저장됩니다.</li>
          <li>• 시리를 자주 쓰신다면 <b>사파리에서 이 앱을 즐겨찾기</b>해 그쪽으로 통일해 쓰시는 것을 권장합니다.</li>
          <li>• 아이폰 정책상 음성은 화면을 한 번 터치해야 재생됩니다. 시리로 브리핑을 열면 <b>재생 버튼</b>이 크게 뜹니다.</li>
        </ul>
      </section>

      <section className={card}>
        <SectionTitle icon={Save} title="데이터 옮기기 (홈 화면 앱 ↔ 사파리)" />
        <button onClick={exportData} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F2F3F5] py-3 font-bold active:scale-95">
          <Copy className="h-4 w-4" /> 이 기기 데이터 복사
        </button>
        <textarea
          rows={3}
          className={`${input} mt-3 resize-none font-mono text-xs`}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="복사한 데이터를 여기에 붙여넣기"
        />
        <button
          onClick={importData}
          disabled={!importText.trim()}
          className="mt-2 w-full rounded-xl bg-cw py-3 font-bold text-[#191919] active:scale-95 disabled:opacity-40"
        >
          데이터 붙여넣기 (덮어쓰기)
        </button>
      </section>

      <IconStudio iconStyle={iconStyle} onChange={onIconStyle} toast={toast} />
    </div>
  );
}

/* =========================================================
 *  아이폰 바탕화면 아이콘 꾸미기 & 다운로드
 * ========================================================= */
function IconStudio({
  iconStyle,
  onChange,
  toast,
}: {
  iconStyle: IconStyle;
  onChange: (s: IconStyle) => void;
  toast: (m: string) => void;
}) {
  const previews = useMemo(() => {
    const out = {} as Record<IconStyle, string>;
    ICON_STYLES.forEach((s) => (out[s.key] = iconDataUrl(s.key, 240)));
    return out;
  }, []);
  const big = useMemo(() => iconDataUrl(iconStyle, 512), [iconStyle]);

  const download = () => {
    const canvas = renderIconCanvas(iconStyle, 512);
    const save = (href: string, revoke: boolean) => {
      const a = document.createElement('a');
      a.href = href;
      a.download = 'icon-512.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (revoke) setTimeout(() => URL.revokeObjectURL(href), 4000);
      toast('icon-512.png 저장을 시작했습니다. (아이폰은 ‘파일’ 앱 › 다운로드)');
    };
    try {
      canvas.toBlob((blob) => (blob ? save(URL.createObjectURL(blob), true) : save(big, false)), 'image/png');
    } catch {
      save(big, false);
    }
  };

  return (
    <section className={`${card} border-cw/30`}>
      <SectionTitle icon={Sparkles} title="📱 아이폰 바탕화면 아이콘 꾸미기 & 다운로드" />
      <p className="-mt-2 mb-4 text-sm leading-relaxed text-slate-300">
        디자인을 고르면 이 앱의 홈 화면 아이콘으로 바로 적용됩니다. 고른 뒤 사파리 공유 버튼 › <b className="text-amber-200">홈 화면에 추가</b>를 누르세요.
      </p>

      <div className="grid grid-cols-3 gap-3">
        {ICON_STYLES.map((s) => {
          const on = s.key === iconStyle;
          return (
            <button
              key={s.key}
              onClick={() => {
                onChange(s.key);
                toast(`${s.name} 아이콘을 적용했습니다.`);
              }}
              className={`rounded-2xl p-2 text-center transition active:scale-95 ${
                on ? 'bg-cw/15 ring-2 ring-cw' : 'bg-[#F2F3F5]'
              }`}
              aria-pressed={on}
            >
              <img src={previews[s.key]} alt={s.name} className="mx-auto aspect-square w-full rounded-[22%]" />
              <p className={`mt-2 text-[11px] font-bold leading-tight ${on ? 'text-amber-200' : 'text-slate-300'}`}>{s.short}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-4 rounded-2xl bg-[#F2F3F5] p-4">
        <img src={big} alt="선택한 아이콘 512px" className="h-24 w-24 shrink-0 rounded-[22%]" />
        <div className="min-w-0">
          <p className="font-extrabold text-amber-200">{ICON_STYLES.find((s) => s.key === iconStyle)?.name}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{ICON_STYLES.find((s) => s.key === iconStyle)?.desc}</p>
          <p className="mt-1 text-[11px] text-slate-500">512×512 PNG · 왼쪽 이미지를 길게 눌러 ‘사진에 저장’도 됩니다.</p>
        </div>
      </div>

      <button
        onClick={download}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#191919] py-3.5 text-base font-extrabold text-white active:scale-[0.98]"
      >
        <Download className="h-5 w-5" /> icon-512.png 다운로드
      </button>

      <div className="mt-4 rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-3 text-xs leading-relaxed text-yellow-100">
        이미 홈 화면에 추가한 아이콘은 아이폰이 바꿔주지 않습니다. 새 디자인을 쓰려면 기존 아이콘을 길게 눌러 <b>앱 제거</b> 후, 사파리에서 다시 <b>홈 화면에 추가</b>해 주세요. (데이터는 그대로 남습니다)
      </div>
    </section>
  );
}

/* =========================================================
 *  설정 모달
 * ========================================================= */
function SettingsModal({
  settings,
  onSave,
  onClose,
  onOpenCenter,
}: {
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
  onClose: () => void;
  onOpenCenter: () => void;
}) {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [showKey, setShowKey] = useState(false);
  const [test, setTest] = useState('');
  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 sm:items-center sm:justify-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border-t border-[#E9EAEE] bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] sm:max-w-md sm:rounded-[14px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="flex items-center gap-2 text-lg font-bold">
            <Settings className="h-5 w-5 text-amber-300" /> 비서실 설정
          </p>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <button
            onClick={onOpenCenter}
            className="flex w-full items-center justify-between rounded-2xl border border-cw/30 bg-cw/10 p-4 text-left active:scale-[0.98]"
          >
            <span>
              <span className="block font-bold text-amber-200">📱 시리 · 아이콘 · 백업 센터</span>
              <span className="mt-0.5 block text-xs text-slate-400">시리 단축어 등록, 홈 화면 아이콘 꾸미기, 데이터 옮기기</span>
            </span>
            <ChevronDown className="h-5 w-5 -rotate-90 text-amber-200" />
          </button>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-300">업체명</span>
            <input className={input} value={draft.company} onChange={(e) => set('company', e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-300">업력 (년)</span>
            <input
              className={input}
              type="number"
              inputMode="numeric"
              value={draft.years}
              onChange={(e) => set('years', Number(e.target.value) || 0)}
            />
          </label>
          <div>
            <span className="mb-1 block text-sm text-slate-300">위치를 못 찾을 때 보여줄 기본 지역</span>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(CITIES) as CityKey[]).map((c) => (
                <button
                  key={c}
                  onClick={() => set('defaultCity', c)}
                  className={`rounded-xl py-3 font-bold ${draft.defaultCity === c ? 'bg-cw text-[#191919]' : 'bg-[#F2F3F5] text-slate-200'}`}
                >
                  {CITIES[c].name}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm text-slate-300">링크 허브 비밀번호 <span className="text-slate-500">(세무장부·순위노트·자동콜백 연결)</span></span>
            <input className={input} value={draft.hubPin ?? ''} onChange={(e) => set('hubPin', e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="숫자 6자리" />
          </label>

          <details className="rounded-2xl border border-[#E9EAEE] bg-[#F2F3F5] p-4" open={!!draft.rankWorkerUrl}>
            <summary className="cursor-pointer text-sm font-bold text-slate-300">
              고급 · 네이버 자동화 <span className="font-normal text-slate-500">(선택 · 네이버 등록 필요, 없어도 앱은 그대로 작동)</span>
            </summary>
            <p className="mb-2 mt-3 flex items-center gap-2 text-sm font-bold text-emerald-200">
              <RefreshCw className="h-4 w-4" /> 네이버 순위 자동 체크
            </p>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-400">중계 서버 주소 (Cloudflare Worker)</span>
              <input
                className={input}
                value={draft.rankWorkerUrl ?? ''}
                onChange={(e) => set('rankWorkerUrl', e.target.value)}
                placeholder="https://naver-rank.내계정.workers.dev"
                autoComplete="off"
                inputMode="url"
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs text-slate-400">내 네이버 블로그 ID 또는 주소</span>
              <input
                className={input}
                value={draft.blogId ?? ''}
                onChange={(e) => set('blogId', e.target.value)}
                placeholder="예: blog.naver.com/linkclean"
                autoComplete="off"
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs text-slate-400">내 홈페이지 주소</span>
              <input
                className={input}
                value={draft.siteDomain ?? ''}
                onChange={(e) => set('siteDomain', e.target.value)}
                placeholder="예: linkclean.co.kr"
                autoComplete="off"
                inputMode="url"
              />
            </label>
            <button
              onClick={async () => {
                const base = (draft.rankWorkerUrl || '').trim().replace(/\/+$/, '');
                if (!base) return setTest('서버 주소를 입력해 주세요.');
                setTest('연결 확인 중…');
                try {
                  const r = await fetch(base + '/');
                  const d = await r.json();
                  setTest(
                    `✅ 서버 연결 성공\n${d.ready ? '✅' : '❌'} 순위 체크 키 (NAVER_CLIENT_ID / SECRET)\n${
                      d.keywordReady ? '✅' : '❌'
                    } 황금키워드 키 (SEARCHAD_API_KEY / SECRET_KEY / CUSTOMER_ID)`,
                  );
                } catch {
                  setTest('❌ 연결 실패 · 주소를 다시 확인해 주세요.');
                }
              }}
              className={`${btnGhost} mt-3 w-full font-bold`}
            >
              연결 테스트
            </button>
            {test && <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-300">{test}</p>}
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">블로그 ID를 비워두면 블로그 이름에 업체명이 들어간 글을 찾습니다.</p>
          </details>

          <div className="rounded-2xl border border-cw/20 bg-[#F2F3F5] p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-200">
              <Sparkles className="h-4 w-4" /> Gemini AI (선택)
            </p>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-400">API 키 — Google AI Studio에서 무료 발급</span>
              <div className="flex gap-2">
                <input
                  className={input}
                  type={showKey ? 'text' : 'password'}
                  value={draft.geminiKey}
                  onChange={(e) => set('geminiKey', e.target.value)}
                  placeholder="AIza..."
                  autoComplete="off"
                />
                <button onClick={() => setShowKey((v) => !v)} className={`${btnGhost} shrink-0 text-xs`}>
                  {showKey ? '숨김' : '보기'}
                </button>
              </div>
            </label>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs text-slate-400">모델명</span>
              <input className={input} value={draft.geminiModel} onChange={(e) => set('geminiModel', e.target.value)} />
            </label>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              키는 이 기기의 브라우저에만 저장됩니다. 키가 없어도 내장 추천 알고리즘으로 바로 작동합니다.
            </p>
          </div>
        </div>

        <button
          onClick={() => onSave(draft)}
          className="mt-5 w-full rounded-xl bg-cw py-3.5 text-base font-bold text-[#191919] active:scale-[0.98]"
        >
          저장
        </button>
      </div>
    </div>
  );
}

/* =========================================================
 *  메인 App
 * ========================================================= */
const TABS: { key: Tab; label: string; Icon: LucideIcon }[] = [
  { key: 'brief', label: '브리핑', Icon: Newspaper },
  { key: 'routine', label: '루틴', Icon: ClipboardList },
  { key: 'sales', label: '영업', Icon: TrendingUp },
  { key: 'keyword', label: '키워드', Icon: KeyRound },
  { key: 'memo', label: '메모', Icon: StickyNote },
];

/** 이름/분류로 기본 루틴 찾기 (사용자가 수정해도 최대한 찾아냄) */
function findRoutine(routines: Routine[], id: string, words: string[]) {
  return routines.find((r) => r.id === id) ?? routines.find((r) => words.some((w) => (r.title + r.category).includes(w)));
}

export default function App() {
  const today = useToday();

  const [tab, setTab] = useLocal<Tab>('tab', 'brief');
  const [settings, setSettings] = useLocal<AppSettings>('settings', DEFAULT_SETTINGS);
  const iconStyle: IconStyle = ICON_STYLES.some((s) => s.key === settings.iconStyle) ? (settings.iconStyle as IconStyle) : 'vip';
  usePwaSetup(iconStyle);
  const [routines, setRoutines] = useLocal<Routine[]>('routines', DEFAULT_ROUTINES);
  const [day, setDay] = useLocal<RoutineDay>('routineDay', { date: today, checks: {} });
  const [history, setHistory] = useLocal<History>('history', {});
  const [keywords, setKeywords] = useLocal<Keyword[]>('keywords', DEFAULT_KEYWORDS);
  const [ranks, setRanks] = useLocal<RankBook>('ranks', {});
  const [golden, setGolden] = useLocal<Golden | null>('golden', null);
  const [memos, setMemos] = useLocal<Memo[]>('memos', []);
  const [deals, setDeals] = useLocal<Deal[]>('deals', []);
  const [agent, setAgent] = useLocal<AgentDaily | null>('agent', null);
  const [agentRanks, setAgentRanks] = useLocal<AgentRanks | null>('agentRanks', null);
  const [agentStatus, setAgentStatus] = useLocal<AgentStatus | null>('agentStatus', null);
  const [bids, setBids] = useLocal<BidsData | null>('bids', null);
  const [agentDone, setAgentDone] = useLocal<{ date: string; idx: number[] }>('agentDone', { date: '', idx: [] });
  const [hub, setHub] = useLocal<HubData | null>('hub', null);
  const [hubStatus, setHubStatus] = useState<'' | 'loading' | 'badpin' | 'error'>('');
  const hubPin = settings.hubPin ?? '';
  const loadHub = useCallback(async (pin: string) => {
    if (!pin) return;
    setHubStatus('loading');
    const r = await fetchHub(pin);
    if (r === 'badpin') setHubStatus('badpin');
    else if (!r) setHubStatus('error');
    else {
      setHub(r);
      setHubStatus('');
    }
  }, [setHub]);
  // ?hpin=xxxxxx 로 열면 비밀번호를 이 폰에 저장하고 주소창에서는 지움
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const hp = sp.get('hpin');
    if (!hp) return;
    const pin = hp.replace(/\D/g, '');
    if (pin) setSettings((p) => ({ ...p, hubPin: pin }));
    sp.delete('hpin');
    const q = sp.toString();
    try {
      window.history.replaceState(null, '', window.location.pathname + (q ? '?' + q : '') + window.location.hash);
    } catch {
      /* ignore */
    }
  }, [setSettings]);
  useEffect(() => {
    if (!hubPin) return;
    loadHub(hubPin);
    const onVis = () => document.visibilityState === 'visible' && loadHub(hubPin);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [hubPin, loadHub]);
  const salesStats = useMemo(() => computeSales(deals, today, settings.monthlyTarget ?? 0), [deals, today, settings.monthlyTarget]);
  const salesTodo = salesStats.followUps.length + salesStats.reviewAsks.length + salesStats.todayJobs.length;
  const secJobs = secJobsFor(today);
  const secDone = secJobs.filter((jb) => secJobState(jb, agentStatus, agent, today) === 'done').length;
  const rankMoves = useMemo(() => rankMovesBetween(ranks, keywords, today, today), [ranks, keywords, today]);

  // 날씨 위치: 기본은 휴대폰 현재 위치(자동). 위치 권한이 없으면 설정의 기본 지역으로.
  const [here, setHere] = useLocal<HerePos | null>('here', null);
  const [city, setCity] = useState<PlaceKey>('here');
  const [locating, setLocating] = useState(false);
  const [weatherMap, setWeatherMap] = useState<Partial<Record<PlaceKey, Weather>>>({});
  const [wLoading, setWLoading] = useState(false);
  const [wError, setWError] = useState('');
  const [gLoading, setGLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const [celebrate, setCelebrate] = useState(false);

  const toastTimer = useRef<number | undefined>(undefined);
  const toast = useCallback((m: string) => {
    setToastMsg(m);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(''), 2400);
  }, []);

  /* ---------- 자정 자동 초기화 ---------- */
  useEffect(() => {
    if (day.date !== today) setDay({ date: today, checks: {} });
  }, [today, day.date, setDay]);

  const checks = useMemo(() => (day.date === today ? day.checks : {}), [day, today]);
  const progress = useMemo(() => computeProgress(routines, checks), [routines, checks]);
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  // 오늘 달성 기록을 history에 실시간 반영 (지난날 기록은 그대로 보존)
  useEffect(() => {
    if (day.date !== today) return;
    setHistory((h) => {
      const cur = h[today];
      if (cur && cur.done === progress.done && cur.total === progress.total) return h;
      return { ...h, [today]: progress };
    });
  }, [today, day.date, progress, setHistory]);

  const streak = useMemo(() => {
    const h = { ...history, [today]: progress };
    let d = isComplete(h[today]) ? today : addDays(today, -1);
    let s = 0;
    while (isComplete(h[d])) {
      s++;
      d = addDays(d, -1);
    }
    return s;
  }, [history, today, progress]);

  const toggle = useCallback(
    (key: string) => {
      setDay((prev) => {
        const base = prev.date === today ? prev.checks : {};
        return { date: today, checks: { ...base, [key]: !base[key] } };
      });
    },
    [today, setDay],
  );

  /* ---------- 100% 달성 축하 ---------- */
  const prevPct = useRef<number | null>(null);
  useEffect(() => {
    if (prevPct.current !== null && prevPct.current < 100 && pct === 100) setCelebrate(true);
    prevPct.current = pct;
  }, [pct]);
  useEffect(() => {
    if (!celebrate) return;
    const t = window.setTimeout(() => setCelebrate(false), 3500);
    return () => window.clearTimeout(t);
  }, [celebrate]);

  /* ---------- 날씨 ---------- */
  const loadWeather = useCallback(async (c: PlaceKey, pos?: HerePos | null) => {
    setWLoading(true);
    setWError('');
    try {
      const w = await fetchWeather(c, pos);
      setWeatherMap((m) => ({ ...m, [c]: w }));
    } catch {
      setWError('날씨 정보를 불러오지 못했습니다. 네트워크를 확인한 뒤 새로고침을 눌러주세요.');
    } finally {
      setWLoading(false);
    }
  }, []);

  /** 현재 위치를 새로 잡고 그 위치 날씨를 불러옴. 실패하면 기본 지역으로 전환 */
  const locate = useCallback(
    async (silent: boolean) => {
      setLocating(true);
      try {
        const { lat, lon } = await getPosition();
        // 같은 동네(약 1km 이내)면 이름 조회 생략
        const near = here && Math.abs(here.lat - lat) < 0.01 && Math.abs(here.lon - lon) < 0.01;
        const name = near ? here!.name : await placeNameOf(lat, lon);
        const pos: HerePos = { lat, lon, name, at: Date.now() };
        setHere(pos);
        await loadWeather('here', pos);
      } catch (e) {
        const denied = (e as GeolocationPositionError)?.code === 1;
        if (here) {
          // 예전에 잡아둔 위치가 있으면 그걸로
          await loadWeather('here', here);
        } else {
          const fallback = settings.defaultCity ?? 'jeju';
          setCity(fallback);
          if (!silent)
            toast(
              denied
                ? '위치 권한이 꺼져 있어 기본 지역 날씨를 보여드립니다. (아이폰 설정 › 개인정보 보호 › 위치 서비스 › Safari 웹 사이트)'
                : '위치를 찾지 못해 기본 지역 날씨를 보여드립니다.',
            );
        }
      } finally {
        setLocating(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [here, loadWeather, settings.defaultCity, toast],
  );

  // 앱을 열 때마다 현재 위치 자동 확인 (예전 위치가 있으면 그 날씨를 먼저 보여주고 갱신)
  const located = useRef(false);
  useEffect(() => {
    if (located.current) return;
    located.current = true;
    if (here) loadWeather('here', here);
    locate(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (city === 'here') return; // 내 위치는 locate()가 담당
    const w = weatherMap[city];
    if (!w || Date.now() - w.fetchedAt > 10 * 60 * 1000) loadWeather(city);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, loadWeather]);

  const weather = weatherMap[city] ?? null;

  /* ---------- 황금키워드 ---------- */
  /* ---------- 🤵 비서 자동 업무 결과 불러오기 (앱을 열 때·다시 볼 때마다) ---------- */
  useEffect(() => {
    const load = async () => {
      const [d, r, st, bd] = await Promise.all([
        fetchAgentJson<AgentDaily>('today.json'),
        fetchAgentJson<AgentRanks>('ranks.json'),
        fetchAgentJson<AgentStatus>('status.json'),
        fetchAgentJson<BidsData>('bids.json'),
      ]);
      if (d && d.date) setAgent(d);
      if (r && r.byDate) setAgentRanks(r);
      if (st && st.date) setAgentStatus(st);
      if (bd && bd.date) setBids(bd);
    };
    load();
    const onVis = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [setAgent, setAgentRanks, setAgentStatus, setBids]);

  // 비서가 리서치한 황금키워드가 오늘 것이면 그걸 우선 사용
  useEffect(() => {
    if (!agent || agent.date !== today || !agent.golden?.length) return;
    if (golden?.source === 'agent' && golden.date === today) return;
    const keywords = agent.golden.slice(0, 3).map((g) => ({ kw: g.kw, reason: g.reason }));
    const titles = agent.blog
      ? [{ title: agent.blog.title, intro: agent.blog.body.split(/\n\s*\n/)[0].slice(0, 220) }, ...makeLocalTitles(keywords.slice(1), today, null, settings, 'agent')]
      : makeLocalTitles(keywords, today, null, settings, 'agent');
    setGolden({ date: today, source: 'agent', keywords, titles });
  }, [agent, today, golden, settings, setGolden]);

  // 비서가 PC로 직접 검색한 네이버 순위를 키워드 기록에 반영 (대표님이 직접 고친 칸은 건드리지 않음)
  useEffect(() => {
    if (!agentRanks?.byDate) return;
    setRanks((book) => {
      let changed = false;
      const next: RankBook = { ...book };
      Object.entries(agentRanks.byDate ?? {}).forEach(([date, byKw]) => {
        Object.entries(byKw).forEach(([kwText, v]) => {
          const kw = keywords.find((k) => normKw(k.text) === normKw(kwText));
          if (!kw) return;
          const dayRec = { ...(next[date] ?? {}) };
          const rec: RankRec = { ...(dayRec[kw.id] ?? {}), auto: { ...(dayRec[kw.id]?.auto ?? {}) } };
          (['blog', 'web'] as const).forEach((f) => {
            const val = v[f];
            if (typeof val !== 'number') return;
            const manual = rec[f] !== undefined && rec.auto?.[f] !== true;
            if (manual || rec[f] === val) return;
            rec[f] = val;
            rec.auto![f] = true;
            changed = true;
          });
          dayRec[kw.id] = rec;
          next[date] = dayRec;
        });
      });
      return changed ? next : book;
    });
  }, [agentRanks, keywords, setRanks]);

  // 하루에 한 번, 날씨가 로드되면 내장 알고리즘으로 자동 생성
  useEffect(() => {
    if (golden && golden.date === today) return;
    if (!weather && !wError) return;
    setGolden(localGolden(today, weather, settings, ''));
  }, [today, golden, weather, wError, settings, setGolden]);

  const generateGolden = useCallback(
    async (mode: GoldenMode, silent = false) => {
      const w = weatherMap[city] ?? weatherMap.here ?? weatherMap.jeju ?? null;
      const tracked = keywords.map((k) => k.text);
      if (mode === 'local') {
        setGolden(localGolden(today, w, settings, uid()));
        toast('새로운 추천을 준비했습니다.');
        return;
      }
      setGLoading(true);
      try {
        if (mode === 'data') {
          const g = await dataGolden(today, w, settings, tracked);
          setGolden(g);
          if (!silent) toast(`📊 실제 검색량 데이터로 황금키워드를 골랐습니다. (후보 ${g.pool?.length ?? 0}개)`);
        } else if (golden?.source === 'data' && golden.date === today) {
          // 데이터 키워드는 유지하고 제목·도입부만 AI로 다시 작성
          const ai = await geminiGolden(today, w, settings, tracked, golden.keywords);
          setGolden({ ...golden, titles: ai.titles, titleBy: 'ai' });
          toast('Gemini AI가 데이터 키워드로 제목을 다시 썼습니다.');
        } else {
          setGolden(await geminiGolden(today, w, settings, tracked));
          toast('Gemini AI가 오늘의 황금키워드를 생성했습니다.');
        }
      } catch (e) {
        if (silent) return;
        const msg = e instanceof Error ? e.message : '';
        if (mode === 'data') toast(`데이터 조회 실패: ${msg || '서버 설정을 확인해 주세요.'}`);
        else {
          setGolden(localGolden(today, w, settings, uid()));
          toast('AI 생성에 실패해 내장 추천으로 대체했습니다. API 키·모델명을 확인해 주세요.');
        }
      } finally {
        setGLoading(false);
      }
    },
    [weatherMap, city, today, settings, keywords, golden, setGolden, toast],
  );

  // 중계 서버가 설정돼 있으면 하루 한 번 실제 검색량 데이터로 자동 갱신 (실패하면 조용히 내장 추천 유지)
  const dataTried = useRef('');
  useEffect(() => {
    if (!settings.rankWorkerUrl?.trim() || dataTried.current === today) return;
    if (golden?.source === 'data' && golden.date === today) return;
    if (!weather && !wError) return;
    dataTried.current = today;
    generateGolden('data', true);
  }, [today, settings.rankWorkerUrl, golden, weather, wError, generateGolden]);

  /* ---------- 순위 기록 ---------- */
  const setRank = useCallback(
    (kwId: string, field: RankField, v: number | undefined) => {
      setRanks((book) => {
        const dayRec = { ...(book[today] ?? {}) };
        const rec: RankRec = { ...(dayRec[kwId] ?? {}) };
        if (v === undefined) delete rec[field];
        else rec[field] = v;
        if (rec.auto) rec.auto = { ...rec.auto, [field]: false };
        dayRec[kwId] = rec;
        return { ...book, [today]: dayRec };
      });
    },
    [today, setRanks],
  );

  const applyAutoRanks = useCallback(
    (kwId: string, r: AutoRankResult) => {
      setRanks((book) => {
        const dayRec = { ...(book[today] ?? {}) };
        const rec: RankRec = { ...(dayRec[kwId] ?? {}), auto: { ...(dayRec[kwId]?.auto ?? {}) } };
        if (r.blog) {
          rec.blog = r.blog.rank;
          rec.auto!.blog = true;
        }
        if (r.web) {
          rec.web = r.web.rank;
          rec.auto!.web = true;
        }
        dayRec[kwId] = rec;
        return { ...book, [today]: dayRec };
      });
    },
    [today, setRanks],
  );

  /* ---------- 음성 브리핑 ---------- */
  const [speaking, setSpeaking] = useState(false);
  const [briefPrompt, setBriefPrompt] = useState(false);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.getVoices(); // iOS/Chrome 음성 목록 미리 로드
    const h = () => synth.getVoices();
    synth.addEventListener?.('voiceschanged', h);
    return () => {
      synth.removeEventListener?.('voiceschanged', h);
      synth.cancel();
    };
  }, []);

  const buildBriefing = () => {
    const h = new Date().getHours();
    const hello = h < 11 ? '좋은 아침입니다' : h < 18 ? '좋은 오후입니다' : '오늘 하루도 수고 많으셨습니다';
    const parts: string[] = [`대표님, ${hello}.`];
    const w = weatherMap[city] ?? null;
    if (w) {
      parts.push(
        `오늘 ${w.placeName} 기온은 ${Math.round(w.temp)}도, 습도는 ${w.humidity}퍼센트, ${weatherInfo(w.code).label}이며 강수 확률은 최고 ${w.popMax}퍼센트입니다.`,
      );
      parts.push(`청소 현장 컨디션은 ${CONDITION[weatherKind(w)].label.replace(/·/g, ', ').replace(/\//g, ' 및 ')} 단계입니다.`);
    } else {
      parts.push('날씨 정보는 아직 불러오는 중입니다.');
    }
    if (agent && agent.date === today) {
      if (agent.headline) parts.push(agent.headline);
      if (agent.blog) parts.push(`오늘 올릴 블로그 초안 '${agent.blog.title}'을 준비해 두었습니다.`);
      if (agent.threads) parts.push('스레드 글도 준비되어 있습니다.');
    }
    const st = salesStats;
    if (st.target > 0)
      parts.push(`이번 달 계약 매출은 ${fmtSales(st.revenue)}으로 목표의 ${st.pct}퍼센트입니다.${st.pct < 100 ? ` 남은 기간 하루 평균 ${fmtSales(st.needPerDay)}이 필요합니다.` : ' 목표를 달성하셨습니다. 축하드립니다.'}`);
    else if (st.revenue > 0) parts.push(`이번 달 계약 매출은 ${fmtSales(st.revenue)}입니다.`);
    if (st.todayJobs.length) parts.push(`오늘 예정된 작업은 ${st.todayJobs.length}건입니다.`);
    if (st.followUps.length) parts.push(`견적 후 연락이 필요한 고객이 ${st.followUps.length}명 있습니다.`);
    if (st.reviewAsks.length) parts.push(`후기 요청을 보낼 고객이 ${st.reviewAsks.length}명 있습니다.`);
    const up = rankMoves.filter((m) => m.diff > 0);
    if (up.length) parts.push(`네이버 순위가 오른 키워드는 ${up.slice(0, 2).map((m) => m.kw).join(', ')} 등 ${up.length}개입니다.`);
    const left = routines.filter((r) => routineUnits(r).some((u) => !checks[u]));
    if (left.length === 0) parts.push(`오늘 루틴은 모두 완료하셨습니다. ${streak}일 연속 달성 중입니다.`);
    else
      parts.push(
        `아직 완료하지 않은 오늘 루틴은 ${left.length}건이며, ${left
          .slice(0, 3)
          .map((r) => r.title.replace(/\//g, ', '))
          .join(', ')} 등이 남아 있습니다.`,
      );
    if (golden?.keywords.length) parts.push(`오늘 추천하는 황금키워드는 ${golden.keywords.map((k) => k.kw).join(', ')}입니다.`);
    const memoLeft = memos.filter((m) => !m.done).length;
    if (memoLeft) parts.push(`처리하지 않은 메모가 ${memoLeft}건 있습니다.`);
    parts.push('오늘도 활기찬 하루 되십시오!');
    return parts.join(' ');
  };

  const toggleSpeak = () => {
    setBriefPrompt(false);
    if (speaking) {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      return;
    }
    const ok = speakKo(buildBriefing(), () => setSpeaking(false));
    if (ok) setSpeaking(true);
    else toast('이 브라우저는 음성 브리핑을 지원하지 않습니다.');
  };

  /* ---------- 시리(단축어) URL 파라미터 처리 ---------- */
  const urlHandled = useRef(false);
  useEffect(() => {
    if (urlHandled.current) return;
    urlHandled.current = true;
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const memo = params.get('memo');
    if (!action && memo === null) return;

    const markDone = (key: string) =>
      setDay((prev) => {
        const base = prev.date === today ? prev.checks : {};
        return { date: today, checks: { ...base, [key]: true } };
      });

    const doneRoutine = (id: string, words: string[], label: string) => {
      const r = findRoutine(routines, id, words);
      if (!r) return toast(`'${label}' 루틴을 찾지 못했습니다. 루틴 탭에서 확인해 주세요.`);
      routineUnits(r).forEach(markDone);
      setTab('routine');
      toast(`✅ ${r.title} — 완료 처리했습니다.`);
    };

    if (action === 'briefing') {
      setTab('brief');
      setBriefPrompt(true);
    } else if (action === 'medicine') {
      const r = findRoutine(routines, 'r2', ['약']);
      if (!r) toast("'약 챙겨 먹기' 루틴을 찾지 못했습니다.");
      else if (!r.subs.length) {
        markDone(r.id);
        toast(`💊 ${r.title} — 완료 처리했습니다.`);
      } else {
        const want = params.get('slot');
        const h = new Date().getHours();
        const bySlot = want && r.subs.includes(want) ? want : r.subs[Math.min(r.subs.length - 1, h < 11 ? 0 : h < 16 ? 1 : 2)];
        const startIdx = r.subs.indexOf(bySlot);
        // 해당 시간대가 이미 체크되어 있으면 다음 미체크 항목을 체크
        const target = want ? bySlot : [...r.subs.slice(startIdx), ...r.subs.slice(0, startIdx)].find((s) => !checks[`${r.id}:${s}`]) ?? bySlot;
        markDone(`${r.id}:${target}`);
        toast(`💊 ${target} 약 복용을 체크했습니다.`);
      }
      setTab('routine');
    } else if (action === 'mirror') {
      doneRoutine('r1', ['거울'], '출근 거울샷');
    } else if (action === 'blog') {
      doneRoutine('r3', ['블로그'], '블로그 포스팅');
    }

    if (memo !== null) {
      const t = memo.trim();
      if (t) {
        const tagParam = params.get('tag');
        const tag = MEMO_TAGS.some((m) => m.key === tagParam) ? (tagParam as string) : '할 일';
        setMemos((l) => [{ id: uid(), text: t, tag, done: false, createdAt: Date.now() }, ...l]);
        setTab('memo');
        toast('📝 비서실 메모장에 저장했습니다.');
      } else toast('메모 내용이 비어 있습니다.');
    }

    // 새로고침 시 중복 실행 방지: 주소창 정리
    window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- 헤더 문구 ---------- */
  const [yy, mm, dd] = today.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(yy, mm - 1, dd).getDay()];
  const hour = new Date().getHours();
  const greeting =
    hour < 5
      ? '늦은 시간까지 고생 많으십니다'
      : hour < 11
        ? '좋은 아침입니다'
        : hour < 14
          ? '점심은 챙기셨습니까'
          : hour < 18
            ? '좋은 오후입니다'
            : '오늘 하루도 수고 많으셨습니다';
  const subLine =
    pct === 100
      ? `오늘 루틴 완벽 달성! 🔥 ${streak}일 연속입니다.`
      : `루틴 ${progress.done}/${progress.total} 완료 · 남은 ${progress.total - progress.done}건을 챙겨드리겠습니다.`;

  const remaining = progress.total - progress.done;

  return (
    <div className="min-h-screen bg-[#F2F3F5] font-sans text-[#191919] antialiased">
      <style>{`
        @keyframes aisec-fall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0.9; } }
        @keyframes aisec-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes aisec-pop { 0% { transform: scale(.6); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); } }
        html, body { background: #F2F3F5; font-feature-settings: 'tnum'; } .font-num { font-weight: 900 !important; letter-spacing: -0.03em; } html, body { overscroll-behavior-y: none; -webkit-tap-highlight-color: transparent; }
      `}</style>

      {/* 헤더 — 노란 바탕 + 오늘 업무 링 */}
      <header className={`relative overflow-hidden rounded-b-[32px] bg-cw px-4 ${tab === 'brief' ? 'pb-6' : 'pb-4'} pt-[calc(env(safe-area-inset-top)+12px)] text-[#191919]`}>
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#191919] px-2.5 py-1 text-[11px] font-extrabold tracking-tight text-cw">링크 미래전략실</span>
              <span className="text-[15px] font-extrabold tracking-tight">
                {mm}.{dd} ({weekday})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {weather && (
                <button onClick={() => setTab('brief')} className="flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1.5 text-[13px] font-extrabold">
                  {(() => {
                    const { Icon } = weatherInfo(weather.code);
                    return <Icon className="h-4 w-4" />;
                  })()}
                  {Math.round(weather.temp)}°
                </button>
              )}
              <button onClick={() => setShowSettings(true)} className="rounded-full bg-white/70 p-2 active:scale-95" aria-label="설정">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>

          {tab === 'brief' && (
          <>
          {/* 링 */}
          <div className="relative mx-auto mt-3 h-[212px] w-[212px]">
            <svg viewBox="0 0 212 212" className="h-full w-full -rotate-90">
              <circle cx="106" cy="106" r="92" fill="#FFFFFF" />
              <circle cx="106" cy="106" r="92" fill="none" stroke="#F2F3F5" strokeWidth="14" />
              <circle
                cx="106"
                cy="106"
                r="92"
                fill="none"
                stroke="#191919"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 92}
                strokeDashoffset={2 * Math.PI * 92 * (1 - Math.min(100, pct) / 100)}
                style={{ transition: 'stroke-dashoffset .8s ease' }}
              />
            </svg>
            <button onClick={() => setTab('routine')} className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[13px] font-bold text-[#6B6E76]">오늘 업무</span>
              <span className="font-num text-[56px] font-black leading-[60px] tracking-tighter tabular-nums">
                {progress.done}
                <span className="text-[26px] text-[#B0B3BA]">/{progress.total}</span>
              </span>
              <span className="mt-1 rounded-full bg-cw-soft px-2.5 py-0.5 text-[12px] font-extrabold">{pct === 100 ? '완벽 달성 🎉' : `${pct}% 완료`}</span>
            </button>
            {/* 떠 있는 버블 */}
            {remaining > 0 && (
              <button
                onClick={() => setTab('routine')}
                className="absolute -left-3 top-6 grid h-[58px] w-[58px] place-items-center rounded-full bg-white text-center shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:scale-95"
                style={{ animation: 'aisec-float 2.6s ease-in-out infinite' }}
              >
                <span className="text-[10px] font-bold leading-3 text-[#6B6E76]">
                  남은 일
                  <br />
                  <b className="text-[17px] leading-5 text-[#191919]">{remaining}</b>
                </span>
              </button>
            )}
            {streak > 0 && (
              <div
                className="absolute -right-2 top-10 grid h-[54px] w-[54px] place-items-center rounded-full bg-[#191919] text-center text-cw shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
                style={{ animation: 'aisec-float 3.1s ease-in-out infinite .4s' }}
              >
                <span className="text-[10px] font-bold leading-3">
                  🔥연속
                  <br />
                  <b className="text-[16px] leading-5">{streak}일</b>
                </span>
              </div>
            )}
            <button
              onClick={() => {
                setTab('brief');
                window.scrollTo({ top: 520, behavior: 'smooth' });
              }}
              className="absolute -left-4 bottom-6 grid h-[58px] w-[58px] place-items-center rounded-full bg-[#191919] text-center shadow-[0_4px_12px_rgba(0,0,0,0.18)] active:scale-95"
              style={{ animation: 'aisec-float 3.3s ease-in-out infinite 1.2s' }}
            >
              <span className="text-[10px] font-bold leading-3 text-white/70">
                비서실
                <br />
                <b className="text-[15px] leading-5 text-cw">
                  {secDone}/{secJobs.length}
                </b>
              </span>
            </button>
            {salesTodo > 0 && (
              <button
                onClick={() => setTab('sales')}
                className="absolute -right-4 bottom-6 grid h-[58px] w-[58px] place-items-center rounded-full bg-white text-center shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:scale-95"
                style={{ animation: 'aisec-float 2.8s ease-in-out infinite .8s' }}
              >
                <span className="text-[10px] font-bold leading-3 text-[#6B6E76]">
                  연락
                  <br />
                  <b className="text-[17px] leading-5 text-[#191919]">{salesTodo}</b>
                </span>
              </button>
            )}
          </div>

          {/* 3칸 숫자 */}
          <div className="mt-4 grid grid-cols-3 divide-x divide-[#191919]/10 rounded-[20px] bg-white/60 py-3 text-center">
            <button onClick={() => setTab('sales')}>
              <p className="text-[11px] font-bold text-[#6B6E76]">{mm}월 매출</p>
              <p className="mt-0.5 text-[16px] font-black tracking-tight">{fmtSales(salesStats.revenue)}</p>
            </button>
            <button onClick={() => setTab('sales')}>
              <p className="text-[11px] font-bold text-[#6B6E76]">오늘 작업</p>
              <p className="mt-0.5 text-[16px] font-black tracking-tight">{salesStats.todayJobs.length}건</p>
            </button>
            <button onClick={() => setTab('keyword')}>
              <p className="text-[11px] font-bold text-[#6B6E76]">순위 변동</p>
              <p className="mt-0.5 text-[16px] font-black tracking-tight">
                {rankMoves.filter((m) => m.diff > 0).length}
                <span className="text-[#14B86A]">▲</span> {rankMoves.filter((m) => m.diff < 0).length}
                <span className="text-[#F04438]">▼</span>
              </p>
            </button>
          </div>

          <p className="mt-3 px-1 text-[14px] font-bold leading-snug">
            대표님, {greeting}. <span className="font-medium text-[#45474D]">{subLine}</span>
          </p>

          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
            <button
              onClick={toggleSpeak}
              className={`flex items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-extrabold active:scale-[0.98] ${
                speaking ? 'bg-[#F04438] text-white' : 'bg-[#191919] text-white'
              }`}
            >
              {speaking ? <Square className="h-5 w-5" /> : <Volume2 className="h-5 w-5 text-cw" />}
              {speaking ? '브리핑 멈추기' : '음성 브리핑 듣기'}
            </button>
            <a
              href="https://claude.ai/artifact/4WTtTbpRQy1YjG4MWyNboC"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center rounded-full bg-white px-4 py-3.5 text-[14px] font-extrabold text-[#191919] active:scale-[0.98]"
            >
              비서실장 ›
            </a>
          </div>
          </>
          )}
        </div>
      </header>

      {/* 본문 */}
      <main className="mx-auto mt-3 max-w-md px-3 pb-[calc(env(safe-area-inset-bottom)+96px)]">
        {tab === 'brief' && (
          <BriefingTab
            city={city}
            setCity={(c) => {
              setCity(c);
              if (c === 'here') locate(false);
            }}
            hereName={here?.name ?? ''}
            locating={locating}
            weather={weather}
            loading={wLoading}
            error={wError}
            onRefresh={() => (city === 'here' ? locate(false) : loadWeather(city))}
            month={mm}
            progress={progress}
            streak={streak}
            golden={golden}
            goTab={setTab}
            top={
              <>
                <AgentCard
                  agent={agent}
                  status={agentStatus}
                  today={today}
                  toast={toast}
                  doneTodos={agentDone.date === agent?.date ? agentDone.idx : []}
                  onDoneTodo={(i) =>
                    setAgentDone((p) => {
                      const base = p.date === agent?.date ? p.idx : [];
                      return { date: agent?.date ?? '', idx: base.includes(i) ? base.filter((x) => x !== i) : [...base, i] };
                    })
                  }
                />
                <ExecBrief stats={salesStats} moves={rankMoves} goTab={setTab} />
                <BidsCard bids={bids} today={today} />
                <HubCard
                  hub={hub}
                  hasPin={!!hubPin}
                  status={hubStatus}
                  today={today}
                  deals={deals}
                  onRefresh={() => loadHub(hubPin)}
                  onOpenSettings={() => setShowSettings(true)}
                  onAddDeal={(c) => {
                    const d = new Date(c.t);
                    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    setDeals((l) => [
                      { id: uid(), createdAt: Date.now(), date, name: '', phone: prettyPhone(c.n), service: '전화 문의', channel: '전화', stage: 'inquiry', stageAt: today, note: `${c.k} 전화 (자동콜백)` },
                      ...l,
                    ]);
                    toast('영업 탭 문의 목록에 등록했습니다. 고객명·서비스만 채워주세요.');
                  }}
                />
              </>
            }
            bottom={
              <WeeklyReport
                today={today}
                history={history}
                progress={progress}
                deals={deals}
                ranks={ranks}
                keywords={keywords}
                settings={settings}
                toast={toast}
              />
            }
          />
        )}
        {tab === 'routine' && (
          <RoutineTab
            today={today}
            routines={routines}
            setRoutines={setRoutines}
            checks={checks}
            toggle={toggle}
            progress={progress}
            streak={streak}
            history={history}
          />
        )}
        {tab === 'sales' && (
          <SalesTab today={today} deals={deals} setDeals={setDeals} settings={settings} setSettings={setSettings} stats={salesStats} toast={toast} />
        )}
        {tab === 'keyword' && (
          <KeywordTab
            today={today}
            keywords={keywords}
            setKeywords={setKeywords}
            ranks={ranks}
            setRank={setRank}
            golden={golden}
            gLoading={gLoading}
            hasKey={!!settings.geminiKey.trim()}
            onGenerate={generateGolden}
            toast={toast}
            settings={settings}
            applyAutoRanks={applyAutoRanks}
            openSettings={() => setShowSettings(true)}
          />
        )}
        {tab === 'memo' && <MemoTab memos={memos} setMemos={setMemos} toast={toast} />}
        {tab === 'siri' && (
          <button onClick={() => setTab('brief')} className="mb-3 flex items-center gap-1.5 text-sm font-bold text-amber-200">
            <ArrowLeft className="h-4 w-4" /> 브리핑으로 돌아가기
          </button>
        )}
        {tab === 'siri' && (
          <SiriTab
            toast={toast}
            onSpeakTest={toggleSpeak}
            iconStyle={iconStyle}
            onIconStyle={(s) => setSettings((prev) => ({ ...prev, iconStyle: s }))}
          />
        )}
      </main>

      {/* 맨 위로 */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+84px)] right-4 z-40 flex h-12 w-12 flex-col items-center justify-center rounded-full bg-[#191919] text-cw shadow-[0_4px_14px_rgba(0,0,0,0.25)] active:scale-95"
          aria-label="맨 위로"
        >
          <ChevronUp className="h-5 w-5" />
          <span className="-mt-0.5 text-[9px] font-bold leading-none">맨 위</span>
        </button>
      )}

      {/* 하단 탭바 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 rounded-t-[22px] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_14px_rgba(0,0,0,0.06)]">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {TABS.map(({ key, label, Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setTab(key);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold transition ${
                  active ? 'text-[#191919]' : 'text-[#B0B3BA]'
                }`}
              >
                <span className={`grid h-9 w-12 place-items-center rounded-full transition ${active ? 'bg-cw' : ''}`}>
                  <Icon className="h-[22px] w-[22px]" />
                </span>
                {label}
                {key === 'routine' && remaining > 0 && (
                  <span className="absolute right-[22%] top-2 min-w-[18px] rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-[18px] text-white">
                    {remaining}
                  </span>
                )}
                {key === 'sales' && salesTodo > 0 && (
                  <span className="absolute right-[22%] top-2 min-w-[18px] rounded-full bg-cw px-1 text-[10px] font-bold leading-[18px] text-[#191919]">
                    {salesTodo}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onOpenCenter={() => {
            setShowSettings(false);
            setTab('siri');
            window.scrollTo({ top: 0 });
          }}
          onClose={() => setShowSettings(false)}
          onSave={(s) => {
            setSettings(s);
            setShowSettings(false);
            toast('설정을 저장했습니다.');
          }}
        />
      )}

      {briefPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6" onClick={() => setBriefPrompt(false)}>
          <div
            className="w-full max-w-sm rounded-[14px] border border-cw/40 bg-white p-6 text-center"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'aisec-pop 0.4s ease-out' }}
          >
            <p className="text-4xl">🎙️</p>
            <p className="mt-2 text-lg font-extrabold text-amber-200">시리 브리핑 호출</p>
            <p className="mt-1 text-sm text-slate-300">아래 버튼을 누르시면 비서실장이 오늘 브리핑을 읽어드립니다.</p>
            <button
              onClick={toggleSpeak}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#191919] py-4 text-lg font-extrabold text-white active:scale-95"
            >
              <Play className="h-6 w-6" /> 음성 브리핑 재생
            </button>
            <button onClick={() => setBriefPrompt(false)} className="mt-2 w-full py-2 text-sm text-slate-400">
              나중에
            </button>
          </div>
        </div>
      )}

      {celebrate && <Confetti />}

      {toastMsg && (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+84px)] z-[70] flex justify-center px-4">
          <div className="max-w-md rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-white shadow-xl">
            {toastMsg}
          </div>
        </div>
      )}
    </div>
  );
}
