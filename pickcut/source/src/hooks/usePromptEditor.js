// ═════════════════════════════════════════════════════════════
// usePromptEditor — 프롬프트 편집 화면의 상태와 동작
//
// 기록(history) 구조: 명령을 실행할 때마다 한 칸씩 쌓입니다.
//   [ {prompt:'배경 흐리게', ops:[...], labels:['배경 흐림']}, ... ]
// 화면에 보이는 결과 = 원본 + history의 모든 ops
// → Undo = 마지막 칸 하나 지우고 다시 그리기
// ═════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState } from 'react';
import { parsePrompt } from '../lib/promptParser';
import { canvasToUrl, renderEdits } from '../lib/editEngine';
import { renderForExport } from '../lib/watermark';
import { exportFileName, shareOrDownload } from '../lib/exporter';

/**
 * @param photo      편집할 사진
 * @param watermark  useWatermark()의 결과 (저장할 때 로고 넣기)
 */
export function usePromptEditor(photo, watermark) {
  const [history, setHistory] = useState([]);
  const [resultUrl, setResultUrl] = useState(null); // 편집 결과 이미지 주소
  const [busy, setBusy] = useState(false);          // 편집 중 표시
  const [message, setMessage] = useState(null);     // 화면 위 안내 문구(토스트)
  const [sourceImg, setSourceImg] = useState(null); // 원본 <img> (한 번만 불러옴)
  const renderIdRef = useRef(0);                    // 오래된 결과가 늦게 도착해 덮어쓰는 것 방지
  const lastUrlRef = useRef(null);                  // 이전 결과 주소(메모리 해제용)

  // 새 결과를 화면에 올리고, 이전 결과 주소는 메모리에서 해제
  const showResult = useCallback((url) => {
    const old = lastUrlRef.current;
    lastUrlRef.current = url;
    setResultUrl(url);
    if (old) setTimeout(() => URL.revokeObjectURL(old), 1000);
  }, []);

  // 원본 사진 불러오기
  useEffect(() => {
    if (!photo) return;
    setSourceImg(null);
    setHistory([]);
    const img = new Image();
    img.onload = () => setSourceImg(img);
    img.src = photo.url;
  }, [photo]);

  // 기록이나 원본이 바뀔 때마다 다시 그리기
  useEffect(() => {
    if (!sourceImg) return;
    if (history.length === 0) {
      renderIdRef.current++; // 진행 중이던 편집 결과가 늦게 와도 무시되게
      showResult(null); // 기록이 없으면 원본 그대로
      setBusy(false);
      return;
    }
    const myId = ++renderIdRef.current;
    setBusy(true);
    (async () => {
      const allOps = history.flatMap((h) => h.ops);
      const canvas = await renderEdits(sourceImg, allOps);
      const url = await canvasToUrl(canvas);
      if (myId === renderIdRef.current) {
        showResult(url);
        setBusy(false);
      } else {
        URL.revokeObjectURL(url); // 더 최신 요청이 있으면 이 결과는 버림
      }
    })();
  }, [history, sourceImg, showResult]);

  // 안내 문구는 2.4초 뒤 자동으로 사라짐
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 2400);
    return () => clearTimeout(t);
  }, [message]);

  /** 프롬프트 실행: 문장 → 해석 → 기록에 추가 */
  const submit = useCallback((prompt) => {
    const parsed = parsePrompt(prompt);
    if (parsed.reset) {
      setHistory([]);
      setMessage({ type: 'info', text: '원본으로 되돌렸어요' });
      return true;
    }
    if (!parsed.understood) {
      setMessage({ type: 'error', text: '아직 이해하지 못한 표현이에요. 아래 추천 문장을 눌러보세요' });
      return false;
    }
    setHistory((prev) => [...prev, { id: Date.now(), prompt, ops: parsed.ops, labels: parsed.labels }]);
    setMessage({ type: 'ok', text: `적용: ${parsed.labels.join(' · ')}` });
    return true;
  }, []);

  /** 마지막 편집 취소 */
  const undo = useCallback(() => setHistory((prev) => prev.slice(0, -1)), []);

  /** 특정 편집 하나만 빼기 (기록 칩의 × 버튼) */
  const removeStep = useCallback((id) => setHistory((prev) => prev.filter((h) => h.id !== id)), []);

  // ── 저장용 파일 미리 만들어두기 ──
  // 아이폰은 '저장' 버튼을 누른 직후에만 공유 시트를 열어주므로,
  // 로고 합성 같은 시간이 걸리는 작업은 편집 결과가 바뀔 때마다 미리 해둡니다.
  const exportFileRef = useRef(null);
  useEffect(() => {
    const url = resultUrl || photo?.url;
    if (!url) return;
    let cancelled = false;
    exportFileRef.current = null;
    renderForExport(url, watermark?.settings, watermark?.logoImg)
      .then((blob) => {
        if (!cancelled) exportFileRef.current = new File([blob], exportFileName(0), { type: 'image/jpeg' });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [resultUrl, photo, watermark?.settings, watermark?.logoImg]);

  /** 결과 저장: 폰에서는 공유 시트(사진 앱에 저장), PC에서는 다운로드. 로고 설정이 켜져 있으면 로고 포함 */
  const save = useCallback(async () => {
    let file = exportFileRef.current;
    if (!file) {
      // 아직 준비 전이면 지금 만듦 (아이폰에서는 공유 대신 다운로드로 넘어갈 수 있음)
      const blob = await renderForExport(resultUrl || photo.url, watermark?.settings, watermark?.logoImg);
      file = new File([blob], exportFileName(0), { type: 'image/jpeg' });
    }
    const outcome = await shareOrDownload([file]);
    if (outcome !== 'cancelled') {
      setMessage({ type: 'ok', text: watermark?.active ? '로고를 넣어 저장했어요' : '저장했어요' });
    }
  }, [resultUrl, photo, watermark]);

  return { history, resultUrl, busy, ready: !!sourceImg, message, submit, undo, removeStep, save };
}
