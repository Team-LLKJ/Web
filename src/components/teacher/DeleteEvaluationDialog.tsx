import { useRef, useState } from "react";
import { apiErrorMessage } from "../../api/client";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

type Props = {
  title: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
};

export function DeleteEvaluationDialog({ title, onConfirm, onClose }: Props) {
  const inFlight = useRef(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    if (inFlight.current) return;
    inFlight.current = true;
    setDeleting(true);
    setError("");
    try {
      await onConfirm();
    } catch (error) {
      setError(
        apiErrorMessage(
          error,
          "평가를 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.",
        ),
      );
    } finally {
      inFlight.current = false;
      setDeleting(false);
    }
  }

  return (
    <Modal
      title="평가를 삭제할까요?"
      className="evaluation-delete-modal"
      onClose={() => {
        if (!inFlight.current) onClose();
      }}
      actions={
        <>
          <Button variant="secondary" disabled={deleting} onClick={onClose}>
            취소
          </Button>
          <Button
            variant="danger"
            disabled={deleting}
            onClick={() => void confirm()}
          >
            {deleting ? "삭제 중…" : "삭제하기"}
          </Button>
        </>
      }
    >
      <p className="delete-evaluation-title">{title}</p>
      <p className="delete-evaluation-copy">
        이 평가를 삭제합니다. 삭제한 평가는 이 화면에서 되돌릴 수 없습니다.
        필요한 답안과 학습 기록을 확인한 뒤 삭제해주세요.
      </p>
      {error && (
        <p className="delete-evaluation-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
