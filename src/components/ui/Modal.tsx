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
    // 브라우저는 처음 나오는 닫기(X) 버튼에 포커스를 줘서, 바로 입력하거나 Enter를 누르면 창이 닫힙니다.
    // 입력칸이 있으면 그 칸에 포커스를 둡니다.
    const field = dialog?.querySelector<HTMLElement>(
      '[autofocus], input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), [contenteditable="true"]',
    );
    // 입력칸이 없으면 창 자체에 포커스를 둬서, 닫기(X) 버튼에 포커스 테두리가 뜨지 않게 합니다.
    (field ?? dialog)?.focus();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      tabIndex={-1}
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
