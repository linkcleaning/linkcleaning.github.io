import { useEffect, useState, type ReactNode } from 'react';
import { IReset, IX } from './icons';

export function Sheet({ title, sub, onClose, children, foot }: { title: string; sub?: string; onClose: () => void; children: ReactNode; foot?: ReactNode }) {
  useEffect(() => {
    document.body.classList.add('locked');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      setTimeout(() => {
        if (!document.querySelector('.dim')) document.body.classList.remove('locked');
      }, 0);
    };
  }, [onClose]);
  return (
    <div className="dim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div style={{ minWidth: 0 }}>
            <h2>{title}</h2>
            {sub && <p>{sub}</p>}
          </div>
          <button className="x" onClick={onClose} aria-label="닫기">
            <IX size={18} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {foot && <div className="sheet-foot">{foot}</div>}
      </div>
    </div>
  );
}

const toNum = (s: string) => {
  const n = Number(s.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const show = (n: number | '', digits: number) => (n === '' ? '' : digits ? String(n) : n.toLocaleString('ko-KR'));

/** 숫자 칸: 금액은 쉼표, 소수 허용 칸은 그대로 */
export function NumField({
  label, unit, value, onChange, placeholder, big, decimal, tag, autoFocus,
}: {
  label: string; unit?: string; value: number | ''; onChange: (v: number | '') => void; placeholder?: string; big?: boolean; decimal?: boolean; tag?: ReactNode; autoFocus?: boolean;
}) {
  const [text, setText] = useState(show(value, decimal ? 1 : 0));
  useEffect(() => {
    const cur = text === '' ? '' : toNum(text);
    if (cur !== value) setText(show(value, decimal ? 1 : 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <label className={`field${big ? ' big' : ''}`}>
      <span>
        {label}
        {tag}
      </span>
      <div className="with-unit">
        <input
          inputMode={decimal ? 'decimal' : 'numeric'}
          value={text}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(e) => {
            let t = e.target.value.replace(decimal ? /[^\d.]/g : /[^\d]/g, '');
            if (decimal) t = t.replace(/(\..*)\./g, '$1');
            if (!decimal && t) t = Number(t).toLocaleString('ko-KR');
            setText(t);
            onChange(t === '' ? '' : toNum(t));
          }}
        />
        {unit && <em>{unit}</em>}
      </div>
    </label>
  );
}

export function TextField({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function Toggle({ on, onChange, title, desc }: { on: boolean; onChange: (v: boolean) => void; title: string; desc?: string }) {
  return (
    <button type="button" className="toggle" onClick={() => onChange(!on)} role="switch" aria-checked={on}>
      <div>
        <b>{title}</b>
        {desc && <small>{desc}</small>}
      </div>
      <i className={`sw${on ? ' on' : ''}`} />
    </button>
  );
}

/** 두 번 눌러야 동작 (실수 방지) */
export function TwoTap({ label, armedLabel, onConfirm, className = 'clear', icon = true }: { label: string; armedLabel: string; onConfirm: () => void; className?: string; icon?: boolean }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      className={`${className}${armed ? ' armed' : ''}`}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {icon && <IReset size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />}
      {armed ? armedLabel : label}
    </button>
  );
}
