import { useCallback, useEffect, useState } from 'react';
import type { FuelLog, MaintenanceLog, OtherExpenseLog, Vehicle } from './types';

export const KEYS = {
  vehicles: 'smart_car_vehicles',
  selected: 'smart_car_selected_vehicle_id',
  fuel: 'smart_car_fuel_logs',
  maint: 'smart_car_maintenance_logs',
  other: 'smart_car_other_expense_logs',
} as const;

function readArr<T>(key: string): T[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, typeof v === 'string' ? v : JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}

function readVehicles(): Vehicle[] {
  const list = readArr<Vehicle>(KEYS.vehicles);
  if (list.length) return list;
  try {
    const single = JSON.parse(localStorage.getItem('smart_car_vehicle') ?? 'null');
    if (single?.name) return [single];
  } catch {
    /* 없음 */
  }
  return [];
}

/** 예전 앱이 처음 실행 때 넣던 예시 기록 (아반떼·쏘렌토 예시) */
export const isSampleId = (id: string) => /^(veh|fl|ml|oe|odo)-\d{2}$/.test(id);

export const uid = (p: string) => `${p}-${Date.now()}${Math.random().toString(36).slice(2, 6)}`;

export function useLedger() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(readVehicles);
  const [selectedId, setSelectedId] = useState<string>(() => localStorage.getItem(KEYS.selected) ?? '');
  const [fuel, setFuel] = useState<FuelLog[]>(() => readArr(KEYS.fuel));
  const [maint, setMaint] = useState<MaintenanceLog[]>(() => readArr(KEYS.maint));
  const [other, setOther] = useState<OtherExpenseLog[]>(() => readArr(KEYS.other));
  const [saveError, setSaveError] = useState(false);

  useEffect(() => void write(KEYS.vehicles, vehicles), [vehicles]);
  useEffect(() => void write(KEYS.selected, selectedId), [selectedId]);
  useEffect(() => void write(KEYS.fuel, fuel), [fuel]);
  useEffect(() => {
    if (!write(KEYS.maint, maint)) {
      // 영수증 사진 때문에 저장 공간이 넘치면 사진만 빼고 저장
      setSaveError(true);
      write(KEYS.maint, maint.map(({ receiptImageUrl: _r, ...m }) => m));
    }
  }, [maint]);
  useEffect(() => void write(KEYS.other, other), [other]);

  const vehicle = vehicles.find((v) => v.id === selectedId) ?? vehicles[0];

  const upsert = useCallback(<T extends { id: string }>(set: React.Dispatch<React.SetStateAction<T[]>>) => (item: T) =>
    set((list) => {
      const i = list.findIndex((x) => x.id === item.id);
      if (i < 0) return [...list, item];
      const next = list.slice();
      next[i] = item;
      return next;
    }), []);
  const remove = useCallback(<T extends { id: string }>(set: React.Dispatch<React.SetStateAction<T[]>>) => (id: string) =>
    set((list) => list.filter((x) => x.id !== id)), []);

  const removeSamples = () => {
    setVehicles((l) => l.filter((x) => !isSampleId(x.id)));
    setFuel((l) => l.filter((x) => !isSampleId(x.id) && !isSampleId(x.vehicleId)));
    setMaint((l) => l.filter((x) => !isSampleId(x.id) && !isSampleId(x.vehicleId)));
    setOther((l) => l.filter((x) => !isSampleId(x.id) && !isSampleId(x.vehicleId)));
    setSelectedId('');
  };

  const sampleCount =
    vehicles.filter((x) => isSampleId(x.id)).length +
    fuel.filter((x) => isSampleId(x.id)).length +
    maint.filter((x) => isSampleId(x.id)).length +
    other.filter((x) => isSampleId(x.id)).length;

  return {
    vehicles, vehicle, selectedId, setSelectedId,
    fuel, maint, other,
    saveVehicle: upsert(setVehicles), deleteVehicle: remove(setVehicles),
    saveFuel: upsert(setFuel), deleteFuel: remove(setFuel),
    saveMaint: upsert(setMaint), deleteMaint: remove(setMaint),
    saveOther: upsert(setOther), deleteOther: remove(setOther),
    setFuelAll: setFuel,
    removeSamples, sampleCount, saveError, clearSaveError: () => setSaveError(false),
  };
}
export type Ledger = ReturnType<typeof useLedger>;
