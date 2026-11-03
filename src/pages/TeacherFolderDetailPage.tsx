import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { apiErrorMessage } from "../api/client";
import { PageLoading } from "../components/ui/PageLoading";
import { AddClassCard } from "../components/teacher/AddClassCard";
import { TeacherHeader } from "../components/teacher/TeacherHeader";
import { Toast } from "../components/teacher/Toast";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { TextInput } from "../components/ui/TextInput";
import {
  addSession,
  deleteFolder,
  getFolder,
  removeSession,
  type EvaluationFolder,
  type SessionState,
} from "../lib/evaluationFolders";
import { evaluationCriteria } from "../data/landing";
import "../components/teacher/teacher.css";

const POLICY_INFO = {
  DISABLED: {
    label: "사용 안 함",
    description: "학생이 AI에게 질문할 수 없어요.",
  },
  HINT_ONLY: {
    label: "힌트만 허용",
    description: "답을 알려주지 않고 생각을 이끄는 힌트만 줘요.",
  },
  FULL: {
    label: "전체 응답 허용",
    description: "질문 제한 없이 AI를 활용할 수 있어요.",
  },
} as const;

const ANTI_CHEAT_LABEL: Record<string, string> = {
  TAB_LEAVE: "창/탭 이탈 감지",
  PRINT_BLOCK: "프린트 금지",
};

const STATE_LABEL: Record<SessionState, string> = {
  READY: "시작 전",
  IN_PROGRESS: "진행 중",
  ENDED: "종료",
};

const STATE_CLASS: Record<SessionState, string> = {
  READY: "waiting",
  IN_PROGRESS: "started",
  ENDED: "ended",
};

export function TeacherFolderDetailPage() {
  const { folderId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [folder, setFolder] = useState<EvaluationFolder | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "missing">("loading");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [className, setClassName] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [filter, setFilter] = useState<"ALL" | SessionState>("ALL");
  const [notice, setNotice] = useState(
    (location.state as { notice?: string } | null)?.notice ?? "",
  );
  const refresh = async () => {
    try {
      setFolder(await getFolder(folderId));
      setLoadState("ready");
    } catch (error) {
      setNotice(apiErrorMessage(error, "수행평가를 불러오지 못했습니다."));
      setLoadState((current) => (current === "loading" ? "missing" : current));
    }
  };

  useEffect(() => {
    let active = true;
    getFolder(folderId)
      .then((next) => {
        if (!active) return;
        setFolder(next);
        setLoadState("ready");
      })
      .catch((error) => {
        if (!active) return;
        setNotice(apiErrorMessage(error, "수행평가를 불러오지 못했습니다."));
        setLoadState("missing");
      });
    return () => {
      active = false;
    };
  }, [folderId]);

  if (loadState === "loading") return <PageLoading layout="folder" />;

  if (!folder) {
    return (
      <main className="teacher-page">
        <TeacherHeader />
        <div className="teacher-page-content">
          <p className="teacher-list-state">수행평가를 찾을 수 없습니다.</p>
          <Link
            className="button button--secondary neutral"
            to="/teacher/folders"
          >
            내 수행평가로
          </Link>
        </div>
      </main>
    );
  }

  const visibleSessions = folder.sessions.filter(
    (session) => filter === "ALL" || session.state === filter,
  );

  async function submitClass(event: FormEvent) {
    event.preventDefault();
    const value = className.trim();
    if (!value || value.length > 30) {
      setError("반 이름을 30자 이내로 입력해주세요.");
      return;
    }
    if (folder!.sessions.some((s) => s.className === value)) {
      setError("이미 있는 반 이름입니다.");
      return;
    }
    setBusy(true);
    try {
      await addSession(folder!.id, value);
      setClassName("");
      setAdding(false);
      setFilter("ALL");
      await refresh();
    } catch (caught) {
      setError(apiErrorMessage(caught, "반을 추가하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="teacher-page">
      <TeacherHeader />
      <div className="teacher-page-content">
        <Toast message={notice} tone="info" onClose={() => setNotice("")} />
        <Link className="folder-back" to="/teacher/folders">
          ← 내 수행평가
        </Link>
        <div className="teacher-list-title-row">
          <div>
            <h1>{folder.title}</h1>
            {folder.owner && (
              <p className="folder-shared-by">
                {folder.owner}이 공유한 수행평가 · 함께 편집할 수 있어요
              </p>
            )}
          </div>
          <div className="folder-title-actions">
            <Button
              variant="secondary"
              onClick={() =>
                navigate(`/teacher/folders/${encodeURIComponent(folder.id)}/edit`)
              }
            >
              수정
            </Button>
            {!folder.owner && (
              <Button
                variant="white-danger"
                onClick={() => setConfirmDelete(true)}
              >
                삭제
              </Button>
            )}
          </div>
        </div>

        <section className="teacher-card folder-section">
          <header className="folder-section-head">
            <h2>평가 정보</h2>
          </header>
          {folder.description && (
            <p className="folder-desc">{folder.description}</p>
          )}
          <ol className="folder-questions">
            {folder.questions.length ? (
              folder.questions.map((question, index) => (
                <li key={index}>
                  <b>문항 {index + 1}</b>
                  <span>{question}</span>
                </li>
              ))
            ) : (
              <li className="folder-empty">아직 문항이 없습니다.</li>
            )}
          </ol>
        </section>

        <section className="teacher-card folder-section">
          <header className="folder-section-head">
            <h2>평가 설정</h2>
          </header>
          <dl className="folder-settings">
            <div>
              <dt>AI 사용 정책</dt>
              <dd>
                <span className="folder-policy">
                  <strong>{POLICY_INFO[folder.aiPolicy].label}</strong>
                  <small>({POLICY_INFO[folder.aiPolicy].description})</small>
                </span>
              </dd>
            </div>
            <div>
              <dt>평가 항목</dt>
              <dd>
                <ul className="folder-chips">
                  {(
                    folder.criteria ??
                    evaluationCriteria.map((item) => item.title)
                  ).map((title) => (
                    <li key={title}>{title}</li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt>부정행위 방지</dt>
              <dd>
                {(folder.antiCheat ?? []).length ? (
                  <ul className="folder-chips">
                    {(folder.antiCheat ?? []).map((id) => (
                      <li key={id}>{ANTI_CHEAT_LABEL[id] ?? id}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="folder-muted">설정 안 함</span>
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="folder-section folder-section--plain">
          <header className="folder-section-head">
            <h2>반별 평가</h2>
          </header>
          <div
            className="teacher-filter-chips folder-filter"
            role="group"
            aria-label="진행 상태 필터"
          >
            {(
              [
                ["ALL", "전체"],
                ["READY", "시작 전"],
                ["IN_PROGRESS", "진행 중"],
                ["ENDED", "종료됨"],
              ] as const
            ).map(([value, label]) => {
              const count =
                value === "ALL"
                  ? folder.sessions.length
                  : folder.sessions.filter((session) => session.state === value)
                      .length;
              return (
                <button
                  key={value}
                  type="button"
                  className={`teacher-filter-chip${filter === value ? " is-active" : ""}`}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {label} {count}
                </button>
              );
            })}
          </div>
          {folder.sessions.length > 0 && visibleSessions.length === 0 && (
            <p className="folder-empty">해당 상태의 반이 없습니다.</p>
          )}
          <div className="teacher-evaluation-list class-evaluation-grid">
            {visibleSessions.map((session) => {
              const done = session.state === "ENDED";
              return (
                <article
                  className={`teacher-card teacher-evaluation-item${done ? " teacher-evaluation-item--done" : ""}`}
                  key={session.id}
                >
                  <div className="evaluation-card-top">
                    <span
                      className={`evaluation-state evaluation-state--${STATE_CLASS[session.state]}`}
                    >
                      {STATE_LABEL[session.state]}
                    </span>
                    {session.state === "READY" && (
                      <span className="evaluation-card-actions">
                        <button
                          type="button"
                          aria-label={`${session.className} 삭제`}
                          title="삭제"
                          onClick={async () => {
                            try {
                              await removeSession(folder.id, session.id);
                              await refresh();
                            } catch (caught) {
                              setNotice(apiErrorMessage(caught, "반을 삭제하지 못했습니다."));
                            }
                          }}
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
                    )}
                  </div>
                  <h2 title={session.className}>{session.className}</h2>
                  <dl>
                    <div>
                      <dt>평가 인원</dt>
                      <dd>
                        {session.state === "READY"
                          ? "-"
                          : `${session.participants}명`}
                      </dd>
                    </div>
                    <div>
                      <dt>제출</dt>
                      <dd>
                        {session.state === "READY"
                          ? "-"
                          : `${session.submitted}/${session.participants}명`}
                      </dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    className="evaluation-card-cta"
                    onClick={() => {
                      if (session.state === "ENDED") {
                        navigate(
                          `/teacher/grading/${encodeURIComponent(session.id)}`,
                        );
                      } else {
                        navigate(
                          `/teacher/folders/${encodeURIComponent(folder.id)}/classes/${encodeURIComponent(session.id)}`,
                        );
                      }
                    }}
                  >
                    {session.state === "READY"
                      ? "평가 시작하러 가기"
                      : session.state === "IN_PROGRESS"
                        ? "수행평가 현황보기"
                        : "채점 결과 보기"}
                  </button>
                </article>
              );
            })}
            <AddClassCard onAddClass={() => setAdding(true)} />
          </div>
        </section>
      </div>

      {adding && (
        <Modal title="반 추가" onClose={() => setAdding(false)}>
          <form className="folder-create-form" onSubmit={submitClass}>
            <TextInput
              label="반 이름"
              maxLength={30}
              value={className}
              error={error}
              placeholder="예) 2학년 4반"
              onChange={(event) => {
                setClassName(event.target.value);
                setError("");
              }}
            />
            <div className="folder-modal-actions">
              <Button type="submit" loading={busy}>추가</Button>
              <Button variant="secondary" onClick={() => setAdding(false)}>
                취소
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {confirmDelete && (
        <Modal
          title="수행평가를 삭제할까요?"
          onClose={() => setConfirmDelete(false)}
          actions={
            <>
              <Button
                variant="white-danger"
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await deleteFolder(folder.id);
                    navigate("/teacher/folders", { replace: true });
                  } catch (caught) {
                    setConfirmDelete(false);
                    setNotice(apiErrorMessage(caught, "수행평가를 삭제하지 못했습니다."));
                    setBusy(false);
                  }
                }}
              >
                삭제
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirmDelete(false)}
              >
                취소
              </Button>
            </>
          }
        >
          <p>
            “{folder.title}” 수행평가와 모든 반별 기록이 삭제되며 되돌릴 수
            없습니다.
          </p>
        </Modal>
      )}
    </main>
  );
}
