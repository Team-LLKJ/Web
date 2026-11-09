import { EmptyState } from "../ui/EmptyState";
import { questionText } from "../../lib/questionLimit";
import type { ApiQuestion } from "../../api/types";
import { Tabs } from "../ui/Tabs";
import { lazy, Suspense, useEffect, useState } from "react";
import { Skeleton, SkeletonStatus } from "../ui/Skeleton";
import { guidelinesToSafeHtml } from "../../lib/guidelinesText";
import "./overview-extra.css";

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

const ANTI_CHEAT_COPY: Record<string, string> = {
  TAB_LEAVE: "창이나 탭을 벗어나면 이탈로 기록됩니다.",
  PRINT_BLOCK: "인쇄(프린트)는 사용할 수 없습니다.",
  FULLSCREEN_LEAVE: "전체 화면을 벗어나면 이탈로 기록됩니다.",
  DEVTOOLS: "개발자 도구를 열면 기록됩니다.",
};

function OverviewPanel({
  title,
  guidelines,
  questions,
  criteria,
  antiCheat,
  readOnly,
  onStart,
}: {
  title: string;
  guidelines: string;
  questions: ApiQuestion[];
  criteria: string[];
  antiCheat: string[];
  readOnly: boolean;
  onStart: (id: string) => void;
}) {
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
                <span>{questionText(item.content, item.minChars, item.maxChars)}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      {criteria.length > 0 && (
        <div className="assessment-overview-block">
          <h3>AI 평가 안내</h3>
          <p className="overview-lead">AI를 활용한 과정이 아래 항목으로 분석되고, 교사가 확인해 최종 점수를 정합니다.</p>
          <ul className="overview-check-list">
            {criteria.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="overview-note">AI 분석은 참고 자료이며, 점수는 교사가 최종 판단합니다.</p>
        </div>
      )}
      {antiCheat.length > 0 && (
        <div className="assessment-overview-block">
          <h3>부정행위 방지 안내</h3>
          <ul className="overview-check-list">
            {antiCheat.map((code) => (
              <li key={code}>{ANTI_CHEAT_COPY[code] ?? code}</li>
            ))}
          </ul>
          <p className="overview-note">감지 기록은 교사에게 전달되며, 기록만으로 부정행위가 확정되지는 않습니다.</p>
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
  criteria = [],
  antiCheat = [],
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
  criteria?: string[];
  antiCheat?: string[];
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
          criteria={criteria}
          antiCheat={antiCheat}
          readOnly={readOnly}
          onStart={(id) => {
            setOverview(false);
            onQuestion(id);
          }}
        />
      ) : question ? (
        <>
          <section className="question-box">
            <p>{questionText(question.content, question.minChars, question.maxChars)}</p>
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
