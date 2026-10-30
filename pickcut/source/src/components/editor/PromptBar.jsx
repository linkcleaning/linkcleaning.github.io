// ═════════════════════════════════════════════════════════════
// PromptBar — 인스타그램 스토리의 '메시지 보내기'처럼 생긴 하단 입력창
//   [ 🎤 ] [ 어떻게 바꿔볼까요?            ] [ ↑ ]
// 음성 입력: 브라우저가 지원하면(안드로이드 크롬, 아이폰 사파리 14.5+) 마이크 버튼 표시
// ═════════════════════════════════════════════════════════════
import { useRef, useState } from 'react';

// 음성 인식 기능이 있는지 확인 (브라우저마다 이름이 달라서 둘 다 확인)
const SpeechRecognition =
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

export default function PromptBar({ onSubmit, disabled }) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  const send = (value = text) => {
    const v = value.trim();
    if (!v || disabled) return;
    if (onSubmit(v)) setText(''); // 성공했을 때만 입력창 비움 (실패하면 고쳐 쓸 수 있게)
  };

  const toggleVoice = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'ko-KR';
    rec.interimResults = true; // 말하는 중에도 글자가 실시간으로 보임
    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join('');
      setText(transcript);
      // 말이 끝나면(isFinal) 바로 실행
      if (e.results[e.results.length - 1].isFinal) send(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault(); // 페이지 새로고침 막기
        send();
      }}
      className="flex items-center gap-2"
    >
      {SpeechRecognition && (
        <button
          type="button"
          onClick={toggleVoice}
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition
            ${listening ? 'animate-pulse border-mark bg-mark text-ink' : 'border-white/30 text-white'}`}
          aria-label={listening ? '음성 입력 중지' : '음성으로 말하기'}
        >
          <MicIcon />
        </button>
      )}

      <div className="flex h-11 flex-1 items-center rounded-full border border-white/30 bg-black/40 pl-4 pr-1 backdrop-blur-md focus-within:border-white/70">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={listening ? '듣고 있어요…' : '어떻게 바꿔볼까요? 예) 배경 흐리게'}
          enterKeyHint="send" // 모바일 키보드의 엔터 키를 '보내기'로 표시
          // 글자 크기 16px(text-base) 이상이어야 아이폰이 입력할 때 화면을 확대하지 않습니다
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-white/50"
        />
        <button
          type="submit"
          disabled={!text.trim() || disabled}
          className="grid h-9 w-9 place-items-center rounded-full bg-mark text-ink transition disabled:bg-white/15 disabled:text-white/40"
          aria-label="편집 실행"
        >
          <ArrowUpIcon />
        </button>
      </div>
    </form>
  );
}

const MicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
const ArrowUpIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);
