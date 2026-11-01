import { useLayoutEffect, useRef } from "react";
export function ChatComposer({
  disabled,
  value,
  onValueChange,
  busy = false,
  disabledReason = "현재 질문을 보낼 수 없습니다.",
  onSend,
  onResize,
}: {
  disabled: boolean;
  value: string;
  onValueChange: (value: string) => void;
  busy?: boolean;
  disabledReason?: string;
  onSend: (text: string) => void;
  onResize?: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const previousHeight = textarea.clientHeight;
    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
    if (textarea.clientHeight !== previousHeight) onResize?.();
  }, [value, onResize]);
  return (
    <form
      className="student-chat-composer"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim() || disabled || busy) return;
        onSend(value.trim());
        onValueChange("");
      }}
    >
      <div>
        <textarea
          ref={textareaRef}
          rows={1}
          aria-label="AI에게 질문"
          placeholder={
            disabled
              ? disabledReason
              : busy
                ? "답변을 기다리는 동안 다음 질문을 작성하세요."
                : "질문할 내용을 입력하세요."
          }
          value={value}
          disabled={disabled}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter inserts a line break. Ignore Enter that confirms IME composition (Korean).
            if (e.key !== "Enter" || e.shiftKey) return;
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }}
        />
        <button
          type="submit"
          aria-label="질문 전송"
          disabled={disabled || busy || !value.trim()}
        >
          <img src="/student-assets/send.svg" width="38" height="38" alt="" />
        </button>
      </div>
    </form>
  );
}
