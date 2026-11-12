import { useCallback, useEffect, useState } from 'react';
import { useLedger } from './store';
import type { Entry, FuelLog, MaintenanceLog, OtherExpenseLog, Vehicle } from './types';
import { FUEL_LABEL } from './types';
import { fmt } from './calc';
import { Home, Records } from './ui/Views';
import { Stats } from './ui/Stats';
import { Manage } from './ui/Manage';
import { FuelSheet } from './ui/FuelSheet';
import { MaintSheet, OtherSheet, VehicleSheet } from './ui/OtherSheets';
import { Sheet } from './ui/common';
import { ICar, IChart, IDown, IFuel, IHome, IList, IPlus, IReceipt, IWrench } from './ui/icons';

type Tab = 'home' | 'records' | 'stats' | 'manage';
type Open =
  | { t: 'fuel'; e?: FuelLog }
  | { t: 'maint'; e?: MaintenanceLog }
  | { t: 'other'; e?: OtherExpenseLog }
  | { t: 'vehicle'; e?: Vehicle }
  | { t: 'cars' }
  | null;

const TABS: { id: Tab; label: string; Icon: typeof IHome }[] = [
  { id: 'home', label: '홈', Icon: IHome },
  { id: 'records', label: '기록', Icon: IList },
  { id: 'stats', label: '통계', Icon: IChart },
  { id: 'manage', label: '관리', Icon: ICar },
];

export default function App() {
  const ledger = useLedger();
  const v = ledger.vehicle;
  const [tab, setTab] = useState<Tab>(() => {
    const h = location.hash.slice(1) as Tab;
    return TABS.some((t) => t.id === h) ? h : 'home';
  });
  const [open, setOpen] = useState<Open>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    history.replaceState(null, '', tab === 'home' ? location.pathname + location.search : `#${tab}`);
    window.scrollTo(0, 0);
  }, [tab]);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 3800);
    return () => clearTimeout(t);
  }, [msg]);
  useEffect(() => {
    if (ledger.saveError) {
      setMsg('저장 공간이 부족해 영수증 사진 없이 저장했어요');
      ledger.clearSaveError();
    }
  }, [ledger, ledger.saveError]);

  const close = useCallback(() => setOpen(null), []);
  const saved = useCallback((m: string) => {
    setOpen(null);
    setMsg(m);
  }, []);
  const openEntry = (e: Entry) => setOpen(e.kind === 'fuel' ? { t: 'fuel', e: e.log } : e.kind === 'maint' ? { t: 'maint', e: e.log } : { t: 'other', e: e.log });

  return (
    <>
      <div className="app">
        <header className="top">
          <div className="brandmark">
            <img src="./icon.svg?v=2" alt="" />
            <b>
              <em>스마트</em>차계부
            </b>
          </div>
          {v && (
            <button className="carchip" onClick={() => setOpen({ t: 'cars' })} aria-label="차량 바꾸기">
              <span>{v.name}</span>
              <IDown size={15} />
            </button>
          )}
        </header>

        {!v ? (
          <div className="card welcome">
            <img src="./icon.svg?v=2" alt="" />
            <h1>내 차를 먼저 등록해요</h1>
            <p>차 이름과 유종, 지금 계기판 누적거리만 넣으면 바로 시작해요.</p>
            <button className="btn primary" style={{ width: '100%' }} onClick={() => setOpen({ t: 'vehicle' })}>
              내 차 등록하기
            </button>
          </div>
        ) : (
          <>
            {tab === 'home' && ledger.sampleCount > 0 && (
              <button className="banner" style={{ width: '100%', textAlign: 'left' }} onClick={() => setTab('manage')}>
                <i className="dot soon" />
                <span className="row-main">예시 기록이 섞여 있어요. 관리에서 한 번에 지울 수 있어요.</span>
              </button>
            )}
            {tab === 'home' && <Home ledger={ledger} v={v} onOpen={openEntry} goRecords={() => setTab('records')} goManage={() => setTab('manage')} editVehicle={() => setOpen({ t: 'vehicle', e: v })} />}
            {tab === 'records' && <Records ledger={ledger} v={v} onOpen={openEntry} />}
            {tab === 'stats' && <Stats ledger={ledger} v={v} />}
            {tab === 'manage' && <Manage ledger={ledger} v={v} onEditVehicle={(x) => setOpen({ t: 'vehicle', e: x })} onAddVehicle={() => setOpen({ t: 'vehicle' })} toast={setMsg} />}
          </>
        )}
      </div>

      {v && (tab === 'home' || tab === 'records') && (
        <div className="quick">
          <div className="quick-in">
            <button className="main" onClick={() => setOpen({ t: 'fuel' })}>
              <IFuel size={19} /> 주유 기록
            </button>
            <button className="side" onClick={() => setOpen({ t: 'maint' })} aria-label="정비 기록">
              <IWrench size={17} /> 정비
            </button>
            <button className="side" onClick={() => setOpen({ t: 'other' })} aria-label="기타 지출">
              <IReceipt size={17} /> 기타
            </button>
          </div>
        </div>
      )}

      <nav className="tabbar">
        <div className="tabbar-in">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} className={`tab${tab === id ? ' on' : ''}`} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}>
              <Icon size={22} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {open?.t === 'fuel' && v && <FuelSheet ledger={ledger} vehicle={v} editing={open.e} onClose={close} onSaved={saved} />}
      {open?.t === 'maint' && v && <MaintSheet ledger={ledger} vehicle={v} editing={open.e} onClose={close} onSaved={saved} />}
      {open?.t === 'other' && v && <OtherSheet ledger={ledger} vehicle={v} editing={open.e} onClose={close} onSaved={saved} />}
      {open?.t === 'vehicle' && <VehicleSheet ledger={ledger} editing={open.e} onClose={close} onSaved={saved} />}
      {open?.t === 'cars' && (
        <Sheet title="차량 고르기" onClose={close}>
          <div className="card" style={{ padding: '2px 14px' }}>
            <div className="rows">
              {ledger.vehicles.map((x) => (
                <button key={x.id} className="row" onClick={() => { ledger.setSelectedId(x.id); close(); }}>
                  <span className="ico fuel" style={x.id === v?.id ? { background: 'var(--brand)', color: 'var(--on-brand)' } : undefined}>
                    <ICar size={18} />
                  </span>
                  <span className="row-main">
                    <span className="row-title" style={{ display: 'block' }}>
                      {x.name}
                    </span>
                    <span className="row-sub" style={{ display: 'block' }}>
                      {[x.licensePlate, FUEL_LABEL[x.fuelType], `${fmt(x.currentMileage || 0)}km`].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  {x.id === v?.id && <span className="badge">사용 중</span>}
                </button>
              ))}
            </div>
          </div>
          <button className="btn ghost" onClick={() => setOpen({ t: 'vehicle' })}>
            <IPlus size={18} /> 차 추가
          </button>
        </Sheet>
      )}

      {msg && (
        <div className="toast" role="status">
          {msg}
        </div>
      )}
    </>
  );
}
