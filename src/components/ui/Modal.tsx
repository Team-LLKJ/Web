import { useEffect, useRef, type ReactNode } from "react";
type Props = {
  title: string;
  onClose: () => void;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
};
export function Modal({
  title,
  onClose,
  children,
  actions,
  className = "",
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
      className={`modal ${className}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
          <img src="/icons/close.svg" alt="" width="35" height="35" />
        </button>
      </div>
      {children}
      {actions && <div className="modal-actions">{actions}</div>}
    </dialog>
  );
}
