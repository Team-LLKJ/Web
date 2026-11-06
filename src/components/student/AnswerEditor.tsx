import { EmptyState } from "../ui/EmptyState";
import type {
  AiPolicy,
  ApiQuestion,
} from "../../api/types";
import { Tabs } from "../ui/Tabs";
import { lazy, Suspense, useEffect, useState } from "react";
import { Skeleton, SkeletonStatus } from "../ui/Skeleton";
import { guidelinesToSafeHtml } from "../../lib/guidelinesText";

const loadRichAnswerField = () => import("./RichAnswerField");
const RichAnswerField = lazy(() =>
  loadRichAnswerField().then((module) => ({
    default: module.RichAnswerField,
  })),
);

function EditorPlaceholder() {
  return (
    <SkeletonStatus
      className="answer-rich-editor"
      label="답안 편집기를 불러오고 있습니다."
    >
      <div className="answer-placeholder-toolbar" aria-hidden="true" />
      <div className="answer-placeholder-body" aria-hidden="true">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
      <div className="answer-placeholder-status" aria-hidden="true">
        <Skeleton />
        <Skeleton />
      </div>
    </SkeletonStatus>
  );
}

const OVERVIEW = "__overview__";

const POLICY_COPY: Record<AiPolicy, { title: string; body: string }> = {
  DISABLED: {
    title: "AI 사용 불가",
    body: "이 평가에서는 AI 도우미를 사용할 수 없습니다. 답안은 본인의 생각으로 작성해주세요.",
  },
  HINT_ONLY: {
    title: "개념 이해를 위한 힌트만 허용",
    body: "AI는 개념과 접근 방법을 묻는 힌트에만 사용하고, 완성된 답안을 대신 작성하게 하지 마세요.",
  },
  FULL: {
    title: "AI 응답 사용 가능",
    body: "AI 응답을 참고할 수 있지만 내용을 그대로 옮기기 전에 정확성을 확인하고 본인의 판단과 설명을 답안에 담아주세요.",
  },
};

function OverviewPanel({
  title,
  guidelines,
  questions,
  aiPolicy,
  readOnly,
  onStart,
}: {
  title: string;
  guidelines: string;
  questions: ApiQuestion[];
  aiPolicy: AiPolicy | null;
  readOnly: boolean;
  onStart: (id: string) => void;
}) {
  const policy = aiPolicy ? POLICY_COPY[aiPolicy] : null;
  return (
    <section className="assessment-overview" aria-label="수행평가 안내">
      <h2>{title || "수행평가"}</h2>
      <p className="assessment-overview-lead">
        문항 {questions.length}개로 구성된 수행평가입니다. 문항 탭을 눌러 답안을
        작성하세요.
      </p>
      {guidelines.trim() && (
        <div className="assessment-overview-block">
          <h3>수행평가 안내</h3>
          <div
            className="assessment-overview-guidelines"
            dangerouslySetInnerHTML={{
              __html: guidelinesToSafeHtml(guidelines),
            }}
          />
        </div>
      )}
      <div className="assessment-overview-block">
        <h3>문항 구성</h3>
        <ol>
          {questions.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => onStart(item.id)}>
                <strong>{questions.length === 1 ? "문항" : item.title}</strong>
                <span>{item.content}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      {policy && (
        <div className="assessment-overview-block">
          <h3>AI 사용 안내</h3>
          <p>
            <strong>{policy.title}</strong>
          </p>
          <p>{policy.body}</p>
        </div>
      )}
      <div className="assessment-overview-block">
        <h3>진행 안내</h3>
        <ul>
          {!readOnly && (
            <li>입력 후 다른 영역을 누르면 답안이 자동으로 저장됩니다.</li>
          )}
          <li>복사 기능과 창 이탈은 학습 기록으로 남을 수 있습니다.</li>
          <li>모든 문항을 작성한 뒤 오른쪽 위 제출하기를 눌러주세요.</li>
        </ul>
      </div>
    </section>
  );
}

export function AnswerEditor({
  title,
  guidelines = "",
  aiPolicy,
  questions,
  questionId,
  answers,
  readOnly,
  savingQuestionId,
  notice,
  onQuestion,
  onAnswer,
  onSave,
}: {
  title: string;
  guidelines?: string;
  aiPolicy: AiPolicy | null;
  questions: ApiQuestion[];
  questionId: string;
  answers: Record<string, string>;
  readOnly: boolean;
  savingQuestionId: string;
  notice: string;
  onQuestion: (id: string) => void;
  onAnswer: (id: string, text: string) => void;
  onSave: (id: string) => void;
}) {
  const [overview, setOverview] = useState(true);
  // Warm the editor chunk while the student reads the overview, so the tab switch is instant.
  useEffect(() => {
    void loadRichAnswerField();
  }, []);
  const question = questions.find((item) => item.id === questionId);

  return (
    <section className="student-editor">
      {readOnly && (
        <p className="submission-lock-notice" role="status">
          제출 또는 평가 종료 후에는 답안을 수정할 수 없습니다.
        </p>
      )}
      <Tabs
        label="문항"
        variant="segment"
        value={overview ? OVERVIEW : questionId}
        items={[
          { value: OVERVIEW, label: "안내" },
          ...questions.map((item) => ({
            value: item.id,
            label: questions.length === 1 ? "문항" : item.title,
          })),
        ]}
        onChange={(id) => {
          if (id === OVERVIEW) {
            setOverview(true);
            return;
          }
          setOverview(false);
          onQuestion(id);
        }}
      />
      {overview ? (
        <OverviewPanel
          title={title}
          guidelines={guidelines}
          questions={questions}
          aiPolicy={aiPolicy}
          readOnly={readOnly}
          onStart={(id) => {
            setOverview(false);
            onQuestion(id);
          }}
        />
      ) : question ? (
        <>
          <section className="question-box">
            <p>{question.content}</p>
          </section>
          <Suspense fallback={<EditorPlaceholder />}>
            <RichAnswerField
              key={questionId}
              questionId={questionId}
              questionTitle={question.title}
              content={answers[questionId] ?? ""}
              readOnly={readOnly}
              saving={savingQuestionId === questionId}
              notice={notice}
              minChars={question.minChars}
              maxChars={question.maxChars}
              onChange={onAnswer}
              onBlur={() => {
                if (!readOnly) onSave(questionId);
              }}
            />
          </Suspense>
        </>
      ) : (
        <EmptyState size="inline" icon="doc" title="등록된 문항이 없어요" />
      )}
    </section>
  );
}
