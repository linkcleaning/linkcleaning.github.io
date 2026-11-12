import { KEYS } from './store';
import { FUEL_LABEL, MAINT_LABEL, OTHER_LABEL, type FuelLog, type MaintenanceLog, type OtherExpenseLog, type Vehicle } from './types';
import { todayStr } from './calc';

export interface Backup {
  app: 'smart-car-ledger';
  version: number;
  exportedAt: string;
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  maintenanceLogs: MaintenanceLog[];
  otherExpenseLogs: OtherExpenseLog[];
}

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export function buildBackup(): Backup {
  const get = (k: string) => {
    try {
      return JSON.parse(localStorage.getItem(k) ?? '[]');
    } catch {
      return [];
    }
  };
  return {
    app: 'smart-car-ledger', version: 4, exportedAt: new Date().toISOString(),
    vehicles: arr(get(KEYS.vehicles)), fuelLogs: arr(get(KEYS.fuel)),
    maintenanceLogs: arr(get(KEYS.maint)), otherExpenseLogs: arr(get(KEYS.other)),
  };
}

/** 예전 버전 백업, 다른 모양의 파일도 최대한 읽음 */
export function parseBackup(text: string): Backup {
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(text);
  } catch {
    throw new Error('백업 파일이 아니에요. 차계부에서 보낸 .json 파일을 골라 주세요.');
  }
  const src = (j.data && typeof j.data === 'object' ? j.data : j) as Record<string, unknown>;
  const pick = (...names: string[]) => {
    for (const n of names) {
      const v = src[n];
      if (Array.isArray(v)) return v;
      if (typeof v === 'string') {
        try {
          const p = JSON.parse(v);
          if (Array.isArray(p)) return p;
        } catch {
          /* 무시 */
        }
      }
    }
    return [];
  };
  const b: Backup = {
    app: 'smart-car-ledger', version: 4, exportedAt: String(j.exportedAt ?? ''),
    vehicles: pick('vehicles', KEYS.vehicles),
    fuelLogs: pick('fuelLogs', 'fuel', KEYS.fuel),
    maintenanceLogs: pick('maintenanceLogs', 'maintenance', KEYS.maint),
    otherExpenseLogs: pick('otherExpenseLogs', 'other', KEYS.other),
  };
  if (!b.vehicles.length && !b.fuelLogs.length && !b.maintenanceLogs.length) throw new Error('파일 안에 차계부 기록이 없어요.');
  return b;
}

export function applyBackup(b: Backup, mode: 'replace' | 'merge') {
  const cur = buildBackup();
  const merge = <T extends { id: string }>(a: T[], n: T[]) => {
    const m = new Map(a.map((x) => [x.id, x]));
    n.forEach((x) => m.set(x.id, x));
    return [...m.values()];
  };
  const pick = <T extends { id: string }>(a: T[], n: T[]) => (mode === 'replace' ? n : merge(a, n));
  localStorage.setItem(KEYS.vehicles, JSON.stringify(pick(cur.vehicles, b.vehicles)));
  localStorage.setItem(KEYS.fuel, JSON.stringify(pick(cur.fuelLogs, b.fuelLogs)));
  localStorage.setItem(KEYS.maint, JSON.stringify(pick(cur.maintenanceLogs, b.maintenanceLogs)));
  localStorage.setItem(KEYS.other, JSON.stringify(pick(cur.otherExpenseLogs, b.otherExpenseLogs)));
  if (mode === 'replace') localStorage.removeItem(KEYS.selected);
}

export function buildCsv(b: Backup) {
  const vName = new Map(b.vehicles.map((v) => [v.id, v.name]));
  const rows: (string | number)[][] = [['날짜', '차량', '구분', '항목', '금액(원)', '주유량', '단가', '트립(km)', '연비', '장소', '메모']];
  const all: { d: string; r: (string | number)[] }[] = [];
  b.fuelLogs.forEach((l) => all.push({ d: l.date, r: [l.date, vName.get(l.vehicleId) ?? '', '주유', FUEL_LABEL[l.fuelType] ?? '', l.totalPrice, l.volume, l.unitPrice, l.tripDistance, l.calculatedEfficiency || '', l.stationName, l.memo ?? ''] }));
  b.maintenanceLogs.forEach((l) => all.push({ d: l.date, r: [l.date, vName.get(l.vehicleId) ?? '', '정비', l.itemName || MAINT_LABEL[l.category], l.cost, '', '', '', '', l.shopName, l.memo ?? ''] }));
  b.otherExpenseLogs.forEach((l) => all.push({ d: l.date, r: [l.date, vName.get(l.vehicleId) ?? '', '기타', OTHER_LABEL[l.category], l.cost, '', '', '', '', '', l.memo ?? ''] }));
  all.sort((a, z) => a.d.localeCompare(z.d)).forEach((x) => rows.push(x.r));
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
}

export async function shareOrDownload(name: string, text: string, type: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([text], name, { type });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = navigator as any;
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: name });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'downloaded';
}

export const backupName = () => `차계부-백업-${todayStr()}.json`;
export const csvName = () => `차계부-지출내역-${todayStr()}.csv`;
