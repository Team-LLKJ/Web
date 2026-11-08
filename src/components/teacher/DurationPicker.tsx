import { useEffect, useRef, useState } from "react";

const HOURS = Array.from({ length: 25 }, (_, index) => index);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);

/** 시간과 분만 고르는 입력. 눌러서 열린 목록에서 시·분을 각각 선택합니다. */
export function DurationPicker({
  hours,
  minutes,
  onChange,
  disabled,
  invalid,
}: {
  hours: number;
  minutes: number;
  onChange: (hours: number, minutes: number) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") setOpen(false);
        return;
      }
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    // 선택된 값이 보이도록 각 목록을 그 위치로 맞춥니다.
    root.current?.querySelectorAll<HTMLElement>("[aria-selected='true']").forEach((item) => {
      item.parentElement?.scrollTo({ top: item.offsetTop - 4 });
    });
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="duration-picker" ref={root}>
      <button
        type="button"
        className="duration-picker-field"
        data-error={invalid || undefined}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          {hours}시간 {minutes}분
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </button>
      {open && (
        <div className="duration-picker-pop">
          <ul role="listbox" aria-label="시간">
            {HOURS.map((value) => (
              <li
                key={value}
                role="option"
                aria-selected={value === hours}
                onClick={() => onChange(value, value === 24 ? 0 : minutes)}
              >
                {value}시간
              </li>
            ))}
          </ul>
          <ul role="listbox" aria-label="분">
            {MINUTES.map((value) => (
              <li
                key={value}
                role="option"
                aria-selected={value === minutes}
                aria-disabled={hours === 24 && value > 0}
                onClick={() => hours < 24 || value === 0 ? onChange(hours, value) : undefined}
              >
                {value}분
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
