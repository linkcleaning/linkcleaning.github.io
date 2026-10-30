// ═════════════════════════════════════════════════════════════
// WatermarkSheet — 로고·워터마크 설정 시트
//
// 위: 미리보기(실제 사진 위에 로고가 어떻게 들어가는지)
// 아래: 켜기 · 종류(로고 그림/글자) · 위치 · 크기 · 진하기
// 바꾸는 즉시 저장되고 미리보기에 반영됩니다.
// ═════════════════════════════════════════════════════════════
import { useEffect, useRef } from 'react';
import { drawWatermark } from '../../lib/watermark';

const POSITIONS = [
  { key: 'tl', label: '왼쪽 위' },
  { key: 'tr', label: '오른쪽 위' },
  { key: 'bl', label: '왼쪽 아래' },
  { key: 'br', label: '오른쪽 아래' },
];
const SIZES = [
  { key: 's', label: '작게' },
  { key: 'm', label: '보통' },
  { key: 'l', label: '크게' },
];
const STRENGTHS = [
  { key: 'solid', label: '진하게' },
  { key: 'soft', label: '은은하게' },
];

export default function WatermarkSheet({ watermark, previewUrl, onClose }) {
  const { settings, logoImg, logoUrl, update, setLogoFile } = watermark;
  const canvasRef = useRef(null);
  const fileRef = useRef(null);

  // 설정이 바뀔 때마다 미리보기 다시 그리기
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const paint = (img) => {
      ctx.clearRect(0, 0, W, H);
      if (img) {
        // 사진을 미리보기 칸에 꽉 차게 (가운데 기준 자르기)
        const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
        const dw = img.naturalWidth * s;
        const dh = img.naturalHeight * s;
        ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      } else {
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#5b6b7a');
        g.addColorStop(1, '#c9a27e');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      drawWatermark(ctx, W, H, { ...settings, enabled: true }, logoImg);
    };
    if (!previewUrl) return paint(null);
    const img = new Image();
    img.onload = () => paint(img);
    img.onerror = () => paint(null);
    img.src = previewUrl;
  }, [settings, logoImg, previewUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={onClose}>
      <div
        className="pb-safe max-h-[94dvh] w-full overflow-y-auto rounded-t-3xl bg-panel p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">로고 넣기</h2>
          {/* 켜기/끄기 스위치 */}
          <button
            role="switch"
            aria-checked={settings.enabled}
            onClick={() => update({ enabled: !settings.enabled })}
            className={`relative h-7 w-12 rounded-full transition ${settings.enabled ? 'bg-mark' : 'bg-white/20'}`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${settings.enabled ? 'left-6' : 'left-1'}`}
            />
            <span className="sr-only">저장할 때 로고 넣기</span>
          </button>
        </div>
        <p className="mb-3 text-xs text-white/50">
          켜두면 사진을 저장·내보낼 때 자동으로 로고가 들어가요. 앱 안의 사진에는 넣지 않아요.
        </p>

        {/* 미리보기 */}
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className={`mb-4 w-full rounded-2xl ${settings.enabled ? '' : 'opacity-40'}`}
          aria-label="로고 미리보기"
        />

        <div className={`grid gap-4 ${settings.enabled ? '' : 'pointer-events-none opacity-40'}`}>
          {/* 종류 */}
          <Field label="종류">
            <Segment
              options={[
                { key: 'image', label: '로고 그림' },
                { key: 'text', label: '글자' },
              ]}
              value={settings.type}
              onChange={(type) => update({ type })}
            />
          </Field>

          {settings.type === 'image' ? (
            <Field label="로고 파일" hint="배경이 투명한 PNG가 가장 깔끔해요">
              <div className="flex items-center gap-3">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt="등록된 로고"
                    className="h-12 w-12 rounded-lg bg-[repeating-conic-gradient(#444_0_25%,#333_0_50%)] bg-[length:12px_12px] object-contain p-1"
                  />
                )}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="rounded-full border border-line px-4 py-2 text-sm font-semibold active:bg-white/10"
                >
                  {logoUrl ? '로고 바꾸기' : '로고 올리기'}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={(e) => {
                    setLogoFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </div>
            </Field>
          ) : (
            <Field label="글자" hint="예) 링크클린 · linkclean.co.kr · @크리머스">
              <input
                id="wm-text"
                value={settings.text}
                onChange={(e) => update({ text: e.target.value })}
                maxLength={30}
                placeholder="넣을 글자를 입력하세요"
                className="w-full rounded-xl border border-line bg-ink px-3 py-2.5 text-base outline-none focus:border-white/50"
              />
            </Field>
          )}

          {/* 위치: 사진 모서리 모양 그대로 2×2 */}
          <Field label="위치">
            <div className="grid grid-cols-2 gap-1.5">
              {POSITIONS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => update({ position: p.key })}
                  className={`rounded-xl py-2.5 text-sm font-semibold transition
                    ${settings.position === p.key ? 'bg-white text-ink' : 'bg-white/10 text-white/70'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="크기">
            <Segment options={SIZES} value={settings.size} onChange={(size) => update({ size })} />
          </Field>

          <Field label="진하기">
            <Segment options={STRENGTHS} value={settings.strength} onChange={(strength) => update({ strength })} />
          </Field>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-2xl bg-white/10 py-3.5 font-semibold active:bg-white/20"
        >
          완료
        </button>
      </div>
    </div>
  );
}

/** 항목 이름 + 내용 */
function Field({ label, hint, children }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">
        {label}
        {hint && <span className="ml-2 text-xs font-normal text-white/45">{hint}</span>}
      </p>
      {children}
    </div>
  );
}

/** 여러 개 중 하나 고르기 버튼 묶음 */
function Segment({ options, value, onChange }) {
  return (
    <div className="grid rounded-full bg-ink p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`rounded-full py-2 text-sm font-semibold transition
            ${value === o.key ? 'bg-white text-ink' : 'text-white/60'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
