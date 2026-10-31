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
      title="수행평가를 삭제할까요?"
      className="evaluation-delete-modal"
      onClose={() => {
        if (!inFlight.current) onClose();
      }}
      actions={
        <>
          <Button
            variant="white-danger"
            loading={deleting}
            onClick={() => void confirm()}
          >
            {deleting ? "삭제 중…" : "삭제"}
          </Button>
          <Button variant="secondary" disabled={deleting} onClick={onClose}>
            취소
          </Button>
        </>
      }
    >
      <p>
        “{title}” 평가와 모든 문항·제출 기록이 삭제되며 되돌릴 수 없습니다.
      </p>
      {error && (
        <p className="delete-evaluation-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
