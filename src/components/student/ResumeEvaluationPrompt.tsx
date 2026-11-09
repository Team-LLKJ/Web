import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { getStudentState } from "../../api/evaluations";
import {
  clearSession,
  getParticipantToken,
  readSession,
} from "../../data/studentSession";
import {
  isEndedError,
  isNetworkError,
  screenFor,
} from "../../lib/studentConnection";
import { paths } from "../../router/paths";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

type Status = "" | "SOLVING" | "WAITING" | "SUBMITTED" | "ENDED";

// 같은 브라우저에 남은 참가 정보가 있으면 평가 상태를 확인해 돌아갈 곳을 알려줍니다.
export function ResumeEvaluationPrompt({
  onCleared,
}: {
  onCleared?: () => void;
}) {
  const navigate = useNavigate();
  const [session] = useState(readSession);
  const [status, setStatus] = useState<Status>("");

  useEffect(() => {
    const { evaluationId } = session;
    if (!evaluationId || !getParticipantToken(evaluationId)) return;
    let active = true;
    getStudentState(evaluationId)
      .then((lobby) => {
        if (!active) return;
        const screen = screenFor(lobby);
        setStatus(screen === "EXPIRED" ? "ENDED" : screen);
      })
      .catch((error) => {
        if (!active) return;
        if (isEndedError(error)) setStatus("ENDED");
        // 연결이 없으면 상태를 알 수 없으니 일단 돌아가게 하고, 풀이 화면에서 다시 확인합니다.
        else if (isNetworkError(error)) setStatus("SOLVING");
        else if (error instanceof ApiError && error.status === 401) {
          clearSession();
          onCleared?.();
        }
      });
    return () => {
      active = false;
    };
    // 화면을 처음 열 때 한 번만 확인합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!status) return null;

  const forget = () => {
    clearSession();
    setStatus("");
    onCleared?.();
  };

  if (status === "SUBMITTED" || status === "ENDED")
    return (
      <Modal
        title={
          status === "SUBMITTED"
            ? "이미 제출한 평가예요"
            : "평가 시간이 끝났어요"
        }
        size="small"
        onClose={forget}
        actions={<Button onClick={forget}>확인</Button>}
      >
        <p>
          {status === "SUBMITTED"
            ? `${session.evaluationTitle} 답안은 제출이 완료되었어요.`
            : `${session.evaluationTitle} 답안은 서버에 저장된 내용까지만 반영돼요.`}
        </p>
      </Modal>
    );

  return (
    <Modal
      title="진행 중인 평가가 있어요"
      size="small"
      onClose={() => setStatus("")}
      actions={
        <>
          <Button onClick={() => navigate(paths.solve)}>
            {status === "WAITING" ? "대기실로 돌아가기" : "이어서 작성하기"}
          </Button>
          <Button variant="secondary" onClick={forget}>
            내 평가가 아니에요
          </Button>
        </>
      }
    >
      <p>
        <strong>{session.evaluationTitle}</strong>
      </p>
      <p>접속이 끊긴 동안에도 평가 시간은 계속 흘러요.</p>
    </Modal>
  );
}
