import { useRef, useState } from 'react';
import type { Ledger } from '../store';
import { FUEL_LABEL, type Vehicle } from '../types';
import { consumables, fmt } from '../calc';
import { applyBackup, backupName, buildBackup, buildCsv, csvName, parseBackup, shareOrDownload, type Backup } from '../backup';
import { TwoTap } from './common';
import { ICar, IDownload, IPlus, IUpload } from './icons';

export const APP_VERSION = 'v4';

export function Manage({ ledger, v, onEditVehicle, onAddVehicle, toast }: { ledger: Ledger; v: Vehicle; onEditVehicle: (v: Vehicle) => void; onAddVehicle: () => void; toast: (m: string) => void }) {
  const cons = consumables(v, ledger.maint);
  const fileRef = useRef<HTMLInputElement>(null);
  const [incoming, setIncoming] = useState<Backup | null>(null);

  const pick = async (f?: File) => {
    if (!f) return;
    try {
      setIncoming(parseBackup(await f.text()));
    } catch (e) {
      toast((e as Error).message);
    }
  };
  const apply = (mode: 'replace' | 'merge') => {
    if (!incoming) return;
    applyBackup(incoming, mode);
    location.reload();
  };

  return (
    <div className="grid">
      {ledger.sampleCount > 0 && (
        <div className="banner wide" style={{ gridColumn: '1/-1', marginBottom: 0 }}>
          <span className="row-main">
            <b>예시 기록 {ledger.sampleCount}개가 들어 있어요</b>
            <div className="row-sub" style={{ whiteSpace: 'normal' }}>예전 버전이 처음에 넣어 둔 아반떼·쏘렌토 예시예요. 직접 넣은 기록은 지워지지 않아요.</div>
          </span>
          <TwoTap label="예시 지우기" armedLabel="한 번 더" icon={false} className="btn ghost small" onConfirm={() => { ledger.removeSamples(); toast('예시 기록을 지웠어요'); }} />
        </div>
      )}

      <div className="card wide">
        <div className="card-title">
          내 차 <small>눌러서 바꾸기</small>
        </div>
        <div className="rows">
          {ledger.vehicles.map((x) => (
            <div key={x.id} className="row">
              <button className="ico fuel" onClick={() => ledger.setSelectedId(x.id)} aria-label={`${x.name} 선택`} style={x.id === v.id ? { background: 'var(--brand)', color: 'var(--on-brand)' } : undefined}>
                <ICar size={18} />
              </button>
              <button className="row-main" style={{ textAlign: 'left' }} onClick={() => ledger.setSelectedId(x.id)}>
                <span className="row-title" style={{ display: 'block' }}>
                  {x.name} {x.id === v.id && <span className="badge">사용 중</span>}
                </span>
                <span className="row-sub" style={{ display: 'block' }}>
                  {[x.licensePlate, FUEL_LABEL[x.fuelType], `${fmt(x.currentMileage || 0)}km`].filter(Boolean).join(' · ')}
                </span>
              </button>
              <button className="btn ghost small" style={{ background: 'var(--surface-100)' }} onClick={() => onEditVehicle(x)}>
                수정
              </button>
            </div>
          ))}
        </div>
        <button className="btn ghost small" style={{ background: 'var(--surface-100)', marginTop: 8, width: '100%' }} onClick={onAddVehicle}>
          <IPlus size={16} /> 차 추가
        </button>
      </div>

      <div className="card wide">
        <div className="card-title">
          소모품 교체 <small>{v.name} · {fmt(v.currentMileage || 0)}km 기준</small>
        </div>
        {cons.map((c) => (
          <div key={c.category} style={{ padding: '9px 0', borderTop: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <b style={{ fontSize: 14 }}>{c.name}</b>
              {c.hasRecord ? (
                <span className="state">
                  <i className={`dot ${c.status}`} />
                  {c.status === 'over' ? '교체 시기 지남' : c.remainingKm < 99999 ? `${fmt(Math.max(0, c.remainingKm))}km · ${Math.max(0, c.remainingDays)}일 남음` : ''}
                </span>
              ) : (
                <span className="state">기록 없음</span>
              )}
            </div>
            {c.hasRecord && (
              <div className="meter">
                <i style={{ width: `${Math.max(3, c.life * 100)}%`, background: c.status === 'ok' ? 'var(--leaf)' : c.status === 'soon' ? 'var(--accent)' : 'var(--danger)' }} />
              </div>
            )}
          </div>
        ))}
        <p className="hint" style={{ padding: '8px 0 0' }}>정비 기록에 항목을 고르면 그날부터 다시 계산돼요. 주기는 일반 승용차 권장 기준이에요.</p>
      </div>

      <div className="card wide">
        <div className="card-title">
          기록 옮기기 <small>다른 폰·새 주소로</small>
        </div>
        <p className="sub" style={{ marginTop: 0, marginBottom: 10 }}>
          이 폰에서 백업 보내기 → 카톡 '나에게'·드라이브로 전달 → 새 폰에서 불러오기
        </p>
        <div className="pair">
          <button className="btn primary small" onClick={async () => { const r = await shareOrDownload(backupName(), JSON.stringify(buildBackup()), 'application/json'); if (r !== 'cancelled') toast(r === 'shared' ? '백업 파일을 보냈어요' : '백업 파일을 저장했어요'); }}>
            <IUpload size={16} /> 백업 보내기
          </button>
          <button className="btn ghost small" style={{ background: 'var(--surface-100)' }} onClick={() => fileRef.current?.click()}>
            <IDownload size={16} /> 불러오기
          </button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        {incoming && (
          <div style={{ marginTop: 10, background: 'var(--brand-tint)', borderRadius: 12, padding: 12 }}>
            <b style={{ fontSize: 14 }}>
              백업: 차량 {incoming.vehicles.length}대 · 기록 {incoming.fuelLogs.length + incoming.maintenanceLogs.length + incoming.otherExpenseLogs.length}건
            </b>
            <div className="pair" style={{ marginTop: 10 }}>
              <TwoTap label="이걸로 바꾸기" armedLabel="지금 기록 지워짐" icon={false} className="btn primary small" onConfirm={() => apply('replace')} />
              <button className="btn ghost small" onClick={() => apply('merge')}>
                지금 기록에 합치기
              </button>
            </div>
          </div>
        )}
        <button className="btn ghost small" style={{ background: 'var(--surface-100)', marginTop: 8, width: '100%' }} onClick={async () => { const r = await shareOrDownload(csvName(), buildCsv(buildBackup()), 'text/csv'); if (r !== 'cancelled') toast('엑셀에서 여는 CSV 파일을 만들었어요'); }}>
          엑셀(CSV)로 지출 내역 받기
        </button>
      </div>

      <p className="hint wide" style={{ gridColumn: '1/-1', textAlign: 'center', marginTop: 6 }}>
        스마트차계부 · 기록은 이 폰에만 저장돼요 · 주유소 가격 오피넷
      </p>
    </div>
  );
}
