import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiErrorMessage } from "../api/client";
import { getMyEvaluations } from "../api/evaluations";
import type { PageResponse, TeacherEvaluationSummary } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { Button } from "../components/ui/Button";
import "../components/teacher/teacher.css";

const PAGE_SIZE = 20;

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

function dateLabel(value?: string) {
  if (!value) return "정보 없음";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "정보 없음"
    : date.toLocaleString("ko-KR");
}

export function MyEvaluationsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationNotice =
    typeof (location.state as { notice?: unknown } | null)?.notice === "string"
      ? (location.state as { notice: string }).notice
      : "";
  const [result, setResult] =
    useState<PageResponse<TeacherEvaluationSummary> | null>(null);
  const [page, setPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotice(navigationNotice);
    void getMyEvaluations(page, PAGE_SIZE)
      .then((response) => {
        if (active) setResult(response);
      })
      .catch((error) => {
        if (active)
          setNotice(
            apiErrorMessage(error, "수행평가 목록을 불러오지 못했습니다."),
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, refreshKey, navigationNotice]);

  const items = result?.items ?? [];
  const totalPages = result?.totalPages ?? 0;
  const currentPage = result?.page ?? page;

  return (
    <main className="teacher-page">
      <header className="teacher-page-header">
        <Link className="teacher-brand" to="/">
          LIT<span>.</span>
        </Link>
        <div className="teacher-account">
          <span>{user?.name} 선생님</span>
          <Button
            variant="secondary"
            onClick={() => setRefreshKey((value) => value + 1)}
          >
            새로고침
          </Button>
          <Button
            variant="secondary"
            onClick={() => void logout().then(() => navigate("/login"))}
          >
            로그아웃
          </Button>
        </div>
      </header>

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
          <p className="teacher-list-state" role="status">
            수행평가를 불러오고 있습니다…
          </p>
        ) : items.length ? (
          <>
            <p className="teacher-list-count">
              총 {result?.totalElements ?? items.length}개
            </p>
            <div className="teacher-evaluation-list">
              {items.map((evaluation) => (
                <article
                  className="teacher-card teacher-evaluation-item"
                  key={evaluation.id}
                >
                  <div className="teacher-evaluation-item-main">
                    <span
                      className={`evaluation-state evaluation-state--${evaluation.state.toLowerCase()}`}
                    >
                      {stateLabel(evaluation.state)}
                    </span>
                    <h2>{evaluation.title}</h2>
                    <dl>
                      <div>
                        <dt>생성일</dt>
                        <dd>{dateLabel(evaluation.createdAt)}</dd>
                      </div>
                      <div>
                        <dt>만료일</dt>
                        <dd>{dateLabel(evaluation.expiresAt)}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="teacher-evaluation-item-actions">
                    <Link
                      className="button button--secondary neutral"
                      to={`/teacher/evaluations/${encodeURIComponent(evaluation.id)}`}
                    >
                      평가 관리
                    </Link>
                    <Link
                      className="button button--secondary neutral"
                      to={`/teacher/evaluations/${encodeURIComponent(evaluation.id)}/results`}
                    >
                      학습 기록
                    </Link>
                  </div>
                </article>
              ))}
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
