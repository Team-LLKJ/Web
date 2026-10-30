export function ChatComposer({
  disabled,
  value,
  onValueChange,
  busy = false,
  disabledReason = "현재 질문을 보낼 수 없습니다.",
  onSend,
}: {
  disabled: boolean;
  value: string;
  onValueChange: (value: string) => void;
  busy?: boolean;
  disabledReason?: string;
  onSend: (text: string) => void;
}) {
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
        <input
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
