// ═════════════════════════════════════════════════════════════
// useWatermark — 로고 설정을 불러오고 저장하는 훅
// 설정은 폰 저장소(IndexedDB)에 남아서 앱을 다시 열어도 유지됩니다.
// ═════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from 'react';
import { getSetting, setSetting } from '../lib/photoStore';
import { DEFAULT_WATERMARK, isWatermarkActive } from '../lib/watermark';

const KEY = 'watermark';

export function useWatermark() {
  // settings 안의 logo는 Blob(파일). 화면용 주소와 <img>는 따로 만듭니다.
  const [settings, setSettings] = useState(DEFAULT_WATERMARK);
  const [logoImg, setLogoImg] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);

  // 앱 시작 시 저장된 설정 불러오기
  useEffect(() => {
    getSetting(KEY)
      .then((saved) => saved && setSettings({ ...DEFAULT_WATERMARK, ...saved }))
      .catch(() => {});
  }, []);

  // 로고 파일(Blob)이 바뀌면 화면용 주소와 <img> 다시 만들기
  useEffect(() => {
    if (!settings.logo) {
      setLogoImg(null);
      setLogoUrl(null);
      return;
    }
    const url = URL.createObjectURL(settings.logo);
    const img = new Image();
    img.onload = () => setLogoImg(img);
    img.src = url;
    setLogoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [settings.logo]);

  /** 설정 일부 바꾸기 + 저장. 예) update({ position: 'tl' }) */
  const update = useCallback((changes) => {
    setSettings((prev) => {
      const next = { ...prev, ...changes };
      setSetting(KEY, next).catch(() => {});
      return next;
    });
  }, []);

  /** 로고 이미지 등록 (투명 배경 PNG 추천). 너무 크면 1000px로 줄여 저장 */
  const setLogoFile = useCallback(
    async (file) => {
      if (!file) return;
      const blob = await shrinkLogo(file);
      update({ logo: blob, type: 'image', enabled: true });
    },
    [update]
  );

  return {
    settings,
    logoImg,
    logoUrl,
    update,
    setLogoFile,
    active: isWatermarkActive(settings, logoImg),
  };
}

/** 로고가 크면 긴 변 1000px로 줄임 (PNG 유지 → 투명 배경 보존) */
async function shrinkLogo(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, 1000 / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale === 1 && file.type === 'image/png') return file;
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((resolve) => c.toBlob(resolve, 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}
