import type { ReactNode } from "react";
import type { FolderSession, SessionState } from "../../lib/evaluationFolders";
import { Skeleton } from "../ui/Skeleton";
import { AddClassCard } from "./AddClassCard";
import { MoreMenu } from "./MoreMenu";
import "./class-evaluation-loading.css";

type Filter = "ALL" | SessionState;
const filters: { value: Filter; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "READY", label: "시작 전" },
  { value: "IN_PROGRESS", label: "진행 중" },
  { value: "ENDED", label: "종료됨" },
];
const states = {
  READY: { label: "시작 전", color: "waiting", action: "평가 시작하러 가기" },
  IN_PROGRESS: {
    label: "진행 중",
    color: "started",
    action: "수행평가 현황보기",
  },
  ENDED: { label: "종료", color: "ended", action: "채점 결과 보기" },
};
// 시작 전이지만 대기실을 열어 PIN이 있는 반.
const lobbyState = { label: "대기 중", color: "waiting", action: "대기실로 가기" };

export function ClassEvaluationSection({
  sessions = [],
  filter = "ALL",
  onFilter,
  loading = false,
  children,
}: {
  sessions?: FolderSession[];
  filter?: Filter;
  onFilter?: (value: Filter) => void;
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="folder-section folder-section--plain">
      <header className="folder-section-head">
        <h2>반별 평가</h2>
      </header>
      <div
        className="teacher-filter-chips folder-filter"
        role="group"
        aria-label="진행 상태 필터"
      >
        {filters.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`teacher-filter-chip${filter === value ? " is-active" : ""}`}
            aria-pressed={filter === value}
            disabled={loading}
            onClick={() => onFilter?.(value)}
          >
            {label}
            {/* 불러오는 동안에는 태그 이름만 보여 주고, 다 불러오면 개수를 붙입니다. */}
            {!loading && (
              <>
                {" "}
                {value === "ALL"
                  ? sessions.length
                  : sessions.filter((session) => session.state === value).length}
              </>
            )}
          </button>
        ))}
      </div>
      {children}
    </section>
  );
}

type CardProps =
  | {
      session: FolderSession;
      onRename: () => void;
      onRemove: () => void;
      onOpen: () => void;
      onSaveAll: () => void;
    }
  | { session?: undefined; onRename?: never; onRemove?: never; onOpen?: never; onSaveAll?: never };

export function ClassEvaluationCard({
  session,
  onRename,
  onRemove,
  onOpen,
  onSaveAll,
}: CardProps) {
  const lobbyOpen = Boolean(session?.lobbyOpen);
  const state = session ? (lobbyOpen ? lobbyState : states[session.state]) : null;
  const loading = !session;
  return (
    <article
      className={`teacher-card teacher-evaluation-item${session?.state === "ENDED" ? " teacher-evaluation-item--done" : ""}`}
      aria-hidden={loading || undefined}
    >
      <div className="evaluation-card-top">
        <span
          className={`evaluation-state${state ? ` evaluation-state--${state.color}` : ""}`}
        >
          {state ? (
            state.label
          ) : (
            <Skeleton style={{ width: "3em", height: "1lh" }} />
          )}
        </span>
        <span className="evaluation-card-actions">
          <MoreMenu
            label={session ? `${session.className} 더보기` : "더보기"}
            disabled={loading}
            items={[
              { label: "수정하기", onClick: () => onRename?.() },
              {
                label: "반 전체 저장",
                onClick: () => onSaveAll?.(),
                hidden: session?.state !== "ENDED",
              },
              {
                label: "삭제하기",
                onClick: () => onRemove?.(),
                danger: true,
                hidden: session?.state === "IN_PROGRESS",
              },
            ]}
          />
        </span>
      </div>
      <h2 title={session?.className}>
        {session ? (
          session.className
        ) : (
          <Skeleton style={{ width: "60%", height: "1lh" }} />
        )}
      </h2>
      <dl>
        <div>
          <dt>평가 인원</dt>
          <dd>
            {session ? (
              session.state === "READY" && !lobbyOpen ? (
                "-"
              ) : (
                `${session.participants}명`
              )
            ) : (
              <span className="skeleton skeleton-ink">00명</span>
            )}
          </dd>
        </div>
        <div>
          <dt>제출</dt>
          <dd>
            {session ? (
              session.state === "READY" ? (
                "-"
              ) : (
                `${session.submitted}/${session.participants}명`
              )
            ) : (
              <span className="skeleton skeleton-ink">00/00명</span>
            )}
          </dd>
        </div>
      </dl>
      {state ? (
        <button type="button" className="evaluation-card-cta" onClick={onOpen}>
          {state.action}
        </button>
      ) : (
        <Skeleton className="evaluation-card-cta-skeleton" />
      )}
    </article>
  );
}

export function ClassEvaluationSkeleton() {
  return (
    <ClassEvaluationSection loading>
      <div
        className="teacher-evaluation-list class-evaluation-grid"
        aria-hidden="true"
      >
        <ClassEvaluationCard />
        <AddClassCard disabled onAddClass={() => {}} />
      </div>
    </ClassEvaluationSection>
  );
}
