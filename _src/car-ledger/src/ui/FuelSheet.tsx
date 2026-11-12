import { useEffect, useMemo, useRef, useState } from 'react';
import type { Ledger } from '../store';
import { uid } from '../store';
import { FUEL_LABEL, type FuelLog, type Vehicle } from '../types';
import { effUnit, fmt, fmtNow, nowTime, todayStr, unitOf, withRecalculated } from '../calc';
import { NumField, Sheet, TextField, Toggle, TwoTap } from './common';
import { IPin, IRight, ITrash } from './icons';
import { StationPicker, type Picked } from './StationPicker';
import { findStations, fmtDist, geoGranted, getPosition, opinetSupports } from '../stations';

export function FuelSheet({ ledger, vehicle, editing, onClose, onSaved }: { ledger: Ledger; vehicle: Vehicle; editing?: FuelLog; onClose: () => void; onSaved: (msg: string) => void }) {
  const unit = unitOf(vehicle);
  const ev = vehicle.fuelType === 'electric';
  const place = ev ? '충전소' : vehicle.fuelType === 'lpg' ? 'LPG 충전소' : '주유소';
  const [total, setTotal] = useState<number | ''>(editing?.totalPrice ?? '');
  const [volume, setVolume] = useState<number | ''>(editing?.volume ?? '');
  const [price, setPrice] = useState<number | ''>(editing?.unitPrice ?? '');
  const [auto, setAuto] = useState<'volume' | 'price' | null>(null);
  const [trip, setTrip] = useState<number | ''>(editing?.tripDistance ?? '');
  const [full, setFull] = useState(editing?.isFullTank ?? true);
  const [station, setStation] = useState<Picked | null>(
    editing?.stationName ? { name: editing.stationName, address: editing.stationLocation, lat: editing.stationLat, lng: editing.stationLng } : null,
  );
  const [priceFromOpinet, setPriceFromOpinet] = useState(false);
  const [date, setDate] = useState(editing?.date ?? todayStr());
  const [time, setTime] = useState(editing?.time ?? nowTime());
  const [memo, setMemo] = useState(editing?.memo ?? '');
  const [showMore, setShowMore] = useState(Boolean(editing && (editing.memo || editing.date !== todayStr())));
  const [picker, setPicker] = useState(false);
  const [autoNote, setAutoNote] = useState('');
  const touched = useRef(false);

  // 금액·주유량·단가 중 두 개를 넣으면 나머지 하나 자동
  const onTotal = (v: number | '') => {
    setTotal(v);
    if (v === '') return;
    if (price && auto !== 'price') {
      setVolume(Math.round((v / price) * 100) / 100);
      setAuto('volume');
    } else if (volume) {
      setPrice(Math.round(v / volume));
      setAuto('price');
    }
  };
  const onVolume = (v: number | '') => {
    setVolume(v);
    setAuto(null);
    if (v && total) {
      setPrice(Math.round(total / v));
      setAuto('price');
    }
  };
  const onPrice = (v: number | '', fromOpinet = false) => {
    setPrice(v);
    setPriceFromOpinet(fromOpinet);
    if (auto === 'price') setAuto(null);
    if (v && total) {
      setVolume(Math.round((total / v) * 100) / 100);
      setAuto('volume');
    }
  };

  const applyStation = (s: Picked) => {
    setStation(s);
    if (s.price && (price === '' || priceFromOpinet)) onPrice(s.price, true);
  };

  // 새 기록 + 위치 권한이 이미 있으면 300m 안 주유소를 바로 고름
  useEffect(() => {
    if (editing) return;
    let alive = true;
    (async () => {
      if (!(await geoGranted())) return;
      try {
        const pos = await getPosition();
        const list = await findStations(pos, vehicle.fuelType);
        const near = list[0];
        if (alive && near && near.dist <= 300 && !touched.current) {
          applyStation({ name: near.name, address: near.address ?? near.brand, lat: near.lat, lng: near.lng, price: near.price ?? undefined });
          setAutoNote(`지금 위치에서 ${fmtDist(near.dist)}`);
        }
      } catch {
        /* 조용히 넘어감 */
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recent = useMemo(() => {
    const seen = new Set<string>();
    const out: Picked[] = [];
    ledger.fuel
      .filter((l) => l.vehicleId === vehicle.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach((l) => {
        if (!l.stationName || l.stationName === '주유소' || seen.has(l.stationName) || out.length >= 5) return;
        seen.add(l.stationName);
        out.push({ name: l.stationName, address: l.stationLocation, lat: l.stationLat, lng: l.stationLng });
      });
    return out;
  }, [ledger.fuel, vehicle.id]);

  const prevOdo = useMemo(() => {
    if (editing) return editing.odometer - (editing.tripDistance || 0);
    return vehicle.currentMileage || 0;
  }, [editing, vehicle.currentMileage]);
  const newOdo = prevOdo + (Number(trip) || 0);

  // 미리 보기: 이번 기록을 넣었을 때 연비
  const previewEff = useMemo(() => {
    if (!volume || !trip) return 0;
    const draft: FuelLog = makeLog();
    const others = ledger.fuel.filter((l) => l.vehicleId === vehicle.id && l.id !== draft.id);
    const re = withRecalculated([...others, draft]);
    return re.find((l) => l.id === draft.id)?.calculatedEfficiency ?? 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, trip, full, date, time, ledger.fuel]);


  function makeLog(): FuelLog {
    return {
      id: editing?.id ?? uid('fl'),
      vehicleId: vehicle.id,
      date,
      time,
      fuelType: vehicle.fuelType,
      totalPrice: Number(total) || 0,
      volume: Number(volume) || 0,
      unitPrice: Number(price) || 0,
      stationName: station?.name || '주유소',
      stationLocation: station?.address ?? '',
      stationLat: station?.lat,
      stationLng: station?.lng,
      odometer: newOdo,
      tripDistance: Number(trip) || 0,
      calculatedEfficiency: 0,
      isFullTank: full,
      memo: memo.trim() || undefined,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    };
  }

  const canSave = Number(total) > 0 && Number(volume) > 0;

  const save = () => {
    if (!canSave) return;
    const log = makeLog();
    const all = ledger.fuel.filter((l) => l.id !== log.id).concat(log);
    const mine = withRecalculated(all.filter((l) => l.vehicleId === vehicle.id));
    ledger.setFuelAll([...all.filter((l) => l.vehicleId !== vehicle.id), ...mine]);
    const tripDiff = log.tripDistance - (editing?.tripDistance ?? 0);
    if (tripDiff) ledger.saveVehicle({ ...vehicle, currentMileage: Math.max(0, (vehicle.currentMileage || 0) + tripDiff) });
    const eff = mine.find((l) => l.id === log.id)?.calculatedEfficiency ?? 0;
    onSaved(
      eff > 0
        ? `저장했어요 · 연비 ${fmt(eff, 1)}${effUnit(vehicle)} — 트립을 0으로 리셋하세요`
        : log.tripDistance
          ? log.isFullTank
            ? '저장했어요 — 트립을 0으로 리셋하세요'
            : '저장했어요 · 다음 가득 주유 때 연비가 합쳐서 계산돼요'
          : '저장했어요 · 트립 거리가 없어 연비는 계산하지 않았어요',
    );
  };

  const remove = () => {
    if (!editing) return;
    const rest = ledger.fuel.filter((l) => l.id !== editing.id);
    const mine = withRecalculated(rest.filter((l) => l.vehicleId === vehicle.id));
    ledger.setFuelAll([...rest.filter((l) => l.vehicleId !== vehicle.id), ...mine]);
    onSaved('주유 기록을 지웠어요');
  };

  const clearAll = () => {
    setTotal('');
    setVolume('');
    setPrice('');
    setAuto(null);
    setTrip('');
    setFull(true);
    setStation(null);
    setMemo('');
    setAutoNote('');
    setPriceFromOpinet(false);
  };

  return (
    <Sheet
      title={editing ? '주유 기록 고치기' : '주유 기록'}
      sub={`${vehicle.name} · ${FUEL_LABEL[vehicle.fuelType]}`}
      onClose={onClose}
      foot={
        <>
          {editing && (
            <TwoTap label="삭제" armedLabel="한 번 더" onConfirm={remove} className="btn danger" icon={false} />
          )}
          <button className="btn primary" disabled={!canSave} onClick={save}>
            {editing ? '고친 내용 저장' : '저장'}
          </button>
        </>
      }
    >
      <NumField big label="결제 금액" unit="원" value={total} onChange={(v) => { touched.current = true; onTotal(v); }} placeholder="0" autoFocus={!editing} />
      <div className="pair">
        <NumField decimal label={`${ev ? '충전량' : '주유량'}`} unit={unit} value={volume} onChange={(v) => { touched.current = true; onVolume(v); }} placeholder="0" tag={auto === 'volume' ? <i className="auto">자동</i> : null} />
        <NumField
          label="단가"
          unit={`원/${unit}`}
          value={price}
          onChange={(v) => { touched.current = true; onPrice(v); }}
          placeholder="0"
          tag={auto === 'price' ? <i className="auto">자동</i> : priceFromOpinet ? <i className="auto">오피넷</i> : null}
        />
      </div>
      <p className="hint">금액·{ev ? '충전량' : '주유량'}·단가 중 두 개만 넣으면 나머지는 자동으로 채워져요.</p>

      <NumField label="트립 거리 (계기판 트립 A/B)" unit="km" value={trip} onChange={setTrip} placeholder="지난 주유 뒤 달린 거리" />
      <Toggle on={full} onChange={setFull} title="가득 주유" desc="가득 넣어야 실연비가 정확해요" />

      {(previewEff > 0 || trip !== '') && (
        <div className="preview">
          <div>
            <span className="label">이번 연비</span>
            <div className="num-card">
              {previewEff > 0 ? fmt(previewEff, 1) : '-'}
              <span className="unit">{effUnit(vehicle)}</span>
            </div>
          </div>
          <div>
            <span className="label">주유 후 누적거리</span>
            <div className="num-card">
              {fmt(newOdo)}
              <span className="unit">km</span>
            </div>
          </div>
          {!full && trip !== '' && <p className="hint" style={{ gridColumn: '1/-1', padding: 0 }}>가득이 아니면 다음 가득 주유 때 합쳐서 계산해요.</p>}
        </div>
      )}

      <button type="button" className="station-btn" onClick={() => setPicker(true)}>
        <span className="ico fuel">
          <IPin size={18} />
        </span>
        <span className="row-main">
          <b>{station?.name || `내 주변 ${place} 찾기`}</b>
          <span className="row-sub">{station ? autoNote || station.address || '눌러서 바꾸기' : opinetSupports(vehicle.fuelType) ? '오늘 가격까지 함께 보여드려요' : '가까운 순으로 보여드려요'}</span>
        </span>
        <IRight size={18} />
      </button>

      {!showMore ? (
        <button type="button" className="more" onClick={() => setShowMore(true)}>
          날짜 {date === todayStr() ? '오늘' : date.slice(5).replace('-', '/')} {time} · 메모 추가 ▾
        </button>
      ) : (
        <>
          <div className="pair">
            <TextField label="날짜" type="date" value={date} onChange={setDate} />
            <TextField label="시간" type="time" value={time} onChange={setTime} />
          </div>
          <TextField label="메모" value={memo} onChange={setMemo} placeholder="예: 장거리 출발 전" />
        </>
      )}

      {!editing && <TwoTap label="입력한 내용 모두 지우기" armedLabel="한 번 더 누르면 지워져요" onConfirm={clearAll} />}
      {editing && (
        <p className="hint" style={{ textAlign: 'center' }}>
          <ITrash size={12} style={{ verticalAlign: '-2px' }} /> 삭제는 아래 버튼을 두 번 눌러요 · 등록 {fmtNow(editing.createdAt)}
        </p>
      )}

      {picker && (
        <StationPicker
          fuelType={vehicle.fuelType}
          recent={recent}
          onClose={() => setPicker(false)}
          onPick={(s) => {
            setAutoNote('');
            applyStation(s);
            setPicker(false);
          }}
        />
      )}
    </Sheet>
  );
}
