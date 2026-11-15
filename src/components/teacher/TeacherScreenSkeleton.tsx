import { ClassParticipantsSkeleton } from "./ClassParticipantsSkeleton";
import {
  AssessmentEditSkeleton,
  EvaluationEditSkeleton,
} from "./AssessmentEditSkeleton";
import {
  StudentSidebarSkeleton,
  SubmissionSkeleton,
} from "../grading/GradingSkeleton";
import { Tabs } from "../ui/Tabs";
import { ChatHistorySkeleton } from "../grading/ChatHistorySkeleton";
import { StudentWorkspace } from "../student/StudentWorkspace";
import { LazyRichTextEditor as RichTextEditor } from "./LazyRichTextEditor";
import { TextInput } from "../ui/TextInput";
import { Skeleton } from "../ui/Skeleton";
import { ClassEvaluationSkeleton } from "./ClassEvaluationSection";
import { isSharedFolderId } from "../../lib/sharedFolders";
import { evaluationCriteria } from "../../data/landing";
import type { LoadingLayout } from "../ui/loadingLayout";

/** 실제 글자와 같은 크기를 차지하되 글자만 보이지 않게 한 스켈레톤 */
function Line({
  width = "100%",
  height = "1lh",
}: {
  width?: string;
  height?: string;
}) {
  return <Skeleton style={{ width, maxWidth: "100%", height }} />;
}

/** 뒤로가기 링크. 실제 화면과 같은 꺾쇠 아이콘·글자입니다. */
function Back({ label }: { label: string }) {
  return (
    <span className="folder-back">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
      {label}
    </span>
  );
}

function Title() {
  return (
    <h1 className="screen-loading-title">
      <Line width="12em" />
    </h1>
  );
}

function Folder() {
  // 공유받은 수행평가로 알려진 주소면 삭제 버튼을 두지 않습니다(소유자만 삭제할 수 있어요).
  const folderId =
    typeof window === "undefined"
      ? ""
      : (window.location.pathname.match(
          /^\/teacher\/(?:folders|evaluations)\/([^/]+)\/?$/,
        )?.[1] ?? "");
  const hideDelete =
    folderId !== "" && isSharedFolderId(decodeURIComponent(folderId));
  return (
    <>
      <Back label="내 수행평가" />
      <div className="teacher-list-title-row">
        <Title />
        <div className="folder-title-actions">
          <span className="folder-action">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="9.5" cy="8" r="3.5" />
              <path d="M3 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
              <path d="M19 8v6M16 11h6" />
            </svg>
            공유
          </span>
          <span className="folder-action">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
              <path d="M14.5 7.5l3 3" />
            </svg>
            수정
          </span>
          {!hideDelete && (
            <span className="folder-action folder-action--danger folder-skeleton-delete">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 7h16" />
                <path d="M10 11v6M14 11v6" />
                <path d="M6 7l1 13h10l1-13" />
                <path d="M9 7V4h6v3" />
              </svg>
              삭제
            </span>
          )}
        </div>
      </div>
      <section className="teacher-card folder-section">
        <header className="folder-section-head">
          <h2>평가 정보</h2>
        </header>
        <p className="folder-desc">
          <Line width="75%" />
        </p>
        <ol className="folder-questions">
          {[1].map((n) => (
            <li key={n}>
              <b>문항 {n}</b>
              <Line width="65%" />
            </li>
          ))}
        </ol>
      </section>
      <section className="teacher-card folder-section">
        <header className="folder-section-head">
          <h2>평가 설정</h2>
        </header>
        <dl className="folder-settings">
          <div>
            <dt>평가 항목</dt>
            <dd>
              <ul className="folder-chips">
                {evaluationCriteria.map((item) => (
                  <li className="skeleton skeleton-ink" key={item.title}>
                    {item.title}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt>부정행위 방지</dt>
            <dd>
              <ul className="folder-chips">
                {["창/탭 이탈 감지", "프린트 금지"].map((label) => (
                  <li className="skeleton skeleton-ink" key={label}>
                    {label}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
      </section>
      <ClassEvaluationSkeleton />
    </>
  );
}

function Lobby() {
  return (
    <>
      <Back label="수행평가로" />
      <h1 className="lobby-title">
        <Line width="12em" />
        <span>
          <Line width="5em" />
        </span>
      </h1>
      <div className="teacher-lobby">
        <section className="teacher-card teacher-join-card">
          <div>
            <p className="teacher-join-label">참여 PIN</p>
            <p className="teacher-lobby-pin">
              <Line width="6ch" />
            </p>
            <p className="teacher-join-hint">
              QR코드를 스캔하거나 PIN을 입력해 참여하세요
            </p>
          </div>
          <div className="teacher-join-qr">
            <Skeleton className="teacher-lobby-qr" />
          </div>
        </section>
        <section className="teacher-card teacher-lobby-people">
          <div className="teacher-lobby-people-head">
            <h2>
              참여자 <Line width="2em" />
            </h2>
          </div>
          <ClassParticipantsSkeleton />
        </section>
      </div>
    </>
  );
}

function Form() {
  return (
    <>
      <Back label="내 수행평가" />
      <h1 className="screen-loading-title">수행평가 만들기</h1>
      <div className="teacher-create-card" inert>
        <div className="teacher-create-stepper" aria-label="평가 생성 단계">
          {["평가 정보", "평가 설정", "문항 작성"].map((label, i) => (
            <span key={label} className={i === 0 ? "is-current" : ""}>
              <span className="teacher-step-number">{i + 1}</span>
              <span>{label}</span>
            </span>
          ))}
        </div>
        <section className="teacher-card teacher-create-section">
          <header className="teacher-create-section-head">
            <h2>
              <span className="teacher-section-num">1</span>기본 정보
            </h2>
          </header>
          <div className="teacher-form-grid">
            <TextInput
              label="수행평가 제목"
              placeholder="예) 2학기 국어 수행평가"
              disabled
            />
          </div>
        </section>
        <section className="teacher-card teacher-create-section">
          <header className="teacher-create-section-head">
            <h2>
              <span className="teacher-section-num">2</span>평가 내용
            </h2>
          </header>
          <RichTextEditor
            label="평가 내용"
            value=""
            placeholder="평가 기준이나 규칙을 적어 주세요."
            onChange={() => {}}
          />
          <p className="teacher-section-hint">
            학생 화면에는 텍스트로 공유돼요. 서식은 줄바꿈 위주로 저장되며 최대
            10,000자까지 입력할 수 있어요.
          </p>
        </section>
        <div className="teacher-form-actions teacher-form-actions--bar">
          <div>
            <button className="button button--primary primary" disabled>
              다음
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Results() {
  return (
    <>
      <p className="teacher-eyebrow">TEACHER / REVIEW</p>
      <Title />
      <div className="teacher-results-toolbar">
        <Line width="180px" />
        <Line width="90px" height="42px" />
      </div>
      <div className="teacher-results-summary">
        {["전체 참가자", "현재 접속 중", "답안 저장 기록", "AI 질문 기록"].map(
          (label) => (
            <section className="teacher-card" key={label}>
              <span>{label}</span>
              <strong>
                <Line width="2em" />
              </strong>
            </section>
          ),
        )}
      </div>
      <section className="teacher-card teacher-results-card">
        <h2>참가자</h2>
        <Line height="46px" />
        {[0, 1, 2].map((i) => (
          <Line height="42px" key={i} />
        ))}
      </section>
      <section className="teacher-card teacher-results-card">
        <h2>활동 타임라인</h2>
        {[0, 1, 2].map((i) => (
          <div className="teacher-loading-event-row" key={i}>
            <Line width="6em" />
            <Line width="5em" />
            <Line width="80%" />
          </div>
        ))}
      </section>
    </>
  );
}

function Grading() {
  return (
    <div className="workspace teacher-workspace" inert>
      <StudentSidebarSkeleton />
      <StudentWorkspace
        className="teacher-content"
        storageKey="lit:teacher-sidebar-width:v2"
        defaultWidth={36}
        editor={<SubmissionSkeleton />}
        chat={
          <aside className="details" aria-label="학생 평가 자료">
            <Tabs
              label="평가 자료"
              value="AI 대화창"
              items={["AI 대화창", "활동", "루브릭"].map((value) => ({
                value,
                label: value,
              }))}
              onChange={() => {}}
              variant="pill"
            />
            <div className="review-panel-scroll">
              <div className="messages student-chat teacher-chat">
                <ChatHistorySkeleton count={4} />
              </div>
            </div>
          </aside>
        }
      />
    </div>
  );
}

export function TeacherScreenSkeleton({ layout }: { layout: LoadingLayout }) {
  return (
    <div aria-hidden="true" className="screen-loading-body">
      {layout === "folder" ? (
        <Folder />
      ) : layout === "lobby" ? (
        <Lobby />
      ) : layout === "assessment-edit" ? (
        <AssessmentEditSkeleton />
      ) : layout === "edit" ? (
        <EvaluationEditSkeleton />
      ) : layout === "form" ? (
        <Form />
      ) : layout === "results" ? (
        <Results />
      ) : layout === "grading" ? (
        <Grading />
      ) : (
        <div className="screen-loading-neutral">
          <Line width="160px" />
          <Line width="240px" />
        </div>
      )}
    </div>
  );
}
