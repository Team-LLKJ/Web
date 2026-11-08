/** 비밀번호 입력칸 오른쪽의 눈 버튼. 누르면 입력한 비밀번호를 보이거나 숨깁니다. */
export function PasswordVisibilityButton({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className="auth-input-action auth-password-action"
      type="button"
      aria-label={visible ? "비밀번호 숨기기" : "비밀번호 표시"}
      aria-pressed={visible}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onToggle}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {visible ? (
          <>
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
          </>
        ) : (
          <>
            <path d="m3 3 18 18" />
            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
            <path d="M9.9 5.1A11.5 11.5 0 0 1 12 5c6.4 0 10 7 10 7a14.7 14.7 0 0 1-3.3 4.1" />
            <path d="M6.6 6.6C3.7 8.3 2 12 2 12s3.6 7 10 7a10.4 10.4 0 0 0 4.1-.8" />
          </>
        )}
      </svg>
    </button>
  );
}
