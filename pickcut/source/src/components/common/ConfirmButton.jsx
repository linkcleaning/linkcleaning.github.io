// ═════════════════════════════════════════════════════════════
// ConfirmButton — 실수로 지우지 않도록 '두 번 눌러야' 실행되는 버튼
// 첫 번째: 문구가 '한 번 더 누르면 …'으로 바뀜 → 3초 안에 다시 누르면 실행
// (앱 화면 안에서 확인하므로 팝업 창이 필요 없음)
// ═════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';

export default function ConfirmButton({ label, confirmLabel, onConfirm, className = '', disabled }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      disabled={disabled}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
      className={`w-full rounded-2xl px-4 py-3 text-sm font-bold transition active:opacity-80 disabled:opacity-40
        ${armed ? 'bg-warn text-ink' : 'border border-line bg-panel text-white'} ${className}`}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
