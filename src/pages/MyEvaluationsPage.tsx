import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiErrorMessage } from "../api/client";
import {
  deleteEvaluation,
  getMyEvaluations,
  getParticipants,
} from "../api/evaluations";
import type { PageResponse, TeacherEvaluationSummary } from "../api/types";
import { paths } from "../router/paths";
import { TeacherHeader } from "../components/teacher/TeacherHeader";
import { Button } from "../components/ui/Button";
import { DeleteEvaluationDialog } from "../components/teacher/DeleteEvaluationDialog";
import { Skeleton, SkeletonStatus } from "../components/ui/Skeleton";
import "../components/teacher/teacher.css";
import { Toast } from "../components/teacher/Toast";

const FETCH_SIZE = 100;
const PAGE_SIZE = 12;

type StateFilter = "ALL" | "STARTED" | "WAITING" | "ENDED";

const FILTERS: { value: StateFilter; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "STARTED", label: "진행 중" },
  { value: "WAITING", label: "대기 중" },
  { value: "ENDED", label: "종료" },
];

// 진행 중 → 대기 중 → 종료 순으로 보여줍니다.
function stateRank(state: string) {
  if (state === "STARTED") return 0;
  if (state === "WAITING") return 1;
  return 2;
}

// 생성일이 최신인 평가가 먼저 오도록 합니다. 값이 없으면 서버가 준 순서를 유지합니다.
function createdTime(value?: string) {
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isNaN(time) ? 0 : time;
}

function matchesFilter(state: string, filter: StateFilter) {
  if (filter === "ALL") return true;
  if (filter === "ENDED") return state === "ENDED" || state === "EXPIRED";
  return state === filter;
}

// 남은 시간이 끝났는데 서버 상태가 아직 갱신되지 않았다면 종료로 취급합니다.
function effectiveState(state: string, expiresAt: string | undefined, now: number) {
  if (state === "ENDED" || state === "EXPIRED") return state;
  const end = expiresAt ? new Date(expiresAt).getTime() : Number.NaN;
  return !Number.isNaN(end) && end <= now ? "ENDED" : state;
}

function stateLabel(state: string) {
  switch (state) {
    case "WAITING":
      return "대기 중";
    case "STARTED":
      return "진행 중";
    case "ENDED":
      return "종료";
    case "EXPIRED":
      return "만료";
    default:
      return state;
  }
}

function shortDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function remainingLabel(state: string, expiresAt: string | undefined, now: number) {
  if (state === "ENDED" || state === "EXPIRED") return "종료됨";
  if (!expiresAt) return "-";
  const diff = new Date(expiresAt).getTime() - now;
  if (Number.isNaN(diff)) return "-";
  if (diff <= 0) return "종료됨";
  const minutes = Math.floor(diff / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}일 ${hours}시간`;
  if (hours > 0) return `${hours}시간 ${minutes % 60}분`;
  return `${Math.max(1, minutes)}분`;
}

export function MyEvaluationsPage() {
  const location = useLocation();
  const navigationNotice =
    typeof (location.state as { notice?: unknown } | null)?.notice === "string"
      ? (location.state as { notice: string }).notice
      : "";
  const [resultState, setResultState] = useState<{
    key: string;
    result: PageResponse<TeacherEvaluationSummary>;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<StateFilter>("ALL");
  const [refreshKey, setRefreshKey] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadedKey, setLoadedKey] = useState("");
  const [noticeState, setNoticeState] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const requestKey = `${refreshKey}`;
  const result = resultState?.key === requestKey ? resultState.result : null;
  const loading = loadedKey !== requestKey;
  const notice =
    (noticeState?.key === requestKey ? noticeState.message : "") ||
    navigationNotice;

  useEffect(() => {
    let active = true;
    void (async () => {
      const first = await getMyEvaluations(0, FETCH_SIZE);
      const items = [...first.items];
      for (let next = 1; next < first.totalPages; next += 1) {
        const more = await getMyEvaluations(next, FETCH_SIZE);
        items.push(...more.items);
      }
      return { ...first, items };
    })()
      .then((response) => {
        if (active) setResultState({ key: requestKey, result: response });
      })
      .catch((error) => {
        if (active)
          setNoticeState({
            key: requestKey,
            message: apiErrorMessage(
              error,
              "수행평가 목록을 불러오지 못했습니다.",
            ),
          });
      })
      .finally(() => {
        if (active) setLoadedKey(requestKey);
      });
    return () => {
      active = false;
    };
  }, [requestKey]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteEvaluation(deleteTarget.id);
    setDeleteTarget(null);
    setRefreshKey((key) => key + 1);
  }

  // 남은 시간이 끝나는 순간 카드가 바로 종료로 바뀌도록 주기적으로 현재 시각을 갱신합니다.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  // The list API has no head-count, so ask each evaluation's lobby for it.
  const items = [
    ...new Map((result?.items ?? []).map((item) => [item.id, item])).values(),
  ].map((item) => ({
    ...item,
    state: effectiveState(item.state, item.expiresAt, now),
  }));
  const sortedItems = [...items]
    .filter((item) => matchesFilter(item.state, filter))
    .sort(
      (a, b) =>
        stateRank(a.state) - stateRank(b.state) ||
        createdTime(b.createdAt) - createdTime(a.createdAt),
    );
  const totalPages = Math.ceil(sortedItems.length / PAGE_SIZE);
  const currentPage = Math.max(0, Math.min(page, totalPages - 1));
  const visibleItems = sortedItems.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );

  useEffect(() => {
    if (visibleItems.length === 0) return;
    let active = true;
    void Promise.allSettled(
      visibleItems.map((item) =>
        getParticipants(item.id).then(
          (lobby) => [item.id, lobby.participantCount] as const,
        ),
      ),
    ).then((settled) => {
      if (!active) return;
      const next: Record<string, number> = {};
      settled.forEach((entry) => {
        if (entry.status === "fulfilled") next[entry.value[0]] = entry.value[1];
      });
      setCounts((prev) => ({ ...prev, ...next }));
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, filter, currentPage]);

  return (
    <main className="teacher-page">
      <TeacherHeader>
        <Button
          variant="secondary"
          onClick={() => setRefreshKey((value) => value + 1)}
        >
          새로고침
        </Button>
      </TeacherHeader>

      <div className="teacher-page-content">
        <div className="teacher-list-title-row">
          <div>
            <h1>내 수행평가</h1>
          </div>
          <Link
            className="button button--primary primary"
            to="/teacher/evaluations/new"
          >
            새 평가 만들기
          </Link>
        </div>

        <Toast
          message={notice}
          tone={
            noticeState?.key === requestKey && noticeState.message
              ? "error"
              : "info"
          }
        />
        {loading ? (
          <SkeletonStatus
            className="teacher-evaluation-list teacher-evaluation-list-skeleton"
            label="수행평가 목록을 불러오고 있습니다."
          >
            {Array.from({ length: 3 }, (_, index) => (
              <article
                className="teacher-card teacher-evaluation-item"
                key={index}
                aria-hidden="true"
              >
                <Skeleton style={{ width: 68, height: 28, borderRadius: 8 }} />
                <Skeleton
                  style={{ width: "60%", height: 30, margin: "18px 0 0" }}
                />
                <div className="teacher-evaluation-skeleton-meta">
                  <Skeleton style={{ width: "50%", height: 36 }} />
                  <Skeleton style={{ width: "80%", height: 36 }} />
                </div>
                <div
                  className="teacher-evaluation-skeleton-actions"
                  aria-hidden="true"
                >
                  <Skeleton style={{ width: "100%", height: 44, borderRadius: 12 }} />
                  <Skeleton style={{ width: "100%", height: 44, borderRadius: 12 }} />
                </div>
              </article>
            ))}
          </SkeletonStatus>
        ) : items.length ? (
          <>
            <div className="teacher-list-toolbar">
              <div
                className="teacher-filter-chips"
                role="group"
                aria-label="진행 상태 필터"
              >
                {FILTERS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={`teacher-filter-chip${filter === value ? " is-active" : ""}`}
                    aria-pressed={filter === value}
                    onClick={() => {
                      setFilter(value);
                      setPage(0);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="teacher-list-count">
                총 <b>{sortedItems.length}</b>개
              </p>
            </div>
            {visibleItems.length === 0 && (
              <p className="teacher-list-state">
                해당 상태의 평가가 없습니다.
              </p>
            )}
            <div className="teacher-evaluation-list">
              {visibleItems.map((evaluation) => {
                const done =
                  evaluation.state === "ENDED" ||
                  evaluation.state === "EXPIRED";
                const detailPath = `/teacher/evaluations/${encodeURIComponent(evaluation.id)}`;
                return (
                  <article
                    className={`teacher-card teacher-evaluation-item${done ? " teacher-evaluation-item--done" : ""}`}
                    key={evaluation.id}
                  >
                    <div className="evaluation-card-top">
                      <span
                        className={`evaluation-state evaluation-state--${evaluation.state.toLowerCase()}`}
                      >
                        {stateLabel(evaluation.state)}
                      </span>
                      <span className="evaluation-card-actions">
                        <Link
                          to={`${detailPath}/edit`}
                          aria-label={`${evaluation.title} 수정`}
                          title="수정"
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
                            <path d="M14.5 7.5l3 3" />
                          </svg>
                        </Link>
                        <button
                          type="button"
                          aria-label={`${evaluation.title} 삭제`}
                          title="삭제"
                          onClick={() =>
                            setDeleteTarget({
                              id: evaluation.id,
                              title: evaluation.title,
                            })
                          }
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M4 7h16" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M6 7l1 13h10l1-13" />
                            <path d="M9 7V4h6v3" />
                          </svg>
                        </button>
                      </span>
                    </div>
                    <h2 title={evaluation.title}>{evaluation.title}</h2>
                    <dl>
                      <div>
                        <dt>평가 인원</dt>
                        <dd>
                          {counts[evaluation.id] === undefined
                            ? "-"
                            : `${counts[evaluation.id]}명`}
                        </dd>
                      </div>
                      <div>
                        <dt>{done ? "종료일" : "남은 시간"}</dt>
                        <dd>
                          {done
                            ? shortDate(evaluation.expiresAt)
                            : remainingLabel(evaluation.state, evaluation.expiresAt, now)}
                        </dd>
                      </div>
                    </dl>
                    <Link
                      className="evaluation-card-cta"
                      to={
                        evaluation.state === "WAITING"
                          ? detailPath
                          : `${paths.grading}/${encodeURIComponent(evaluation.id)}`
                      }
                    >
                      {evaluation.state === "WAITING"
                        ? "평가 시작하러 가기"
                        : "수행평가 현황보기"}
                    </Link>
                  </article>
                );
              })}
            </div>
            {totalPages > 1 && (
              <nav
                className="teacher-pagination"
                aria-label="수행평가 페이지 이동"
              >
                <Button
                  variant="secondary"
                  aria-label="이전 페이지"
                  disabled={currentPage <= 0 || loading}
                  onClick={() => setPage((value) => Math.max(0, value - 1))}
                >
                  &lt;
                </Button>
                <span>
                  {currentPage + 1} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  aria-label="다음 페이지"
                  disabled={currentPage + 1 >= totalPages || loading}
                  onClick={() =>
                    setPage((value) => Math.min(totalPages - 1, value + 1))
                  }
                >
                  &gt;
                </Button>
              </nav>
            )}
          </>
        ) : (
          <section className="teacher-card teacher-list-empty">
            <h2>아직 만든 평가가 없습니다</h2>
            <p>
              새 수행평가를 만들면 이 목록에서 진행 상태와 기록을 확인할 수
              있습니다.
            </p>
            <Link
              className="button button--primary primary"
              to="/teacher/evaluations/new"
            >
              평가 만들기
            </Link>
          </section>
        )}
      </div>
      {deleteTarget && (
        <DeleteEvaluationDialog
          title={deleteTarget.title}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </main>
  );
}
