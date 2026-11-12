import { CONSUMABLES, type Entry, type FuelLog, type MaintenanceLog, type OtherExpenseLog, type Vehicle } from './types';

export const pad = (n: number) => String(n).padStart(2, '0');
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const ymOf = (date: string) => date.slice(0, 7);
export const thisYm = () => ymOf(todayStr());
export const addMonths = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
export const ymLabel = (ym: string, withYear = true) => {
  const [y, m] = ym.split('-').map(Number);
  return withYear ? `${y}년 ${m}월` : `${m}월`;
};
export const fmt = (n: number, digits = 0) =>
  Number.isFinite(n) ? n.toLocaleString('ko-KR', { maximumFractionDigits: digits, minimumFractionDigits: digits }) : '-';
export const wonShort = (n: number) => (n >= 100000 ? `${fmt(n / 10000, n >= 1000000 ? 0 : 1)}만` : fmt(n));
const DAY = 86400000;
export const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY);
export const weekday = (date: string) => '일월화수목금토'[new Date(date + 'T00:00:00').getDay()];

export const unitOf = (v?: Vehicle) => (v?.fuelType === 'electric' ? 'kWh' : 'L');
export const effUnit = (v?: Vehicle) => (v?.fuelType === 'electric' ? 'km/kWh' : 'km/L');

const byTime = (a: FuelLog, b: FuelLog) =>
  a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '') || (a.createdAt ?? '').localeCompare(b.createdAt ?? '');

/**
 * 가득 주유 기준 실연비 (full-to-full)
 * 가득 주유 사이에 넣은 기름 양과 달린 트립 거리를 모두 합쳐 나눔.
 * 중간에 반만 넣은 주유가 있어도 다음 가득 주유에서 합쳐서 계산됨.
 */
export function fuelSegments(logs: FuelLog[]) {
  const sorted = logs.slice().sort(byTime);
  const eff = new Map<string, number>();
  const segments: { endId: string; date: string; dist: number; vol: number; eff: number }[] = [];
  let dist = 0;
  let vol = 0;
  for (const l of sorted) {
    dist += l.tripDistance || 0;
    vol += l.volume || 0;
    if (l.isFullTank) {
      const e = dist > 0 && vol > 0 ? dist / vol : 0;
      eff.set(l.id, Math.round(e * 10) / 10);
      if (e > 0) segments.push({ endId: l.id, date: l.date, dist, vol, eff: e });
      dist = 0;
      vol = 0;
    } else eff.set(l.id, 0);
  }
  return { sorted, eff, segments };
}

/** 저장할 때 모든 주유 기록의 연비를 다시 계산 (수정·삭제 후에도 맞게) */
export function withRecalculated(logs: FuelLog[]): FuelLog[] {
  const { eff } = fuelSegments(logs);
  return logs.map((l) => ({ ...l, calculatedEfficiency: eff.get(l.id) ?? 0 }));
}

export function entriesOf(vehicleId: string, fuel: FuelLog[], maint: MaintenanceLog[], other: OtherExpenseLog[]): Entry[] {
  const out: Entry[] = [
    ...fuel.filter((l) => l.vehicleId === vehicleId).map((log) => ({ kind: 'fuel' as const, date: log.date, cost: log.totalPrice || 0, log })),
    ...maint.filter((l) => l.vehicleId === vehicleId).map((log) => ({ kind: 'maint' as const, date: log.date, cost: log.cost || 0, log })),
    ...other.filter((l) => l.vehicleId === vehicleId).map((log) => ({ kind: 'other' as const, date: log.date, cost: log.cost || 0, log })),
  ];
  return out.sort((a, b) => b.date.localeCompare(a.date) || (b.log.createdAt ?? '').localeCompare(a.log.createdAt ?? ''));
}

export interface MonthSum {
  ym: string;
  fuelCost: number;
  maintCost: number;
  otherCost: number;
  total: number;
  fuelCount: number;
  maintCount: number;
  otherCount: number;
  volume: number;
  distance: number;
  avgEff: number; // 이 달에 끝난 가득 주유 구간 평균
  avgUnitPrice: number;
  perKm: number;
}

export function monthSum(ym: string, entries: Entry[], segments: ReturnType<typeof fuelSegments>['segments']): MonthSum {
  const s: MonthSum = { ym, fuelCost: 0, maintCost: 0, otherCost: 0, total: 0, fuelCount: 0, maintCount: 0, otherCount: 0, volume: 0, distance: 0, avgEff: 0, avgUnitPrice: 0, perKm: 0 };
  for (const e of entries) {
    if (ymOf(e.date) !== ym) continue;
    s.total += e.cost;
    if (e.kind === 'fuel') {
      s.fuelCost += e.cost;
      s.fuelCount++;
      s.volume += e.log.volume || 0;
      s.distance += e.log.tripDistance || 0;
    } else if (e.kind === 'maint') {
      s.maintCost += e.cost;
      s.maintCount++;
    } else {
      s.otherCost += e.cost;
      s.otherCount++;
    }
  }
  const seg = segments.filter((x) => ymOf(x.date) === ym);
  const d = seg.reduce((a, x) => a + x.dist, 0);
  const v = seg.reduce((a, x) => a + x.vol, 0);
  s.avgEff = v > 0 ? d / v : 0;
  s.avgUnitPrice = s.volume > 0 ? s.fuelCost / s.volume : 0;
  s.perKm = s.distance > 0 ? s.total / s.distance : 0;
  return s;
}

export type ConsumableState = {
  category: (typeof CONSUMABLES)[number]['category'];
  name: string;
  hasRecord: boolean;
  lastDate?: string;
  remainingKm: number;
  remainingDays: number;
  life: number; // 0~1 (1 = 새것)
  status: 'ok' | 'soon' | 'over';
};

export function consumables(v: Vehicle | undefined, maint: MaintenanceLog[]): ConsumableState[] {
  if (!v) return [];
  const today = todayStr();
  return CONSUMABLES.map((c) => {
    const last = maint
      .filter((m) => m.vehicleId === v.id && m.category === c.category)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!last) {
      return { category: c.category, name: c.name, hasRecord: false, remainingKm: 0, remainingDays: 0, life: 1, status: 'ok' as const };
    }
    const nextKm = (last.odometer || 0) + c.km;
    const d = new Date(last.date + 'T00:00:00');
    d.setMonth(d.getMonth() + c.months);
    const nextDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const remainingKm = nextKm - (v.currentMileage || 0);
    const remainingDays = daysBetween(today, nextDate);
    const life = Math.max(0, Math.min(1, Math.min(remainingKm / c.km, remainingDays / (c.months * 30.4))));
    const status = remainingKm <= 0 || remainingDays <= 0 ? 'over' : life < 0.15 || remainingKm < 1500 || remainingDays < 30 ? 'soon' : 'ok';
    return { category: c.category, name: c.name, hasRecord: true, lastDate: last.date, remainingKm, remainingDays, life, status };
  });
}

export function nextDueFor(category: string, date: string, odometer: number) {
  const c = CONSUMABLES.find((x) => x.category === category);
  if (!c) return {};
  const d = new Date(date + 'T00:00:00');
  d.setMonth(d.getMonth() + c.months);
  return { nextDueOdometer: odometer + c.km, nextDueDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` };
}

export const fmtNow = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${d.getMonth() + 1}/${d.getDate()}`;
};
