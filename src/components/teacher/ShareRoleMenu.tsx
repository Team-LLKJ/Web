import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./share-role-menu.css";

/** 공유 창의 권한 선택 메뉴. 기본 select 대신 버튼 + 펼침 메뉴로 보여 줍니다. */
export function ShareRoleMenu({
  label,
  removeLabel,
  disabled,
  onRemove,
}: {
  label: string;
  removeLabel: string;
  disabled?: boolean;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
    const close = (event: Event) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const closeOnScroll = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", close, true);
    window.addEventListener("scroll", closeOnScroll, true);
    window.addEventListener("resize", closeOnScroll);
    return () => {
      document.removeEventListener("pointerdown", close, true);
      window.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("resize", closeOnScroll);
    };
  }, [open]);

  function onMenuKeyDown(event: React.KeyboardEvent) {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? [],
    );
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Escape") {
      // 모달까지 닫히지 않게 메뉴만 닫습니다.
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`share-role-trigger${open ? " is-open" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        편집자
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M3 4.5 6 7.5l3-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && pos && (
        <div
          ref={menuRef}
          className="share-role-menu"
          role="menu"
          style={{ top: pos.top, right: pos.right }}
          onKeyDown={onMenuKeyDown}
        >
          <button
            type="button"
            role="menuitem"
            className="share-role-option is-selected"
            aria-current="true"
            onClick={() => setOpen(false)}
          >
            <svg className="share-role-check" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="m3.5 9.5 3.5 3.5 7.5-8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            편집자
          </button>
          <hr className="share-role-divider" />
          <button
            type="button"
            role="menuitem"
            className="share-role-option share-role-option--danger"
            onClick={() => {
              setOpen(false);
              onRemove();
            }}
          >
            {removeLabel}
          </button>
        </div>
      )}
    </>
  );
}
