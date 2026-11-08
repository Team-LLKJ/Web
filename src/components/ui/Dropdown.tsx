import { useEffect, useRef, useState } from "react";
import "./dropdown.css";

export type DropdownOption = { value: string; label: string };

/** 기본 select 대신 쓰는 선택 상자. 목록은 테두리만 있는 카드로 펼쳐집니다. */
export function Dropdown({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    selectedRef.current?.scrollIntoView({ block: "nearest" });
    const close = (event: Event) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // 열려 있는 목록만 닫고, 뒤의 모달은 그대로 둡니다.
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const locked = disabled || options.length < 2;
  return (
    <div className="dropdown" ref={rootRef}>
      <button
        type="button"
        className="dropdown-trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={locked}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="dropdown-value">{selected?.label ?? ""}</span>
        {!locked && (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="dropdown-chevron">
            <path d="m4 6 4 4 4-4" />
          </svg>
        )}
      </button>
      {open && (
        <div className="dropdown-list" role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              key={option.value}
              ref={option.value === value ? selectedRef : undefined}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={option.value === value ? "is-selected" : undefined}
              onClick={() => {
                setOpen(false);
                onChange(option.value);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
