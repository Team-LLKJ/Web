import { useEffect, useRef, type ReactNode } from "react";
import closeIcon from "../../assets/Icon Button.svg";
type Props = {
  title: string;
  onClose: () => void;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  size?: "small" | "medium" | "large";
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
  dismissOnBackdrop = true,
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
        if (dismissOnBackdrop && e.target === e.currentTarget) onClose();
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
