import { useEffect, useMemo, useRef, useState } from 'react';
import { FUEL_LABEL, type FuelType } from '../types';
import { findStations, fmtDist, getPosition, loadLeaflet, type Pos, type Station } from '../stations';
import { Sheet } from './common';
import { fmt } from '../calc';

export interface Picked { name: string; address?: string; lat?: number; lng?: number; price?: number }

export function StationPicker({ fuelType, recent, onPick, onClose }: { fuelType: FuelType; recent: Picked[]; onPick: (p: Picked) => void; onClose: () => void }) {
  const place = fuelType === 'electric' ? '충전소' : fuelType === 'lpg' ? 'LPG 충전소' : '주유소';
  const [state, setState] = useState<'loading' | 'ok' | 'denied' | 'error'>('loading');
  const [pos, setPos] = useState<Pos | null>(null);
  const [list, setList] = useState<Station[]>([]);
  const [sort, setSort] = useState<'dist' | 'price'>('dist');
  const [manual, setManual] = useState('');
  const mapEl = useRef<HTMLDivElement>(null);

  const load = async () => {
    setState('loading');
    try {
      const p = await getPosition();
      setPos(p);
      const l = await findStations(p, fuelType);
      setList(l.slice(0, 40));
      setState('ok');
    } catch (e) {
      setState((e as Error).message === 'DENIED' ? 'denied' : 'error');
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasPrice = list.some((s) => s.price);
  const cheapest = hasPrice ? Math.min(...list.filter((s) => s.price).map((s) => s.price as number)) : 0;
  const shown = useMemo(() => {
    const l = list.slice();
    if (sort === 'price' && hasPrice) l.sort((a, b) => (a.price || 1e9) - (b.price || 1e9));
    return l.slice(0, 20);
  }, [list, sort, hasPrice]);

  // 지도
  useEffect(() => {
    if (state !== 'ok' || !pos || !mapEl.current) return;
    let map: { remove: () => void } | null = null;
    let alive = true;
    loadLeaflet()
      .then((L) => {
        if (!alive || !mapEl.current) return;
        const m = L.map(mapEl.current, { zoomControl: false, attributionControl: true }).setView([pos.lat, pos.lng], 14);
        map = m;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
        L.circleMarker([pos.lat, pos.lng], { radius: 8, color: '#fff', weight: 3, fillColor: '#d9691f', fillOpacity: 1 }).addTo(m);
        const pts: [number, number][] = [[pos.lat, pos.lng]];
        shown.slice(0, 12).forEach((s) => {
          pts.push([s.lat, s.lng]);
          const label = s.price ? `${fmt(s.price)}` : '';
          L.marker([s.lat, s.lng], {
            icon: L.divIcon({
              className: '',
              html: `<div style="transform:translate(-50%,-100%);background:${s.price && s.price === cheapest ? '#d9691f' : '#0e5a60'};color:#fff;border-radius:10px;padding:3px 7px;font:700 11px system-ui;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.25)">${label || (fuelType === 'electric' ? '충전' : '주유')}</div>`,
            }),
          })
            .addTo(m)
            .on('click', () => onPick(toPicked(s)));
        });
        if (pts.length > 1) m.fitBounds(pts.slice(0, 7), { padding: [24, 24], maxZoom: 15 });
      })
      .catch(() => {
        /* 지도 없이 목록만 */
      });
    return () => {
      alive = false;
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, pos, shown]);

  const toPicked = (s: Station): Picked => ({ name: s.name, address: [s.brand, s.address].filter(Boolean).join(' · ') || undefined, lat: s.lat, lng: s.lng, price: s.price ?? undefined });

  return (
    <Sheet title={`${place} 고르기`} sub={hasPrice ? `오늘 ${FUEL_LABEL[fuelType]} 가격 · 오피넷` : '현재 위치에서 가까운 순'} onClose={onClose}>
      {state === 'loading' && <div className="card empty">내 위치에서 {place}를 찾는 중…</div>}
      {state === 'denied' && (
        <div className="card empty">
          위치 권한이 꺼져 있어요.
          <br />
          설정 → 개인정보 보호 → 위치 서비스에서 허용하거나, 아래에서 직접 입력하세요.
        </div>
      )}
      {state === 'error' && (
        <div className="card empty">
          {place}를 불러오지 못했어요. 인터넷을 확인해 주세요.
          <div style={{ marginTop: 10 }}>
            <button className="btn ghost small" onClick={load}>
              다시 찾기
            </button>
          </div>
        </div>
      )}
      {state === 'ok' && (
        <>
          <div className="map" ref={mapEl} />
          {hasPrice && (
            <div className="seg" style={{ alignSelf: 'flex-start' }}>
              <button className={sort === 'dist' ? 'on' : ''} onClick={() => setSort('dist')}>
                가까운 순
              </button>
              <button className={sort === 'price' ? 'on' : ''} onClick={() => setSort('price')}>
                싼 순
              </button>
            </div>
          )}
          <div className="card" style={{ padding: '4px 14px' }}>
            {shown.length === 0 && <div className="empty">근처 5km 안에 {place}가 없어요.</div>}
            <div className="rows">
              {shown.map((s, i) => (
                <button key={s.id} className="row" onClick={() => onPick(toPicked(s))}>
                  <div className="row-main">
                    <div className="row-title">{s.name}</div>
                    <div className="row-sub">
                      {[sort === 'dist' && i === 0 ? '가장 가까움' : null, fmtDist(s.dist), s.brand && !s.name.includes(s.brand) ? s.brand : null].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  {s.price ? (
                    <div style={{ textAlign: 'right' }}>
                      <div className="price">
                        {fmt(s.price)}
                        <span className="unit">원</span>
                      </div>
                      {s.price === cheapest && <span className="badge hot">최저가</span>}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
          <p className="hint">{list[0]?.source === 'opinet' ? '주유소·가격 정보: 오피넷(한국석유공사)' : '위치 정보: OpenStreetMap 기여자 · 가격 정보 없음'}</p>
        </>
      )}

      {recent.length > 0 && (
        <>
          <div className="section-title" style={{ margin: '8px 4px 0' }}>
            최근 간 곳
          </div>
          <div className="chips">
            {recent.map((r) => (
              <button key={r.name} className="chip" onClick={() => onPick(r)}>
                {r.name}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="field">
        <span>직접 입력</span>
        <div className="with-unit">
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder={`${place} 이름`} />
          <button className="btn primary small" style={{ flex: 'none' }} disabled={!manual.trim()} onClick={() => onPick({ name: manual.trim() })}>
            확인
          </button>
        </div>
      </div>
    </Sheet>
  );
}
