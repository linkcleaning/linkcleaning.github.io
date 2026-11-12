import { useState } from 'react';
import type { Ledger } from '../store';
import { MAINT_LABEL, type Vehicle } from '../types';
import { addMonths, effUnit, fmt, monthSum, thisYm, unitOf, wonShort, ymLabel } from '../calc';
import { useVehicleData } from './Views';

const W = 320;

function CostBars({ months, sel, onSel }: { months: ReturnType<typeof monthSum>[]; sel: string; onSel: (ym: string) => void }) {
  const H = 150, top = 16, bottom = 22;
  const max = Math.max(1, ...months.map((m) => m.total));
  const bw = W / months.length;
  const barW = Math.min(26, bw * 0.62);
  const y = (v: number) => top + (H - top - bottom) * (1 - v / max);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="월별 지출 막대그래프">
      {[0.5, 1].map((t) => (
        <line key={t} className="gridline" x1={0} x2={W} y1={y(max * t)} y2={y(max * t)} />
      ))}
      {months.map((m, i) => {
        const x = i * bw + (bw - barW) / 2;
        let acc = 0;
        const parts = [
          ['bar-fuel', m.fuelCost],
          ['bar-maint', m.maintCost],
          ['bar-other', m.otherCost],
        ] as const;
        return (
          <g key={m.ym} onClick={() => onSel(m.ym)} style={{ cursor: 'pointer' }}>
            <rect x={i * bw} y={0} width={bw} height={H} fill="transparent" />
            {parts.map(([cls, v]) => {
              if (!v) return null;
              const y1 = y(acc + v), y0 = y(acc);
              acc += v;
              return <rect key={cls} className={cls} x={x} y={y1} width={barW} height={Math.max(1, y0 - y1 - 1)} rx={3} />;
            })}
            {m.ym === sel && <rect className="bar-sel" x={x - 2} y={y(m.total) - 2} width={barW + 4} height={y(0) - y(m.total) + 3} rx={5} fill="none" />}
            {m.total > 0 && (m.ym === sel || months.length <= 6) && (
              <text className="val" x={x + barW / 2} y={y(m.total) - 5} textAnchor="middle">
                {wonShort(m.total)}
              </text>
            )}
            <text x={x + barW / 2} y={H - 6} textAnchor="middle" style={{ fontWeight: m.ym === sel ? 700 : 400 }}>
              {Number(m.ym.slice(5))}월
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ pts, refValue, digits = 1, label }: { pts: { x: string; y: number }[]; refValue?: number; digits?: number; label: string }) {
  const H = 130, top = 18, bottom = 20, side = 14;
  const ys = pts.map((p) => p.y).concat(refValue ? [refValue] : []);
  const lo = Math.min(...ys), hi = Math.max(...ys);
  const pad = (hi - lo) * 0.15 || hi * 0.1 || 1;
  const min = lo - pad, max = hi + pad;
  const x = (i: number) => side + (pts.length === 1 ? (W - side * 2) / 2 : ((W - side * 2) * i) / (pts.length - 1));
  const y = (v: number) => top + (H - top - bottom) * (1 - (v - min) / (max - min));
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {refValue ? (
        <>
          <line className="refline" x1={0} x2={W} y1={y(refValue)} y2={y(refValue)} />
          <text x={W} y={y(refValue) - 4} textAnchor="end" style={{ fill: 'var(--accent)', fontWeight: 700 }}>
            공인 {fmt(refValue, digits)}
          </text>
        </>
      ) : null}
      <polyline className="line" points={pts.map((p, i) => `${x(i)},${y(p.y)}`).join(' ')} />
      {pts.map((p, i) => (
        <g key={i}>
          <circle className="ptn" cx={x(i)} cy={y(p.y)} r={3.5} />
          {(i === pts.length - 1 || pts.length <= 6 || p.y === hi || p.y === lo) && (
            <text className="val" x={x(i)} y={y(p.y) - 8} textAnchor="middle">
              {fmt(p.y, digits)}
            </text>
          )}
          {(pts.length <= 8 || i % 2 === pts.length % 2) && (
            <text x={x(i)} y={H - 5} textAnchor="middle">
              {p.x}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function Stats({ ledger, v }: { ledger: Ledger; v: Vehicle }) {
  const d = useVehicleData(ledger, v)!;
  const [span, setSpan] = useState<6 | 12>(6);
  const now = thisYm();
  const months = Array.from({ length: span }, (_, i) => monthSum(addMonths(now, i - span + 1), d.entries, d.seg.segments));
  const [sel, setSel] = useState(now);
  const selSum = months.find((m) => m.ym === sel) ?? months[months.length - 1];
  const total = months.reduce((a, m) => a + m.total, 0);
  const dist = months.reduce((a, m) => a + m.distance, 0);
  const fuelCount = months.reduce((a, m) => a + m.fuelCount, 0);
  const fuelCost = months.reduce((a, m) => a + m.fuelCost, 0);
  const startYm = months[0].ym;
  const segs = d.seg.segments.filter((s) => s.date.slice(0, 7) >= startYm);
  const segAvg = segs.length ? segs.reduce((a, s) => a + s.dist, 0) / segs.reduce((a, s) => a + s.vol, 0) : 0;
  const effPts = d.seg.segments.slice(-10).map((s) => ({ x: `${Number(s.date.slice(5, 7))}/${Number(s.date.slice(8))}`, y: Math.round(s.eff * 10) / 10 }));
  const pricePts = months.filter((m) => m.avgUnitPrice > 0).map((m) => ({ x: `${Number(m.ym.slice(5))}월`, y: Math.round(m.avgUnitPrice) }));

  // 자주 간 주유소
  const stations = new Map<string, { n: number; cost: number; vol: number }>();
  d.fuelMine.filter((l) => l.date.slice(0, 7) >= startYm && l.stationName && l.stationName !== '주유소').forEach((l) => {
    const s = stations.get(l.stationName) ?? { n: 0, cost: 0, vol: 0 };
    s.n++;
    s.cost += l.totalPrice || 0;
    s.vol += l.volume || 0;
    stations.set(l.stationName, s);
  });
  const topStations = [...stations.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 3);

  const maintBy = new Map<string, number>();
  ledger.maint.filter((m) => m.vehicleId === v.id && m.date.slice(0, 7) >= startYm).forEach((m) => {
    const k = m.itemName || MAINT_LABEL[m.category];
    maintBy.set(k, (maintBy.get(k) ?? 0) + (m.cost || 0));
  });
  const topMaint = [...maintBy.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div className="grid">
      <div className="card wide" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px' }}>
        <b style={{ fontSize: 14 }}>기간</b>
        <div className="seg">
          <button className={span === 6 ? 'on' : ''} onClick={() => setSpan(6)}>
            6개월
          </button>
          <button className={span === 12 ? 'on' : ''} onClick={() => setSpan(12)}>
            12개월
          </button>
        </div>
      </div>

      <div className="hero">
        <span className="label">최근 {span}개월 차량비</span>
        <div className="num-hero">
          {fmt(total)}
          <span className="unit">원</span>
        </div>
        <div className="delta">월평균 {fmt(total / span)}원</div>
      </div>

      <div className="card wide">
        <div className="card-title">
          월별 지출 <small>막대를 누르면 그 달 내역</small>
        </div>
        <CostBars months={months} sel={sel} onSel={setSel} />
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
        <div style={{ marginTop: 10, background: 'var(--surface-100)', borderRadius: 12, padding: '4px 12px' }}>
          <div className="kv">
            <span>{ymLabel(selSum.ym)} 합계</span>
            <b>{fmt(selSum.total)}원</b>
          </div>
          <div className="kv">
            <span>주유 {selSum.fuelCount}회</span>
            <b>{fmt(selSum.fuelCost)}원</b>
          </div>
          <div className="kv">
            <span>정비 {selSum.maintCount}건</span>
            <b>{fmt(selSum.maintCost)}원</b>
          </div>
          <div className="kv">
            <span>기타 {selSum.otherCount}건</span>
            <b>{fmt(selSum.otherCost)}원</b>
          </div>
        </div>
      </div>

      <div className="card">
        <span className="label">평균 실연비</span>
        <div className="num-card">
          {segAvg ? fmt(segAvg, 1) : '-'}
          <span className="unit">{effUnit(v)}</span>
        </div>
        <div className="sub">가득 주유 {segs.length}구간</div>
      </div>
      <div className="card">
        <span className="label">km당 비용</span>
        <div className="num-card">
          {dist ? fmt(total / dist) : '-'}
          <span className="unit">원</span>
        </div>
        <div className="sub">{fmt(dist)}km 주행</div>
      </div>
      <div className="card">
        <span className="label">한 달 주유</span>
        <div className="num-card">
          {fmt(fuelCount / span, 1)}
          <span className="unit">회</span>
        </div>
        <div className="sub">총 {fuelCount}회</div>
      </div>
      <div className="card">
        <span className="label">주유 1회 평균</span>
        <div className="num-card">
          {fuelCount ? wonShort(fuelCost / fuelCount) : '-'}
          <span className="unit">원</span>
        </div>
        <div className="sub">주유비 {wonShort(fuelCost)}원</div>
      </div>

      <div className="card wide">
        <div className="card-title">
          실연비 추이 <small>최근 가득 주유 {effPts.length}번</small>
        </div>
        {effPts.length >= 1 ? (
          <LineChart pts={effPts} refValue={v.officialEfficiency || undefined} label="실연비 추이" />
        ) : (
          <div className="empty">가득 주유를 두 번 이상 기록하면 그래프가 나와요.</div>
        )}
      </div>

      <div className="card wide">
        <div className="card-title">
          내가 넣은 기름값 <small>월 평균 원/{unitOf(v)}</small>
        </div>
        {pricePts.length >= 1 ? <LineChart pts={pricePts} digits={0} label="월별 평균 단가" /> : <div className="empty">주유 기록이 없어요.</div>}
      </div>

      {topStations.length > 0 && (
        <div className="card wide">
          <div className="card-title">자주 간 주유소</div>
          {topStations.map(([name, s]) => (
            <div key={name} className="kv">
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{name}</span>
              <span style={{ whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: 13 }}>
                {s.n}회 · 평균 <b>{s.vol ? fmt(s.cost / s.vol) : '-'}</b>원
              </span>
            </div>
          ))}
        </div>
      )}

      {topMaint.length > 0 && (
        <div className="card wide">
          <div className="card-title">정비 항목별 지출</div>
          {topMaint.map(([name, cost]) => (
            <div key={name} className="kv">
              <span>{name}</span>
              <b>{fmt(cost)}원</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
