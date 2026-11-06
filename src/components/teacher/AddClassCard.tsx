import { useId } from "react";
import "./class-add-card.css";

type Props = {
  onAddClass: () => void;
  disabled?: boolean;
};

export function AddClassCard({ onAddClass, disabled = false }: Props) {
  const descriptionId = useId();

  return (
    <button
      type="button"
      className="class-add-card"
      onClick={onAddClass}
      disabled={disabled}
      aria-label="반 추가하기"
      aria-describedby={descriptionId}
    >
      <span className="class-add-card-icon" aria-hidden="true">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <span className="class-add-card-title">반 추가하기</span>
      <span className="class-add-card-description" id={descriptionId}>
        새 반을 만들고 평가를 시작하세요.
      </span>
    </button>
  );
}
