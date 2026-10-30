// ═════════════════════════════════════════════════════════════
// App — 화면 전환을 담당하는 최상위 컴포넌트
//
// 화면이 2개뿐이라 라우터(react-router) 없이 state 하나로 전환합니다.
// 화면이 늘어나면(설정, 앨범 등) react-router-dom 도입을 추천합니다.
//
// 사진 목록(library)은 여기서 만들어 갤러리에 내려줍니다.
// → 편집 화면에 다녀와도 갤러리의 사진·분석 결과가 그대로 유지됩니다.
// ═════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { usePhotoLibrary } from './hooks/usePhotoLibrary';
import { useWatermark } from './hooks/useWatermark';
import SmartGallery from './components/gallery/SmartGallery';
import PromptEditor from './components/editor/PromptEditor';
import { createSamplePhotos } from './lib/samplePhotos';

// demo = true 이면 시작하자마자 샘플 사진을 불러옵니다(시연·미리보기용)
export default function App({ demo = false }) {
  const library = usePhotoLibrary();
  const watermark = useWatermark(); // 로고 설정 (갤러리 내보내기·편집 저장에서 함께 씀)
  const [editingPhoto, setEditingPhoto] = useState(null); // null이면 갤러리 화면

  // 저장된 사진을 다 불러온 뒤, 하나도 없을 때만 샘플을 넣음(다시 열 때 중복 방지)
  useEffect(() => {
    if (!demo || !library.loaded || library.photos.length > 0) return;
    let cancelled = false;
    createSamplePhotos().then((files) => !cancelled && library.addFiles(files));
    return () => { cancelled = true; }; // StrictMode에서 두 번 실행되는 것 방지
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, library.loaded]);

  // 안드로이드 '뒤로 가기' 버튼으로 편집 화면을 닫을 수 있게 브라우저 기록 활용
  useEffect(() => {
    const onPop = () => setEditingPhoto(null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openEditor = (photo) => {
    window.history.pushState({ editor: true }, '');
    setEditingPhoto(photo);
  };
  const closeEditor = () => window.history.back(); // popstate가 화면을 닫아줌

  return (
    // h-[100dvh]: 모바일 주소창 높이 변화에도 화면이 딱 맞게
    // max-w-md: PC에서 열어도 폰 크기로 가운데 표시
    <div className="mx-auto h-[100dvh] max-w-md overflow-hidden">
      {editingPhoto ? (
        <PromptEditor photo={editingPhoto} watermark={watermark} onBack={closeEditor} />
      ) : (
        <SmartGallery library={library} watermark={watermark} onOpenEditor={openEditor} />
      )}
    </div>
  );
}
