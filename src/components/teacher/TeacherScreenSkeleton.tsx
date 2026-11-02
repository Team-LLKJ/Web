import {
  StudentSidebarSkeleton,
  SubmissionSkeleton,
  ReviewSkeleton,
} from "../grading/GradingSkeleton";
import { StudentWorkspace } from "../student/StudentWorkspace";
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
        <Line width="110px" />
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
      <Title />
      <div className="teacher-create-card">
        <div className="teacher-create-stepper">
          {["기본 정보", "평가 설정", "문항 작성"].map((label, i) => (
            <span key={label} className={i === 0 ? "is-current" : ""}>
              <b className="teacher-step-number">{i + 1}</b>
              {label}
            </span>
          ))}
        </div>
        <section className="teacher-card teacher-create-section">
          <header className="teacher-create-section-head">
            <h2>기본 정보</h2>
          </header>
          <div className="teacher-form-grid">
            {["수행평가 제목", "평가 설명"].map((label) => (
              <div className="screen-loading-field" key={label}>
                <span>{label}</span>
                <Line height={label === "평가 설명" ? "110px" : "46px"} />
              </div>
            ))}
          </div>
        </section>
        <div className="teacher-form-actions teacher-form-actions--end">
          <Line width="100px" height="42px" />
        </div>
      </div>
    </>
  );
}

function Edit() {
  return (
    <>
      <div className="teacher-list-title-row">
        <div>
          <h1>수행평가 수정</h1>
          <p>
            <Line width="12em" />
          </p>
        </div>
        <Line width="100px" height="42px" />
      </div>
      <section className="teacher-card teacher-config-card screen-loading-field">
        {["AI 사용 정책", "평가 항목", "문항"].map((label, i) => (
          <div className="screen-loading-field" key={label}>
            <span>{label}</span>
            <Line height={i === 2 ? "120px" : "46px"} />
          </div>
        ))}
      </section>
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
        chat={<ReviewSkeleton />}
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
      ) : layout === "edit" ? (
        <Edit />
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
