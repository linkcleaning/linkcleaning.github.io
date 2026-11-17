import { useState, type ReactNode } from 'react'

export function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="plate rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-head text-[17px] tracking-wide text-dw">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}

export function Toggle({ on, onChange, label, sub }: { on: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ${on ? 'border-dw/60 bg-dw/10' : 'border-iron bg-coal'}`}
    >
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-dw' : 'bg-iron'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-ink transition-all ${on ? 'left-[22px]' : 'left-0.5 bg-ash'}`} />
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold">{label}</span>
        {sub && <span className="block truncate text-xs text-ash">{sub}</span>}
      </span>
    </button>
  )
}

export function Field({
  label,
  hint,
  value,
  onChange,
  secret,
  placeholder,
  type = 'text',
}: {
  label: string
  hint?: ReactNode
  value: string
  onChange: (v: string) => void
  secret?: boolean
  placeholder?: string
  type?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-semibold text-bone/90">{label}</span>
      <div className="flex gap-2">
        <input
          type={secret && !show ? 'password' : type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl border border-iron bg-ink px-3 py-2.5 text-[15px] outline-none focus:border-dw"
        />
        {secret && (
          <button type="button" onClick={() => setShow(!show)} className="shrink-0 rounded-xl border border-iron px-3 text-xs text-ash">
            {show ? '숨김' : '보기'}
          </button>
        )}
      </div>
      {hint && <span className="mt-1 block text-xs leading-relaxed text-ash">{hint}</span>}
    </label>
  )
}

export function Btn({
  children,
  onClick,
  kind = 'ghost',
  disabled,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  kind?: 'main' | 'ghost' | 'dark' | 'danger'
  disabled?: boolean
  className?: string
}) {
  const k = {
    main: 'bg-dw text-ink font-bold active:bg-dw-deep',
    ghost: 'border border-iron bg-coal text-bone active:bg-steel',
    dark: 'bg-ink border border-dw/40 text-dw active:bg-coal',
    danger: 'border border-red-500/40 bg-red-500/10 text-red-300',
  }[kind]
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`rounded-xl px-3 py-3 text-[14px] transition disabled:opacity-40 ${k} ${className}`}>
      {children}
    </button>
  )
}

export function Spinner() {
  return <span className="spin inline-block h-4 w-4 rounded-full border-2 border-ink/30 border-t-ink align-[-2px]" />
}

export function Toast({ msg }: { msg: string | null }) {
  if (!msg) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-6">
      <div className="rounded-full bg-dw px-5 py-2.5 text-[14px] font-bold text-ink shadow-xl">{msg}</div>
    </div>
  )
}
