import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiErrorMessage } from "../api/client";
import { getMyEvaluations } from "../api/evaluations";
import type { PageResponse, TeacherEvaluationSummary } from "../api/types";
import { TeacherHeader } from "../components/teacher/TeacherHeader";
import { Button } from "../components/ui/Button";
import { Skeleton, SkeletonStatus } from "../components/ui/Skeleton";
import "../components/teacher/teacher.css";

const PAGE_SIZE = 20;

type StateFilter = "ALL" | "STARTED" | "WAITING" | "ENDED";

const FILTERS: { value: StateFilter; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "STARTED", label: "진행 중" },
  { value: "WAITING", label: "대기 중" },
  { value: "ENDED", label: "종료" },
];

function matchesFilter(state: string, filter: StateFilter) {
  if (filter === "ALL") return true;
  if (filter === "ENDED") return state === "ENDED" || state === "EXPIRED";
  return state === filter;
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

const EMPTY_DATE = "정보 없음";
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function dateLabel(value?: string) {
  if (!value) return EMPTY_DATE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return EMPTY_DATE;
  const pad = (n: number) => String(n).padStart(2, "0");
  const hours = date.getHours();
  const meridiem = hours < 12 ? "오전" : "오후";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} (${WEEKDAYS[date.getDay()]}) ${meridiem} ${hour12}:${pad(date.getMinutes())}`;
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
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<StateFilter>("ALL");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadedKey, setLoadedKey] = useState("");
  const [noticeState, setNoticeState] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const requestKey = `${page}:${refreshKey}`;
  const result = resultState?.key === requestKey ? resultState.result : null;
  const loading = loadedKey !== requestKey;
  const notice =
    (noticeState?.key === requestKey ? noticeState.message : "") ||
    navigationNotice;

  useEffect(() => {
    let active = true;
    void getMyEvaluations(page, PAGE_SIZE)
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
  }, [page, refreshKey, requestKey]);

  const items = result?.items ?? [];
  const visibleItems = items.filter((item) => matchesFilter(item.state, filter));
  const totalPages = result?.totalPages ?? 0;
  const currentPage = result?.page ?? page;

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
        <p className="teacher-eyebrow">TEACHER / MY EVALUATIONS</p>
        <div className="teacher-list-title-row">
          <div>
            <h1>내 수행평가</h1>
            <p>내가 만든 평가를 확인하고 진행 화면으로 이동할 수 있습니다.</p>
          </div>
          <Link
            className="button button--primary primary"
            to="/teacher/evaluations/new"
          >
            새 평가 만들기
          </Link>
        </div>

        {notice && (
          <p className="teacher-notice" role="alert">
            {notice}
          </p>
        )}
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
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="teacher-list-count">
                총 <b>{result?.totalElements ?? items.length}</b>개
              </p>
            </div>
            {visibleItems.length === 0 && (
              <p className="teacher-list-state">
                이 페이지에는 해당 상태의 평가가 없습니다.
              </p>
            )}
            <div className="teacher-evaluation-list">
              {visibleItems.map((evaluation) => {
                const done =
                  evaluation.state === "ENDED" ||
                  evaluation.state === "EXPIRED";
                const detailPath = `/teacher/evaluations/${encodeURIComponent(evaluation.id)}`;
                const created = dateLabel(evaluation.createdAt);
                const expires = dateLabel(evaluation.expiresAt);
                return (
                  <article
                    className={`teacher-card teacher-evaluation-item${done ? " teacher-evaluation-item--done" : ""}`}
                    key={evaluation.id}
                  >
                    <span
                      className={`evaluation-state evaluation-state--${evaluation.state.toLowerCase()}`}
                    >
                      {stateLabel(evaluation.state)}
                    </span>
                    <h2>{evaluation.title}</h2>
                    <dl>
                      <div>
                        <dt>생성일</dt>
                        <dd className={created === EMPTY_DATE ? "is-empty" : undefined}>
                          {created}
                        </dd>
                      </div>
                      <div>
                        <dt>만료일</dt>
                        <dd className={expires === EMPTY_DATE ? "is-empty" : undefined}>
                          {expires}
                        </dd>
                      </div>
                    </dl>
                    <div className="teacher-evaluation-item-actions">
                      <Link
                        className="button button--primary primary"
                        to={detailPath}
                      >
                        평가 관리
                      </Link>
                      <Link
                        className="button button--secondary neutral"
                        to={`${detailPath}/results`}
                      >
                        학습 기록
                      </Link>
                    </div>
                  </article>
                );
              })}
              {filter === "ALL" && currentPage + 1 >= totalPages && (
                <Link
                  className="teacher-evaluation-new"
                  to="/teacher/evaluations/new"
                >
                  <span aria-hidden="true">+</span>
                  새 평가 만들기
                </Link>
              )}
            </div>
            {totalPages > 1 && (
              <nav
                className="teacher-pagination"
                aria-label="수행평가 페이지 이동"
              >
                <Button
                  variant="secondary"
                  disabled={currentPage <= 0 || loading}
                  onClick={() => setPage((value) => Math.max(0, value - 1))}
                >
                  이전
                </Button>
                <span>
                  {currentPage + 1} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  disabled={currentPage + 1 >= totalPages || loading}
                  onClick={() =>
                    setPage((value) => Math.min(totalPages - 1, value + 1))
                  }
                >
                  다음
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
    </main>
  );
}
