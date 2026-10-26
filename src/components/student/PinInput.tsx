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
    const digit = text.replace(/\D/g, "").slice(-1);
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
