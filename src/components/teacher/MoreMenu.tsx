import { useEffect, useRef, useState } from "react";
import { MoreIcon } from "./folderIcons";
import "./more-menu.css";

export type MoreMenuItem = {
  label: string;
  onClick: () => void;
  danger?: boolean;
  hidden?: boolean;
};

/** 카드 오른쪽 위 '더보기' 버튼과, 눌렀을 때 나오는 작업 목록입니다. */
export function MoreMenu({
  label,
  items,
  disabled = false,
}: {
  label: string;
  items: MoreMenuItem[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const visible = items.filter((item) => !item.hidden);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span className="more-menu" ref={rootRef}>
      <button
        type="button"
        className="more-menu-trigger"
        aria-label={label}
        title="더보기"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreIcon />
      </button>
      {open && (
        <div className="more-menu-list" role="menu">
          {visible.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={item.danger ? "is-danger" : undefined}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
