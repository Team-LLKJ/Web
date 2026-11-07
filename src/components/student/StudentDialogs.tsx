import type { AiPolicy, Review } from "../../api/types";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import "./ai-disclosure.css";

export type DisclosureDraft = { tools: string; usedParts: string; reason: string };

export type StudentDialog = "" | "submit" | "leave" | "warning" | "policy" | "submitted" | "notice";

export function StudentDialogs({
  kind,
  notice,
  preview,
  aiPolicy,
  submitting,
  error,
  onClose,
  onLeave,
  onSubmit,
  disclosure,
  onDisclosure,
}: {
  kind: StudentDialog;
  notice: string;
  preview: Review | null;
  aiPolicy: AiPolicy | null;
  submitting: boolean;
  error: string;
  onClose: () => void;
  onLeave: () => void;
  onSubmit: () => void;
  disclosure?: DisclosureDraft;
  onDisclosure?: (next: DisclosureDraft) => void;
}) {
  if (!kind) return null;
  const title = kind === "submit"
    ? "제출하기"
    : kind === "leave"
      ? "나가기"
      : kind === "warning"
        ? "경고"
        : kind === "policy"
          ? "AI 사용 정책"
        : kind === "submitted"
          ? "제출 완료"
          : notice;

  return (
    <Modal
      title={title}
      onClose={onClose}
      className="student-modal"
      dismissOnBackdrop={kind !== "warning"}
      dismissOnEscape={kind !== "warning"}
      actions={
        <>
          {kind === "submit" ? (
            <>
              <Button onClick={onSubmit} loading={submitting} disabled={!preview?.canConfirm}>{submitting ? "제출 중…" : "제출 확정"}</Button>
              <Button variant="secondary" onClick={onClose} disabled={submitting}>취소</Button>
            </>
          ) : kind === "leave" ? (
            <>
              <Button variant="white-danger" onClick={onLeave}>나가기</Button>
              <Button variant="secondary" onClick={onClose}>취소</Button>
            </>
          ) : (
            <Button variant={kind === "warning" ? "white-danger" : "primary"} onClick={onClose}>{kind === "policy" ? "확인하고 계속" : "확인하기"}</Button>
          )}
        </>
      }
    >
      {kind === "submit" ? (
        <div className="submission-preview-message">
          <p>제출 전에 최종 내용을 확인해주세요. 제출 후에는 답안을 수정할 수 없습니다.</p>
          {preview && preview.blankQuestionIds.length > 0 && <p>미작성 문항 {preview.blankQuestionIds.length}개가 있습니다. 그래도 제출할 수 있습니다.</p>}
          {preview && !preview.canConfirm && <p>AI 응답이 진행 중입니다. 완료된 뒤 다시 제출해주세요.</p>}
          {disclosure && onDisclosure && (
            <fieldset className="ai-disclosure" disabled={submitting}>
              <legend>AI 사용 기록 (선택)</legend>
              <p className="ai-disclosure-hint">AI를 어디에 어떻게 썼는지 직접 적어두면 선생님이 과정을 이해하는 데 도움이 돼요.</p>
              <label>
                <span>사용한 AI 도구</span>
                <input
                  maxLength={500}
                  placeholder="예: LIT 내장 AI"
                  value={disclosure.tools}
                  onChange={(event) => onDisclosure({ ...disclosure, tools: event.target.value })}
                />
              </label>
              <label>
                <span>AI를 활용한 부분</span>
                <textarea
                  rows={2}
                  maxLength={4000}
                  placeholder="예: 문항 2 첫 문단의 개념 확인"
                  value={disclosure.usedParts}
                  onChange={(event) => onDisclosure({ ...disclosure, usedParts: event.target.value })}
                />
              </label>
              <label>
                <span>활용한 이유</span>
                <textarea
                  rows={2}
                  maxLength={4000}
                  placeholder="예: 개념만 확인하고 예시는 직접 찾았어요"
                  value={disclosure.reason}
                  onChange={(event) => onDisclosure({ ...disclosure, reason: event.target.value })}
                />
              </label>
            </fieldset>
          )}
          {error && <p className="dialog-error" role="alert">{error}</p>}
        </div>
      ) : kind === "leave" ? (
        <p>
          정말로 평가에서 나가시겠습니까?
          <br />
          제출 완료 버튼을 누르지 않고 나갈 시
          <br />
          미제출 처리가 될 수 있습니다.
        </p>
      ) : kind === "warning" ? (
        <p>화면 이탈 또는 캡처 단축키가 감지되었습니다. 이 알림만으로 부정행위가 확인되는 것은 아닙니다. 평가 운영 기준을 확인해주세요.</p>
      ) : kind === "policy" ? (
        <div className="student-policy-copy">
          <p><strong>{aiPolicy === "DISABLED" ? "AI 사용 불가" : aiPolicy === "HINT_ONLY" ? "개념 이해를 위한 힌트만 허용" : "AI 응답 사용 가능"}</strong></p>
          <p>{aiPolicy === "DISABLED" ? "이 평가에서는 AI 도우미를 사용할 수 없습니다. 답안은 본인의 생각으로 작성해주세요." : aiPolicy === "HINT_ONLY" ? "AI는 개념과 접근 방법을 묻는 힌트에만 사용하고, 완성된 답안을 대신 작성하게 하지 마세요." : "AI 응답을 참고할 수 있지만 내용을 그대로 옮기기 전에 정확성을 확인하고 본인의 판단과 설명을 답안에 담아주세요."}</p>
          <p>AI 질문, 응답, 답안 수정·제출 기록이 평가 학습 기록으로 저장될 수 있습니다. 창 이탈 알림은 참고 기록이며, 그 자체로 부정행위를 뜻하지 않습니다.</p>
          <p className="student-policy-unavailable">평가별 세부 규칙은 현재 서버 API에서 제공하지 않아 이 화면에는 표시되지 않습니다. 담당 선생님이 별도로 안내한 기준도 확인해주세요.</p>
        </div>
      ) : kind === "submitted" ? (
        <p>답안이 서버에 제출되었습니다.</p>
      ) : (
        <p>{notice}</p>
      )}
    </Modal>
  );
}

