import { htmlToPlainText } from "../../lib/guidelinesText";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

export type AnswerConflict = {
  questionId: string;
  title: string;
  local: string;
  server: string;
  version: number;
};

function AnswerPreview({ label, html }: { label: string; html: string }) {
  return (
    <section className="student-conflict-answer">
      <h3>{label}</h3>
      <p>{htmlToPlainText(html).trim() || "작성한 내용이 없어요."}</p>
    </section>
  );
}

export function AnswerConflictDialog({
  conflict,
  onResolve,
}: {
  conflict: AnswerConflict;
  onResolve: (useLocal: boolean) => void;
}) {
  return (
    <Modal
      title="답안을 확인해주세요"
      onClose={() => undefined}
      className="student-modal student-conflict-modal"
      dismissOnBackdrop={false}
      dismissOnEscape={false}
      actions={
        <>
          <Button onClick={() => onResolve(true)}>이 기기 내용으로 복원</Button>
          <Button variant="secondary" onClick={() => onResolve(false)}>
            서버 답안 유지
          </Button>
        </>
      }
    >
      <p>
        {conflict.title}의 서버 답안이 이 기기에 보관한 내용과 달라요. 남길
        내용을 골라주세요.
      </p>
      <div className="student-conflict-answers">
        <AnswerPreview label="이 기기에 보관한 내용" html={conflict.local} />
        <AnswerPreview label="서버에 저장된 답안" html={conflict.server} />
      </div>
    </Modal>
  );
}
