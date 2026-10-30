import { useLayoutEffect, useRef, useState } from "react";
export function ChatComposer({
  disabled,
  onSend,
  onResize,
}: {
  disabled: boolean;
  onSend: (text: string) => void;
  onResize?: () => void;
}) {
  const [value, setValue] = useState("");
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
        if (!value.trim() || disabled) return;
        onSend(value.trim());
        setValue("");
      }}
    >
      <div>
        <textarea
          ref={textareaRef}
          aria-label="AI에게 질문"
          rows={1}
          placeholder={
            disabled
              ? "제출이 완료되어 대화할 수 없습니다."
              : "질문할 내용을 입력하세요."
          }
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          type="submit"
          aria-label="질문 전송"
          disabled={disabled || !value.trim()}
        >
          <img src="/student-assets/send.svg" width="38" height="38" alt="" />
        </button>
      </div>
    </form>
  );
}
