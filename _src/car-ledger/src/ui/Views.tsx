import { useMemo, useState } from 'react';
import type { Ledger } from '../store';
import { MAINT_LABEL, OTHER_LABEL, type Entry, type Vehicle } from '../types';
import {
  addMonths, consumables, daysBetween, effUnit, entriesOf, fmt, fuelSegments, monthSum, thisYm, todayStr, unitOf, weekday, wonShort, ymLabel, ymOf,
} from '../calc';
import { IKindIcon, ILeft, IRight } from './icons';

export type Kind = Entry['kind'];

export function useVehicleData(ledger: Ledger, v?: Vehicle) {
  return useMemo(() => {
    if (!v) return null;
    const entries = entriesOf(v.id, ledger.fuel, ledger.maint, ledger.other);
    const fuelMine = ledger.fuel.filter((l) => l.vehicleId === v.id);
    const seg = fuelSegments(fuelMine);
    return { entries, seg, fuelMine };
  }, [ledger.fuel, ledger.maint, ledger.other, v]);
}

export function EntryRow({ e, v, onOpen }: { e: Entry; v: Vehicle; onOpen: (e: Entry) => void }) {
  let title = '';
  let sub = '';
  if (e.kind === 'fuel') {
    const l = e.log;
    title = l.stationName || '주유';
    sub = [`${fmt(l.volume, 1)}${unitOf(v)}`, l.unitPrice ? `${fmt(l.unitPrice)}원` : '', l.calculatedEfficiency > 0 ? `연비 ${fmt(l.calculatedEfficiency, 1)}` : '', !l.isFullTank ? '부분 주유' : '']
      .filter(Boolean)
      .join(' · ');
  } else if (e.kind === 'maint') {
    title = e.log.itemName || MAINT_LABEL[e.log.category];
    sub = [e.log.shopName, e.log.odometer ? `${fmt(e.log.odometer)}km` : ''].filter(Boolean).join(' · ') || '정비';
  } else {
    title = OTHER_LABEL[e.log.category];
    sub = e.log.memo || '기타 지출';
  }
  return (
    <button className="row" onClick={() => onOpen(e)}>
      <span className={`ico ${e.kind}`}>
        <IKindIcon kind={e.kind} />
      </span>
      <span className="row-main">
        <span className="row-title" style={{ display: 'block' }}>
          {title}
        </span>
        <span className="row-sub" style={{ display: 'block' }}>
          {sub}
        </span>
      </span>
      <span className="row-amt">
        {fmt(e.cost)}
        <small>원</small>
      </span>
    </button>
  );
}

/* ───────────────── 홈 ───────────────── */
export function Home({ ledger, v, onOpen, goRecords, goManage, editVehicle }: { ledger: Ledger; v: Vehicle; onOpen: (e: Entry) => void; goRecords: () => void; goManage: () => void; editVehicle: () => void }) {
  const d = useVehicleData(ledger, v)!;
  const ym = thisYm();
  const cur = monthSum(ym, d.entries, d.seg.segments);
  const prev = monthSum(addMonths(ym, -1), d.entries, d.seg.segments);
  const lastFuel = d.entries.find((e) => e.kind === 'fuel');
  const recentSeg = d.seg.segments.slice(-3);
  const recentEff = recentSeg.length ? recentSeg.reduce((a, s) => a + s.dist, 0) / recentSeg.reduce((a, s) => a + s.vol, 0) : 0;
  const ratio = v.officialEfficiency && recentEff ? recentEff / v.officialEfficiency : 0;
  const cons = consumables(v, ledger.maint);
  const due = cons.filter((c) => c.hasRecord && c.status !== 'ok');
  const diff = cur.total - prev.total;
  const m = Number(ym.slice(5));

  return (
    <div className="grid">
      <div className="hero">
        <span className="label">{m}월 차량비</span>
        <div className="num-hero">
          {fmt(cur.total)}
          <span className="unit">원</span>
        </div>
        <div className="delta">
          {prev.total || cur.total ? (diff === 0 ? '지난달과 같아요' : `지난달보다 ${fmt(Math.abs(diff))}원 ${diff > 0 ? '더 씀' : '덜 씀'}`) : '이번 달 첫 기록을 남겨 보세요'}
        </div>
        <div className="hero-row">
          <span className="hero-pill">주유 {cur.fuelCount}회</span>
          <span className="hero-pill">정비 {cur.maintCount}건</span>
          <span className="hero-pill">기타 {cur.otherCount}건</span>
        </div>
      </div>

      <div className="card">
        <span className="label">이번 달 주유비</span>
        <div className="num-card">
          {wonShort(cur.fuelCost)}
          <span className="unit">원</span>
        </div>
        <div className="sub">{cur.volume ? `${fmt(cur.volume, 1)}${unitOf(v)} · 평균 ${fmt(cur.avgUnitPrice)}원` : '아직 주유 없음'}</div>
      </div>
      <div className="card">
        <span className="label">최근 실연비</span>
        <div className="num-card">
          {recentEff ? fmt(recentEff, 1) : '-'}
          <span className="unit">{effUnit(v)}</span>
        </div>
        <div className="sub">
          {ratio ? (
            <span className="state">
              <i className={`dot ${ratio >= 0.9 ? 'ok' : ratio >= 0.75 ? 'soon' : 'over'}`} />
              공인 대비 {Math.round(ratio * 100)}%
            </span>
          ) : recentEff ? (
            `가득 주유 ${recentSeg.length}번 평균`
          ) : (
            '가득 주유 기록이 쌓이면 나와요'
          )}
        </div>
      </div>
      <div className="card">
        <span className="label">km당 비용</span>
        <div className="num-card">
          {cur.perKm ? fmt(cur.perKm) : '-'}
          <span className="unit">원</span>
        </div>
        <div className="sub">{cur.distance ? `이번 달 ${fmt(cur.distance)}km 주행` : '트립 거리를 넣으면 나와요'}</div>
      </div>
      <div className="card">
        <span className="label">마지막 주유</span>
        <div className="num-card">
          {lastFuel ? (daysBetween(lastFuel.date, todayStr()) === 0 ? '오늘' : `${daysBetween(lastFuel.date, todayStr())}일 전`) : '-'}
        </div>
        <div className="sub">{lastFuel ? `${lastFuel.date.slice(5).replace('-', '/')} · ${fmt(lastFuel.cost)}원` : '기록 없음'}</div>
      </div>
      <button className="card tap" onClick={editVehicle}>
        <span className="label">누적 주행거리</span>
        <div className="num-card">
          {fmt(v.currentMileage || 0)}
          <span className="unit">km</span>
        </div>
        <div className="sub">트립으로 자동 증가 · 눌러서 맞추기</div>
      </button>
      <button className="card tap" onClick={goManage}>
        <span className="label">소모품</span>
        <div className="num-card">
          {due.length ? `${due.length}개` : '양호'}
        </div>
        <div className="sub">
          {due.length ? (
            <span className="state">
              <i className={`dot ${due.some((c) => c.status === 'over') ? 'over' : 'soon'}`} />
              {due[0].name} {due[0].status === 'over' ? '지남' : '곧 교체'}
            </span>
          ) : cons.some((c) => c.hasRecord) ? (
            <span className="state">
              <i className="dot ok" />
              교체할 것 없음
            </span>
          ) : (
            '정비 기록을 넣으면 계산돼요'
          )}
        </div>
      </button>

      <div className="card wide" style={{ paddingBottom: 6 }}>
        <div className="card-title">
          최근 기록
          <button onClick={goRecords} style={{ color: 'var(--brand)', fontSize: 12.5, fontWeight: 600 }}>
            전체 보기
          </button>
        </div>
        {d.entries.length === 0 ? (
          <div className="empty">아래 '주유 기록'을 눌러 첫 기록을 남겨 보세요.</div>
        ) : (
          <div className="rows">
            {d.entries.slice(0, 5).map((e) => (
              <EntryRow key={e.log.id} e={e} v={v} onOpen={onOpen} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────── 기록 ───────────────── */
export function Records({ ledger, v, onOpen }: { ledger: Ledger; v: Vehicle; onOpen: (e: Entry) => void }) {
  const d = useVehicleData(ledger, v)!;
  const [ym, setYm] = useState(thisYm());
  const [kind, setKind] = useState<Kind | 'all'>('all');
  const sum = monthSum(ym, d.entries, d.seg.segments);
  const monthEntries = d.entries.filter((e) => ymOf(e.date) === ym);
  const shown = kind === 'all' ? monthEntries : monthEntries.filter((e) => e.kind === kind);
  const firstYm = d.entries.length ? ymOf(d.entries[d.entries.length - 1].date) : thisYm();
  const [y, m] = ym.split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  const byDay = new Map<number, Set<Kind>>();
  monthEntries.forEach((e) => {
    const day = Number(e.date.slice(8, 10));
    if (!byDay.has(day)) byDay.set(day, new Set());
    byDay.get(day)!.add(e.kind);
  });
  const today = todayStr();

  const groups: { date: string; items: Entry[] }[] = [];
  shown.forEach((e) => {
    const g = groups[groups.length - 1];
    if (g && g.date === e.date) g.items.push(e);
    else groups.push({ date: e.date, items: [e] });
  });

  const jump = (day: number) => {
    const el = document.getElementById(`day-${ym}-${String(day).padStart(2, '0')}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div>
      <div className="monthbar">
        <button onClick={() => setYm(addMonths(ym, -1))} disabled={ym <= firstYm} aria-label="지난달">
          <ILeft />
        </button>
        <b>{ymLabel(ym)}</b>
        <button onClick={() => setYm(addMonths(ym, 1))} disabled={ym >= thisYm()} aria-label="다음 달">
          <IRight />
        </button>
      </div>

      <div className="card" style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="label">이 달 합계</span>
          <div className="num-card" style={{ marginTop: 0 }}>
            {fmt(sum.total)}
            <span className="unit">원</span>
          </div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginTop: 10, gap: 6 }}>
          {([
            ['fuel', '주유', sum.fuelCount, '회', sum.fuelCost],
            ['maint', '정비', sum.maintCount, '건', sum.maintCost],
            ['other', '기타', sum.otherCount, '건', sum.otherCost],
          ] as const).map(([k, label, n, u, cost]) => (
            <button key={k} onClick={() => setKind(kind === k ? 'all' : k)} style={{ background: kind === k ? 'var(--brand-tint)' : 'var(--surface-100)', borderRadius: 12, padding: '9px 10px', textAlign: 'left' }}>
              <span className="label">{label}</span>
              <div className="num" style={{ fontSize: 22, lineHeight: '26px' }}>
                {n}
                <span className="unit">{u}</span>
              </div>
              <div className="sub" style={{ marginTop: 0 }}>{wonShort(cost)}원</div>
            </button>
          ))}
        </div>
        {sum.fuelCount > 0 && (
          <div className="sub" style={{ marginTop: 10 }}>
            {[`${fmt(sum.volume, 1)}${unitOf(v)}`, sum.avgUnitPrice ? `평균 ${fmt(sum.avgUnitPrice)}원/${unitOf(v)}` : '', sum.avgEff ? `실연비 ${fmt(sum.avgEff, 1)}${effUnit(v)}` : '', sum.distance ? `${fmt(sum.distance)}km` : '']
              .filter(Boolean)
              .join(' · ')}
          </div>
        )}
        <div className="strip" aria-label="날짜별 기록">
          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
            const ks = byDay.get(day);
            const date = `${ym}-${String(day).padStart(2, '0')}`;
            if (day > days) return <span key={day} />;
            return (
              <button key={day} className={`strip-day${date === today ? ' today' : ''}`} onClick={() => ks && jump(day)} aria-label={`${day}일`}>
                <i>{day % 5 === 0 || day === 1 ? day : '·'}</i>
                {ks && [...ks].map((k) => <span key={k} className={`pip ${k}`} />)}
              </button>
            );
          })}
        </div>
        <div className="legend">
          <span>
            <i className="pip fuel" /> 주유
          </span>
          <span>
            <i className="pip maint" /> 정비
          </span>
          <span>
            <i className="pip other" /> 기타
          </span>
        </div>
      </div>

      <div className="chips hscroll" style={{ marginBottom: 4 }}>
        {(['all', 'fuel', 'maint', 'other'] as const).map((k) => (
          <button key={k} className={`chip${kind === k ? ' on' : ''}`} onClick={() => setKind(k)}>
            {{ all: '전체', fuel: '주유', maint: '정비', other: '기타' }[k]}
            <span className="cnt">{k === 'all' ? monthEntries.length : monthEntries.filter((e) => e.kind === k).length}</span>
          </button>
        ))}
      </div>

      {groups.length === 0 && <div className="card empty">{ymLabel(ym, false)} 기록이 없어요.</div>}
      {groups.map((g) => (
        <div key={g.date} id={`day-${g.date}`} style={{ scrollMarginTop: 12 }}>
          <div className="daybar">
            <span>
              <b>
                {Number(g.date.slice(5, 7))}월 {Number(g.date.slice(8))}일
              </b>{' '}
              {weekday(g.date)}요일
            </span>
            <span>{fmt(g.items.reduce((a, e) => a + e.cost, 0))}원</span>
          </div>
          <div className="card" style={{ padding: '2px 14px' }}>
            <div className="rows">
              {g.items.map((e) => (
                <EntryRow key={e.log.id} e={e} v={v} onOpen={onOpen} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
