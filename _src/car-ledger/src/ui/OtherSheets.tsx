import { useRef, useState } from 'react';
import type { Ledger } from '../store';
import { uid } from '../store';
import { FUEL_LABEL, MAINT_LABEL, OTHER_LABEL, type FuelType, type MaintenanceCategory, type MaintenanceLog, type OtherExpenseCategory, type OtherExpenseLog, type Vehicle } from '../types';
import { nextDueFor, todayStr } from '../calc';
import { NumField, Sheet, TextField, TwoTap } from './common';
import { ICamera, ITrash } from './icons';

const MAINT_ORDER: MaintenanceCategory[] = [
  'engine_oil', 'aircon_filter', 'tire_rotation', 'tire_replace', 'brake_pad', 'wiper', 'battery', 'inspection',
  'brake_fluid', 'transmission_oil', 'spark_plug', 'coolant', 'wash_detail', 'other',
];

async function compressImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, 1100 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.7);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function MaintSheet({ ledger, vehicle, editing, onClose, onSaved }: { ledger: Ledger; vehicle: Vehicle; editing?: MaintenanceLog; onClose: () => void; onSaved: (m: string) => void }) {
  const [cat, setCat] = useState<MaintenanceCategory>(editing?.category ?? 'engine_oil');
  const [item, setItem] = useState(editing?.itemName ?? '');
  const [cost, setCost] = useState<number | ''>(editing?.cost ?? '');
  const [shop, setShop] = useState(editing?.shopName ?? '');
  const [date, setDate] = useState(editing?.date ?? todayStr());
  const [odo, setOdo] = useState<number | ''>(editing?.odometer ?? (vehicle.currentMileage || ''));
  const [memo, setMemo] = useState(editing?.memo ?? '');
  const [photo, setPhoto] = useState(editing?.receiptImageUrl ?? '');
  const fileRef = useRef<HTMLInputElement>(null);
  const shops = [...new Set(ledger.maint.filter((m) => m.vehicleId === vehicle.id && m.shopName).map((m) => m.shopName))].slice(0, 4);

  const save = () => {
    const o = Number(odo) || 0;
    const log: MaintenanceLog = {
      id: editing?.id ?? uid('ml'),
      vehicleId: vehicle.id,
      date,
      category: cat,
      itemName: item.trim() || MAINT_LABEL[cat],
      cost: Number(cost) || 0,
      shopName: shop.trim(),
      odometer: o,
      memo: memo.trim() || undefined,
      receiptImageUrl: photo || undefined,
      ...nextDueFor(cat, date, o),
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    };
    ledger.saveMaint(log);
    if (o > (vehicle.currentMileage || 0)) ledger.saveVehicle({ ...vehicle, currentMileage: o });
    onSaved(editing ? '정비 기록을 고쳤어요' : `${log.itemName} 기록했어요`);
  };

  return (
    <Sheet
      title={editing ? '정비 기록 고치기' : '정비 기록'}
      sub={vehicle.name}
      onClose={onClose}
      foot={
        <>
          {editing && (
            <TwoTap label="삭제" armedLabel="한 번 더" icon={false} className="btn danger" onConfirm={() => { ledger.deleteMaint(editing.id); onSaved('정비 기록을 지웠어요'); }} />
          )}
          <button className="btn primary" onClick={save} disabled={!(Number(cost) >= 0 && cost !== '')}>
            {editing ? '고친 내용 저장' : '저장'}
          </button>
        </>
      }
    >
      <div className="catgrid">
        {MAINT_ORDER.map((c) => (
          <button key={c} type="button" className={`cat${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>
            {MAINT_LABEL[c]}
          </button>
        ))}
      </div>
      <NumField big label="정비 비용" unit="원" value={cost} onChange={setCost} placeholder="0" />
      <TextField label="항목 이름 (비워 두면 위 항목 이름)" value={item} onChange={setItem} placeholder={MAINT_LABEL[cat]} />
      <TextField label="정비소" value={shop} onChange={setShop} placeholder="예: 블루핸즈 노형점" />
      {shops.length > 0 && !shop && (
        <div className="chips">
          {shops.map((s) => (
            <button key={s} className="chip" onClick={() => setShop(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="pair">
        <TextField label="날짜" type="date" value={date} onChange={setDate} />
        <NumField label="그때 누적거리" unit="km" value={odo} onChange={setOdo} />
      </div>
      <TextField label="메모" value={memo} onChange={setMemo} placeholder="예: 다음엔 합성유로" />
      <div className="photo">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPhoto(await compressImage(f)); e.target.value = ''; }} />
        <button type="button" className="btn ghost small" onClick={() => fileRef.current?.click()}>
          <ICamera size={16} /> {photo ? '영수증 바꾸기' : '영수증 사진'}
        </button>
        {photo && (
          <>
            <img src={photo} alt="영수증" />
            <button type="button" className="x" onClick={() => setPhoto('')} aria-label="사진 빼기">
              <ITrash size={16} />
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}

const OTHER_ORDER: OtherExpenseCategory[] = ['wash', 'parking', 'toll', 'insurance', 'tax', 'supplies', 'other'];

export function OtherSheet({ ledger, vehicle, editing, onClose, onSaved }: { ledger: Ledger; vehicle: Vehicle; editing?: OtherExpenseLog; onClose: () => void; onSaved: (m: string) => void }) {
  const [cat, setCat] = useState<OtherExpenseCategory>(editing?.category ?? 'wash');
  const [cost, setCost] = useState<number | ''>(editing?.cost ?? '');
  const [date, setDate] = useState(editing?.date ?? todayStr());
  const [memo, setMemo] = useState(editing?.memo ?? '');
  const save = () => {
    ledger.saveOther({
      id: editing?.id ?? uid('oe'),
      vehicleId: vehicle.id,
      date,
      category: cat,
      cost: Number(cost) || 0,
      memo: memo.trim() || undefined,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    });
    onSaved(editing ? '기록을 고쳤어요' : `${OTHER_LABEL[cat]} 기록했어요`);
  };
  return (
    <Sheet
      title={editing ? '기타 지출 고치기' : '기타 지출'}
      sub={vehicle.name}
      onClose={onClose}
      foot={
        <>
          {editing && <TwoTap label="삭제" armedLabel="한 번 더" icon={false} className="btn danger" onConfirm={() => { ledger.deleteOther(editing.id); onSaved('기록을 지웠어요'); }} />}
          <button className="btn primary" onClick={save} disabled={!Number(cost)}>
            {editing ? '고친 내용 저장' : '저장'}
          </button>
        </>
      }
    >
      <div className="catgrid">
        {OTHER_ORDER.map((c) => (
          <button key={c} type="button" className={`cat${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>
            {OTHER_LABEL[c]}
          </button>
        ))}
      </div>
      <NumField big label="금액" unit="원" value={cost} onChange={setCost} placeholder="0" />
      <TextField label="날짜" type="date" value={date} onChange={setDate} />
      <TextField label="메모" value={memo} onChange={setMemo} placeholder="예: 공항 주차장" />
    </Sheet>
  );
}

const FUELS: FuelType[] = ['gasoline', 'diesel', 'lpg', 'hybrid', 'electric', 'premium_gasoline'];

export function VehicleSheet({ ledger, editing, onClose, onSaved }: { ledger: Ledger; editing?: Vehicle; onClose: () => void; onSaved: (m: string) => void }) {
  const [name, setName] = useState(editing?.name ?? '');
  const [plate, setPlate] = useState(editing?.licensePlate ?? '');
  const [fuelType, setFuelType] = useState<FuelType>(editing?.fuelType ?? 'gasoline');
  const [mileage, setMileage] = useState<number | ''>(editing?.currentMileage ?? '');
  const [eff, setEff] = useState<number | ''>(editing?.officialEfficiency || '');
  const [tank, setTank] = useState<number | ''>(editing?.tankCapacity || '');
  const save = () => {
    const v: Vehicle = {
      id: editing?.id ?? uid('veh'),
      name: name.trim(),
      brand: editing?.brand ?? '',
      modelYear: editing?.modelYear ?? new Date().getFullYear(),
      licensePlate: plate.trim(),
      fuelType: editing?.fuelType ?? fuelType,
      currentMileage: Number(mileage) || 0,
      tankCapacity: Number(tank) || 0,
      officialEfficiency: Number(eff) || 0,
      registeredDate: editing?.registeredDate ?? todayStr(),
      memo: editing?.memo,
    };
    ledger.saveVehicle(v);
    ledger.setSelectedId(v.id);
    onSaved(editing ? '차량 정보를 고쳤어요' : `${v.name} 등록했어요`);
  };
  const removeVehicle = () => {
    if (!editing) return;
    ledger.deleteVehicle(editing.id);
    ledger.fuel.filter((l) => l.vehicleId === editing.id).forEach((l) => ledger.deleteFuel(l.id));
    ledger.maint.filter((l) => l.vehicleId === editing.id).forEach((l) => ledger.deleteMaint(l.id));
    ledger.other.filter((l) => l.vehicleId === editing.id).forEach((l) => ledger.deleteOther(l.id));
    ledger.setSelectedId('');
    onSaved('차량과 기록을 지웠어요');
  };
  return (
    <Sheet
      title={editing ? '차량 정보' : '내 차 등록'}
      sub={editing ? '유종은 등록 뒤 바꿀 수 없어요' : '유종은 등록 뒤 바꿀 수 없어요. 한 번만 골라 주세요.'}
      onClose={onClose}
      foot={
        <>
          {editing && <TwoTap label="차량 삭제" armedLabel="기록까지 지워져요" icon={false} className="btn danger" onConfirm={removeVehicle} />}
          <button className="btn primary" disabled={!name.trim()} onClick={save}>
            {editing ? '저장' : '등록'}
          </button>
        </>
      }
    >
      <TextField label="차 이름" value={name} onChange={setName} placeholder="예: 아반떼, 회사 포터" />
      <TextField label="차량 번호 (선택)" value={plate} onChange={setPlate} placeholder="예: 12가 3456" />
      <div className="field">
        <span>유종 {editing && '· 고정'}</span>
        <div className="chips" style={{ marginTop: 6 }}>
          {FUELS.map((f) => (
            <button key={f} type="button" disabled={!!editing} className={`chip${(editing?.fuelType ?? fuelType) === f ? ' on' : ''}`} style={{ background: (editing?.fuelType ?? fuelType) === f ? undefined : 'var(--surface-100)', opacity: editing && editing.fuelType !== f ? 0.4 : 1 }} onClick={() => setFuelType(f)}>
              {FUEL_LABEL[f]}
            </button>
          ))}
        </div>
      </div>
      <NumField label="지금 누적 주행거리 (계기판 ODO)" unit="km" value={mileage} onChange={setMileage} placeholder="예: 52340" />
      <p className="hint">처음 한 번만 넣으면, 다음부터는 주유할 때 넣는 트립 거리로 자동으로 늘어나요.</p>
      <div className="pair">
        <NumField decimal label="공인 연비 (선택)" unit={fuelType === 'electric' ? 'km/kWh' : 'km/L'} value={eff} onChange={setEff} />
        <NumField label="연료탱크 (선택)" unit={fuelType === 'electric' ? 'kWh' : 'L'} value={tank} onChange={setTank} />
      </div>
    </Sheet>
  );
}
