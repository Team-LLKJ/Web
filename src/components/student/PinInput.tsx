import { useRef } from "react";
export function PinInput({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i]?.trim() || "");
  function update(index: number, text: string) {
    // 이미 숫자가 있는 칸에 입력하면 커서 위치에 따라 "07"이나 "70"이 되므로, 기존 숫자가 아닌 쪽을 새 숫자로 씁니다.
    const typed = text.replace(/\D/g, "");
    const previous = digits[index];
    const digit =
      typed.length > 1 && previous
        ? typed[0] === previous
          ? typed.slice(-1)
          : typed[0]
        : typed.slice(-1);
    const next = [...digits];
    next[index] = digit;
    onChange(
      next
        .map((value) => value || " ")
        .join("")
        .trimEnd(),
    );
    if (digit) inputs.current[Math.min(index + 1, 5)]?.focus();
  }
  return (
    <div>
      <div className="pin-input" role="group" aria-label="6자리 PIN 번호">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(node) => {
              inputs.current[index] = node;
            }}
            aria-label={`PIN ${index + 1}번째 숫자`}
            aria-invalid={!!error}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            value={digit}
            onChange={(e) => update(index, e.target.value)}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              // 숫자 키는 칸에 무엇이 있든 그 숫자로 바꿉니다.
              if (/^\d$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                update(index, e.key);
                return;
              }
              if (e.key === "Backspace" && !digit && index > 0) {
                e.preventDefault();
                inputs.current[index - 1]?.focus();
              }
              if (e.key === "ArrowLeft")
                inputs.current[Math.max(0, index - 1)]?.focus();
              if (e.key === "ArrowRight")
                inputs.current[Math.min(5, index + 1)]?.focus();
            }}
            onPaste={(e) => {
              e.preventDefault();
              const pasted = e.clipboardData
                .getData("text")
                .replace(/\D/g, "")
                .slice(0, 6);
              if (pasted) {
                onChange(pasted);
                inputs.current[Math.min(pasted.length, 5)]?.focus();
              }
            }}
          />
        ))}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
