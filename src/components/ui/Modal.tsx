import { useEffect, useRef, type ReactNode } from "react";
import closeIcon from "../../assets/Icon Button.svg";
type Props = {
  title: string;
  onClose: () => void;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  size?: "small" | "medium" | "large";
  /** 비워 두면 입력칸이 있는 모달은 배경을 눌러도 닫히지 않습니다. */
  dismissOnBackdrop?: boolean;
  dismissOnEscape?: boolean;
};
export function Modal({
  title,
  onClose,
  children,
  actions,
  className = "",
  size = "medium",
  dismissOnBackdrop,
  dismissOnEscape = true,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal${size === "medium" ? "" : ` modal--${size}`} ${className}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        if (dismissOnEscape) onClose();
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const hasInput = Boolean(
          e.currentTarget.querySelector(
            'input:not([type="hidden"]), textarea, [contenteditable="true"]',
          ),
        );
        if (dismissOnBackdrop ?? !hasInput) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="modal-close"
          type="button"
          aria-label="닫기"
          onClick={onClose}
        >
          <img src={closeIcon} alt="" width="35" height="35" />
        </button>
      </div>
      {children}
      {actions && <div className="modal-actions">{actions}</div>}
    </dialog>
  );
}
