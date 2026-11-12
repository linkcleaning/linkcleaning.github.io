import type { SVGProps } from 'react';

const S = ({ children, size = 20, ...p }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    {children}
  </svg>
);
type P = SVGProps<SVGSVGElement> & { size?: number };

export const IFuel = (p: P) => (
  <S {...p}>
    <path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16" />
    <path d="M3 21h13" />
    <path d="M7 8h5" />
    <path d="M15 10h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V9l-3-3" />
  </S>
);
export const IWrench = (p: P) => (
  <S {...p}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" />
  </S>
);
export const IReceipt = (p: P) => (
  <S {...p}>
    <path d="M5 3v18l2.5-1.5L10 21l2-1.5 2 1.5 2.5-1.5L19 21V3l-2.5 1.5L14 3l-2 1.5L10 3 7.5 4.5z" />
    <path d="M9 9h6M9 13h6" />
  </S>
);
export const IHome = (p: P) => (
  <S {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9v12h14V9" />
    <path d="M10 21v-6h4v6" />
  </S>
);
export const IList = (p: P) => (
  <S {...p}>
    <path d="M9 6h12M9 12h12M9 18h12" />
    <circle cx="4" cy="6" r="1" />
    <circle cx="4" cy="12" r="1" />
    <circle cx="4" cy="18" r="1" />
  </S>
);
export const IChart = (p: P) => (
  <S {...p}>
    <path d="M3 21h18" />
    <rect x="5" y="11" width="3" height="7" rx="1" />
    <rect x="10.5" y="6" width="3" height="12" rx="1" />
    <rect x="16" y="13" width="3" height="5" rx="1" />
  </S>
);
export const ICar = (p: P) => (
  <S {...p}>
    <path d="M5 17H3v-5l2-5h14l2 5v5h-2" />
    <path d="M3 12h18" />
    <circle cx="7.5" cy="17" r="2" />
    <circle cx="16.5" cy="17" r="2" />
    <path d="M9.5 17h5" />
  </S>
);
export const IPlus = (p: P) => (
  <S {...p}>
    <path d="M12 5v14M5 12h14" />
  </S>
);
export const IX = (p: P) => (
  <S {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </S>
);
export const ILeft = (p: P) => (
  <S {...p}>
    <path d="m15 6-6 6 6 6" />
  </S>
);
export const IRight = (p: P) => (
  <S {...p}>
    <path d="m9 6 6 6-6 6" />
  </S>
);
export const IDown = (p: P) => (
  <S {...p}>
    <path d="m6 9 6 6 6-6" />
  </S>
);
export const IPin = (p: P) => (
  <S {...p}>
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </S>
);
export const ICheck = (p: P) => (
  <S {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </S>
);
export const ITrash = (p: P) => (
  <S {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </S>
);
export const ICamera = (p: P) => (
  <S {...p}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </S>
);
export const IUpload = (p: P) => (
  <S {...p}>
    <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
  </S>
);
export const IDownload = (p: P) => (
  <S {...p}>
    <path d="M12 4v12M7 11l5 5 5-5M4 20h16" />
  </S>
);
export const IGauge = (p: P) => (
  <S {...p}>
    <path d="M4 18a8 8 0 1 1 16 0" />
    <path d="m12 14 4-5" />
  </S>
);
export const IReset = (p: P) => (
  <S {...p}>
    <path d="M4 12a8 8 0 1 0 2.5-5.8L4 8.5" />
    <path d="M4 4v4.5h4.5" />
  </S>
);
export const IKindIcon = ({ kind, size = 18 }: { kind: 'fuel' | 'maint' | 'other'; size?: number }) =>
  kind === 'fuel' ? <IFuel size={size} /> : kind === 'maint' ? <IWrench size={size} /> : <IReceipt size={size} />;
