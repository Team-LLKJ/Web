import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  configureEvaluation,
  deleteEvaluation,
  getEvaluation,
  getEvaluationConfiguration,
} from "../api/evaluations";
import { apiErrorMessage } from "../api/client";
import type { AiPolicy, Evaluation } from "../api/types";
import { TeacherHeader } from "../components/teacher/TeacherHeader";
import { QuestionFields } from "../components/teacher/QuestionFields";
import {
  freshQuestion,
  moveQuestion,
  toDraftQuestion,
  toQuestionInput,
  questionLimitError,
  type DraftQuestion,
} from "../components/teacher/questionDraft";
import { Button } from "../components/ui/Button";
import { DeleteEvaluationDialog } from "../components/teacher/DeleteEvaluationDialog";
import { Skeleton, SkeletonStatus } from "../components/ui/Skeleton";
import { paths } from "../router/paths";
import "../components/teacher/teacher.css";
import { Toast } from "../components/teacher/Toast";

export function TeacherEvaluationEditPage() {
  const { evaluationId = "" } = useParams();
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [aiPolicy, setAiPolicy] = useState<AiPolicy | "">("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  // 시작 전(WAITING) 평가만 수정할 수 있습니다.
  const locked = evaluation !== null && evaluation.state !== "WAITING";

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [next, config] = await Promise.all([
          getEvaluation(evaluationId),
          getEvaluationConfiguration(evaluationId),
        ]);
        if (!active) return;
        setEvaluation(next);
        setAiPolicy(config.aiPolicy as AiPolicy);
        setQuestions(
          config.questions.length
            ? config.questions.map(toDraftQuestion)
            : [freshQuestion(1)],
        );
      } catch (error) {
        if (active)
          setNotice(apiErrorMessage(error, "평가 정보를 불러오지 못했습니다."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [evaluationId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked || busy) return;
    if (!aiPolicy) {
      setNotice("AI 사용 정책을 선택해주세요.");
      return;
    }
    if (
      questions.length < 1 ||
      questions.length > 100 ||
      questions.some((question) => !question.content.trim())
    ) {
      setNotice("문항은 1~100개이며, 모든 문항의 내용을 입력해야 합니다.");
      return;
    }
    const limitError = questionLimitError(questions);
    if (limitError) {
      setNotice(limitError);
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      await configureEvaluation(evaluationId, {
        aiPolicy,
        questions: questions.map(toQuestionInput),
      });
      navigate(paths.evaluations, {
        state: { notice: "수행평가를 수정했습니다." },
      });
    } catch (error) {
      setNotice(apiErrorMessage(error, "수행평가를 수정하지 못했습니다."));
      setBusy(false);
    }
  }

  async function remove() {
    await deleteEvaluation(evaluationId);
    navigate(paths.evaluations, {
      state: { notice: "수행평가를 삭제했습니다." },
    });
  }

  return (
    <main className="teacher-page">
      <TeacherHeader />
      <div className="teacher-page-content">
        <div className="teacher-list-title-row">
          <div>
            <h1>수행평가 수정</h1>
            {evaluation && <p>{evaluation.title}</p>}
          </div>
          <Button
            variant="white-danger"
            disabled={loading || busy || !evaluation}
            onClick={() => setConfirmDelete(true)}
          >
            평가 삭제
          </Button>
        </div>
        <Toast message={notice} onClose={() => setNotice("")} />
        {loading ? (
          <SkeletonStatus label="평가 정보를 불러오는 중입니다.">
            <section className="teacher-card teacher-card-skeleton">
              <Skeleton style={{ width: 170, height: 28 }} />
              <Skeleton style={{ width: "100%", height: 120 }} />
              <Skeleton style={{ width: "100%", height: 120 }} />
            </section>
          </SkeletonStatus>
        ) : evaluation ? (
          <form className="teacher-card teacher-config-card" onSubmit={save}>
            {locked && (
              <p className="teacher-notice">
                이미 시작했거나 종료된 평가는 문항을 수정할 수 없습니다.
              </p>
            )}
            <label className="teacher-select-label">
              <span>AI 사용 정책</span>
              <select
                value={aiPolicy}
                disabled={busy || locked}
                onChange={(event) =>
                  setAiPolicy(event.target.value as AiPolicy | "")
                }
              >
                <option value="">정책을 선택해주세요</option>
                <option value="DISABLED">사용 안 함</option>
                <option value="HINT_ONLY">힌트만 허용</option>
                <option value="FULL">전체 응답 허용</option>
              </select>
            </label>
            <QuestionFields
              questions={questions}
              disabled={busy || locked}
              onChange={(key, content) =>
                setQuestions((current) =>
                  current.map((q) => (q.key === key ? { ...q, content } : q)),
                )
              }
              onLimitChange={(key, field, value) =>
                setQuestions((current) =>
                  current.map((q) => (q.key === key ? { ...q, [field]: value } : q)),
                )
              }
              onAdd={() =>
                setQuestions((current) => [
                  ...current,
                  freshQuestion(current.length + 1),
                ])
              }
              onRemove={(key) =>
                setQuestions((current) =>
                  current
                    .filter((q) => q.key !== key)
                    .map((q, index) => ({ ...q, position: index + 1 })),
                )
              }
              onMove={(key, toIndex) =>
                setQuestions((current) => moveQuestion(current, key, toIndex))
              }
            />
            <div className="teacher-form-actions teacher-form-actions--end">
              <Button
                variant="secondary"
                type="button"
                disabled={busy}
                onClick={() => navigate(paths.evaluations)}
              >
                취소
              </Button>
              <Button type="submit" disabled={busy || locked}>
                {busy ? "저장 중" : "저장하기"}
              </Button>
            </div>
          </form>
        ) : null}
      </div>
      {confirmDelete && evaluation && (
        <DeleteEvaluationDialog
          title={evaluation.title}
          onConfirm={remove}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </main>
  );
}
