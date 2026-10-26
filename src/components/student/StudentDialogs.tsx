import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
export type StudentDialog =
  | ""
  | "submit"
  | "leave"
  | "warning"
  | "submitted"
  | "notice";
export function StudentDialogs({
  kind,
  notice,
  onClose,
  onLeave,
  onSubmit,
}: {
  kind: StudentDialog;
  notice: string;
  onClose: () => void;
  onLeave: () => void;
  onSubmit: () => void;
}) {
  if (!kind) return null;
  const title =
    kind === "submit"
      ? "제출하기"
      : kind === "leave"
        ? "나가기"
        : kind === "warning"
          ? "경고"
          : kind === "submitted"
            ? "제출 완료"
            : notice;
  return (
    <Modal
      title={title}
      onClose={onClose}
      className="student-modal"
      actions={
        <>
          {kind === "submit" ? (
            <>
              <Button onClick={onSubmit}>제출하기</Button>
              <Button variant="secondary" onClick={onClose}>
                취소
              </Button>
            </>
          ) : kind === "leave" ? (
            <>
              <Button variant="white-danger" onClick={onLeave}>
                나가기
              </Button>
              <Button variant="secondary" onClick={onClose}>
                취소
              </Button>
            </>
          ) : (
            <Button
              variant={kind === "warning" ? "white-danger" : "primary"}
              onClick={onClose}
            >
              확인하기
            </Button>
          )}
        </>
      }
    >
      {kind === "submit" ? (
        <p>
          정말로 답안을 제출하시겠습니까?
          <br />
          수정이 필요하거나 비어있는 답안이 있는지
          <br />
          확인 후 제출해주세요.
        </p>
      ) : kind === "leave" ? (
        <p>
          정말로 평가에서 나가시겠습니까?
          <br />
          제출 완료 버튼을 누르지 않고 나갈시 미제출
          <br />
          처리가 될수 있습니다.
        </p>
      ) : kind === "warning" ? (
        <p>
          다른 창으로 이동이 감지 되었습니다.
          <br />
          다른 창으로 이동시 부정행위 처리가 될수 있습니다.
        </p>
      ) : kind === "submitted" ? (
        <p>답안이 이 브라우저에 저장되었습니다.</p>
      ) : (
        <p>현재 평가 화면의 미리보기입니다.</p>
      )}
    </Modal>
  );
}
