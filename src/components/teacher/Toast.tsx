import { useEffect, useRef, useState } from "react";
import "./teacher.css";

// 화면 오른쪽 아래에 잠깐 떴다가 사라지는 안내입니다.
export function Toast({
  message,
  onClose,
  duration = 4500,
  tone = "error",
}: {
  message: string;
  onClose?: () => void;
  duration?: number;
  tone?: "error" | "info";
}) {
  const [hiddenFor, setHiddenFor] = useState("");
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  // 메시지가 비면 닫힘 기록을 지워, 같은 문구가 다시 와도 새로 뜨게 한다.
  useEffect(() => {
    if (!message) setHiddenFor("");
  }, [message]);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => {
      setHiddenFor(message);
      closeRef.current?.();
    }, duration);
    return () => window.clearTimeout(timer);
  }, [message, duration]);
  if (!message || hiddenFor === message) return null;
  return (
    <div className={`teacher-toast teacher-toast--${tone}`} role="status" aria-live="polite">
      <span>{message}</span>
      <button
        type="button"
        aria-label="안내 닫기"
        onClick={() => {
          setHiddenFor(message);
          closeRef.current?.();
        }}
      >
        ×
      </button>
    </div>
  );
}
