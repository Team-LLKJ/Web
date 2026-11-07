import { useEffect, useState, type FormEvent } from "react";
import { ApiError, apiErrorMessage } from "../../api/client";
import {
  getEvaluationConfiguration,
  getProcessPolicy,
  saveProcessPolicy,
  type ProcessNoAiPolicy,
} from "../../api/evaluations";
import type { ApiQuestion } from "../../api/types";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import "./process-policy.css";

const NO_AI: { value: ProcessNoAiPolicy; label: string }[] = [
  { value: "HOLD", label: "판단 보류 (선생님이 직접 확인)" },
  { value: "USE_RECORDED_EVIDENCE", label: "남은 기록만으로 평가" },
  { value: "NOT_APPLICABLE", label: "해당 항목 제외" },
];

/** 문항 수만큼 100을 나눠 소수 넷째 자리까지 맞춥니다(합이 정확히 100이 되도록 마지막 문항이 나머지를 가짐). */
function evenWeights(count: number) {
  if (!count) return [];
  const base = Math.floor((100 / count) * 10000) / 10000;
  const list = Array.from({ length: count }, () => base);
  list[count - 1] = Math.round((100 - base * (count - 1)) * 10000) / 10000;
  return list;
}

/** 과정 평가 사전 정책(시작 전에만 수정 가능): 과제 목표, 허용 규칙, AI 미사용 처리, 문항 비율. */
export function ProcessPolicyDialog({
  evaluationId,
  onClose,
  onSaved,
}: {
  evaluationId: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [questions, setQuestions] = useState<ApiQuestion[] | null>(null);
  const [version, setVersion] = useState(0);
  const [taskGoal, setTaskGoal] = useState("");
  const [allowedRules, setAllowedRules] = useState("");
  const [noAiPolicy, setNoAiPolicy] = useState<ProcessNoAiPolicy>("HOLD");
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const config = await getEvaluationConfiguration(evaluationId);
        const ordered = [...config.questions].sort((a, b) => a.position - b.position);
        const even = evenWeights(ordered.length);
        let next: Record<string, string> = Object.fromEntries(ordered.map((q, i) => [q.id, String(even[i])]));
        try {
          const policy = await getProcessPolicy(evaluationId);
          if (!active) return;
          setVersion(policy.version);
          setTaskGoal(policy.taskGoal ?? "");
          setAllowedRules(policy.allowedRules ?? "");
          setNoAiPolicy(policy.noAiPolicy ?? "HOLD");
          const saved = new Map(policy.questionWeights.map((w) => [w.questionId, w.weight]));
          next = Object.fromEntries(ordered.map((q, i) => [q.id, String(saved.get(q.id) ?? even[i])]));
        } catch (caught) {
          if (!(caught instanceof ApiError && caught.status === 404)) throw caught;
        }
        if (!active) return;
        setWeights(next);
        setQuestions(ordered);
      } catch (caught) {
        if (!active) return;
        setQuestions([]);
        setError(apiErrorMessage(caught, "과정 평가 설정을 불러오지 못했습니다."));
      }
    })();
    return () => {
      active = false;
    };
  }, [evaluationId]);

  const total = Object.values(weights).reduce((sum, value) => sum + (Number(value) || 0), 0);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!questions?.length) return;
    const list = questions.map((q) => ({ questionId: q.id, weight: Number(weights[q.id]) }));
    if (list.some((w) => !(w.weight > 0))) {
      setError("모든 문항의 비율은 0보다 커야 해요.");
      return;
    }
    if (Math.abs(total - 100) > 0.0001) {
      setError(`문항 비율의 합이 100이어야 해요. (지금 ${Math.round(total * 10000) / 10000})`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await saveProcessPolicy(evaluationId, {
        expectedVersion: version,
        taskGoal: taskGoal.trim(),
        allowedRules: allowedRules.trim(),
        noAiPolicy,
        questionWeights: list.map((w) => ({ ...w, weight: Math.round(w.weight * 10000) / 10000 })),
      });
      onSaved?.();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.code === "PROCESS_POLICY_LOCKED"
          ? "평가가 시작돼서 더 이상 바꿀 수 없어요."
          : caught instanceof ApiError && caught.code === "PROCESS_POLICY_VERSION_CONFLICT"
            ? "다른 곳에서 먼저 저장됐어요. 창을 닫았다가 다시 열어주세요."
            : apiErrorMessage(caught, "과정 평가 설정을 저장하지 못했습니다."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="과정 평가 설정"
      onClose={onClose}
      actions={
        <>
          <Button type="submit" form="process-policy-form" loading={busy} disabled={!questions?.length}>
            저장
          </Button>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
        </>
      }
    >
      <form id="process-policy-form" className="process-policy" noValidate onSubmit={(event) => void submit(event)}>
        <p className="process-policy-desc">
          학생의 답안 작성 과정과 AI 사용을 분석할 때 쓰는 기준이에요. 평가를 시작하면 바꿀 수 없어요.
        </p>
        <label className="teacher-textarea-label">
          과제 목표
          <textarea
            maxLength={2000}
            placeholder="예: 근거와 적용 조건을 설명한다"
            value={taskGoal}
            onChange={(event) => setTaskGoal(event.target.value)}
          />
        </label>
        <label className="teacher-textarea-label">
          AI 허용 규칙
          <textarea
            maxLength={2000}
            placeholder="예: AI 답변을 쓴 뒤에는 학생이 직접 검토한다"
            value={allowedRules}
            onChange={(event) => setAllowedRules(event.target.value)}
          />
        </label>
        <label className="teacher-select-label">
          AI를 쓰지 않은 학생 처리
          <select value={noAiPolicy} onChange={(event) => setNoAiPolicy(event.target.value as ProcessNoAiPolicy)}>
            {NO_AI.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="process-policy-weights">
          <legend>
            문항 비율 <span data-error={Math.abs(total - 100) > 0.0001}>합계 {Math.round(total * 100) / 100}/100</span>
          </legend>
          {questions === null ? (
            <p className="process-policy-desc">문항을 불러오는 중…</p>
          ) : (
            questions.map((q) => (
              <label key={q.id}>
                <span>{q.title || `문항 ${q.position}`}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step="0.0001"
                  value={weights[q.id] ?? ""}
                  onChange={(event) => {
                    setWeights((current) => ({ ...current, [q.id]: event.target.value }));
                    setError("");
                  }}
                />
              </label>
            ))
          )}
        </fieldset>
        {error && <p className="input-error">{error}</p>}
      </form>
    </Modal>
  );
}
