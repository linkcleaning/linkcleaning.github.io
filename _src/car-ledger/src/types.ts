// 기존 차계부(v3)와 같은 데이터 모양 — localStorage 키도 그대로 써서 기록을 이어 씀
export type FuelType = 'gasoline' | 'diesel' | 'premium_gasoline' | 'lpg' | 'electric' | 'hybrid';

export interface Vehicle {
  id: string;
  name: string;
  brand: string;
  modelYear: number;
  licensePlate: string;
  fuelType: FuelType;
  currentMileage: number;
  tankCapacity: number;
  officialEfficiency: number;
  registeredDate: string;
  memo?: string;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  date: string;
  time: string;
  fuelType: FuelType;
  totalPrice: number;
  volume: number;
  unitPrice: number;
  stationName: string;
  stationLocation: string;
  stationLat?: number;
  stationLng?: number;
  odometer: number;
  tripDistance: number;
  calculatedEfficiency: number;
  isFullTank: boolean;
  memo?: string;
  createdAt: string;
}

export type MaintenanceCategory =
  | 'engine_oil' | 'aircon_filter' | 'tire_rotation' | 'tire_replace' | 'brake_pad' | 'brake_fluid'
  | 'transmission_oil' | 'battery' | 'spark_plug' | 'wiper' | 'coolant' | 'wash_detail' | 'inspection' | 'other';

export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  date: string;
  category: MaintenanceCategory;
  itemName: string;
  cost: number;
  shopName: string;
  odometer: number;
  memo?: string;
  receiptImageUrl?: string;
  nextDueOdometer?: number;
  nextDueDate?: string;
  createdAt: string;
}

export type OtherExpenseCategory = 'wash' | 'parking' | 'toll' | 'insurance' | 'tax' | 'supplies' | 'other';

export interface OtherExpenseLog {
  id: string;
  vehicleId: string;
  date: string;
  category: OtherExpenseCategory;
  cost: number;
  memo?: string;
  createdAt: string;
}

export const FUEL_LABEL: Record<FuelType, string> = {
  gasoline: '휘발유',
  diesel: '경유',
  premium_gasoline: '고급휘발유',
  lpg: 'LPG',
  electric: '전기',
  hybrid: '하이브리드',
};

export const MAINT_LABEL: Record<MaintenanceCategory, string> = {
  engine_oil: '엔진오일',
  aircon_filter: '에어컨 필터',
  tire_rotation: '타이어 위치교환',
  tire_replace: '타이어 교체',
  brake_pad: '브레이크 패드',
  brake_fluid: '브레이크 오일',
  transmission_oil: '미션 오일',
  battery: '배터리',
  spark_plug: '점화플러그',
  wiper: '와이퍼',
  coolant: '냉각수',
  wash_detail: '세차·광택',
  inspection: '정기검사',
  other: '기타 수리',
};

export const OTHER_LABEL: Record<OtherExpenseCategory, string> = {
  wash: '세차',
  parking: '주차',
  toll: '통행료',
  insurance: '보험',
  tax: '자동차세',
  supplies: '용품',
  other: '기타',
};

/** 소모품 권장 주기 (기존 앱과 같은 기준) */
export const CONSUMABLES: { category: MaintenanceCategory; name: string; km: number; months: number }[] = [
  { category: 'engine_oil', name: '엔진오일', km: 10000, months: 12 },
  { category: 'aircon_filter', name: '에어컨 필터', km: 10000, months: 6 },
  { category: 'tire_rotation', name: '타이어 위치교환', km: 15000, months: 12 },
  { category: 'wiper', name: '와이퍼', km: 15000, months: 6 },
  { category: 'brake_pad', name: '브레이크 패드', km: 35000, months: 24 },
  { category: 'brake_fluid', name: '브레이크 오일', km: 40000, months: 24 },
  { category: 'tire_replace', name: '타이어 교체', km: 50000, months: 48 },
  { category: 'battery', name: '배터리', km: 60000, months: 36 },
  { category: 'transmission_oil', name: '미션 오일', km: 80000, months: 48 },
  { category: 'spark_plug', name: '점화플러그', km: 80000, months: 60 },
  { category: 'coolant', name: '냉각수', km: 100000, months: 60 },
];

export type Entry =
  | { kind: 'fuel'; date: string; cost: number; log: FuelLog }
  | { kind: 'maint'; date: string; cost: number; log: MaintenanceLog }
  | { kind: 'other'; date: string; cost: number; log: OtherExpenseLog };
