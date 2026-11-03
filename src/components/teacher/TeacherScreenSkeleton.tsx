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
import { RichTextEditor } from "./RichTextEditor";
import { TextInput } from "../ui/TextInput";
import { Skeleton } from "../ui/Skeleton";
import type { LoadingLayout } from "../ui/loadingLayout";

function Line({
  width = "100%",
  height = "1lh",
}: {
  width?: string;
  height?: string;
}) {
  return <Skeleton style={{ width, maxWidth: "100%", height }} />;
}

function Title() {
  return (
    <h1 className="screen-loading-title">
      <Line width="12em" />
    </h1>
  );
}

function ClassCard() {
  return (
    <article className="teacher-card teacher-evaluation-item">
      <div className="evaluation-card-top">
        <Line width="68px" height="30px" />
        <Line width="24px" height="24px" />
      </div>
      <h2>
        <Line width="60%" />
      </h2>
      <dl>
        {["평가 인원", "제출"].map((label) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              <Line width="3em" />
            </dd>
          </div>
        ))}
      </dl>
      <Line height="42px" />
    </article>
  );
}

function Folder() {
  return (
    <>
      <div className="folder-back">
        <a href="/teacher/folders">← 내 수행평가</a>
      </div>
      <div className="teacher-list-title-row">
        <Title />
        <div className="folder-title-actions">
          <Line width="70px" height="42px" />
          <Line width="70px" height="42px" />
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
          {[1, 2].map((n) => (
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
          {["AI 사용 정책", "평가 항목", "부정행위 방지"].map(
            (label, index) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  {index === 1 ? (
                    <ul className="folder-chips">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <li key={i}>
                          <Line width="7em" />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Line width={index === 0 ? "55%" : "6em"} />
                  )}
                </dd>
              </div>
            ),
          )}
        </dl>
      </section>
      <section className="folder-section folder-section--plain">
        <header className="folder-section-head">
          <h2>반별 평가</h2>
        </header>
        <div className="teacher-filter-chips folder-filter">
          {["전체", "시작 전", "진행 중", "종료됨"].map((label) => (
            <span
              className="teacher-filter-chip screen-loading-filter"
              key={label}
            >
              {label} <Line width="1em" />
            </span>
          ))}
        </div>
        <div className="teacher-evaluation-list class-evaluation-grid">
          <ClassCard />
          <ClassCard />
        </div>
      </section>
    </>
  );
}

function Lobby() {
  return (
    <>
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
              <Line width="24em" />
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
          <div className="teacher-lobby-pills">
            {[0, 1, 2, 3].map((i) => (
              <div className="teacher-lobby-pill" key={i}>
                <Skeleton className="teacher-lobby-avatar" />
                <Line width="3em" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function Form() {
  return (
    <>
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
