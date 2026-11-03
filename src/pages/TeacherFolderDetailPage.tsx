import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiErrorMessage } from "../api/client";
import { useAuth } from "../auth/useAuth";
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
  listCollaborators,
  removeSession,
  renameSession,
  shareFolder,
  unshareFolder,
  type EvaluationFolder,
  type FolderCollaborator,
  type FolderSession,
  type SessionState,
} from "../lib/evaluationFolders";
import { evaluationCriteria } from "../data/landing";
import { guidelinesToSafeHtml } from "../lib/guidelinesText";
import "../components/teacher/teacher.css";
import "../components/teacher/class-card-actions.css";
import "../components/teacher/folder-detail-text.css";
import "../components/teacher/folder-share.css";

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
  const [renameTarget, setRenameTarget] = useState<FolderSession | null>(null);
  const [removeTarget, setRemoveTarget] = useState<FolderSession | null>(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [filter, setFilter] = useState<"ALL" | SessionState>("ALL");
  const [notice, setNotice] = useState(
    (location.state as { notice?: string } | null)?.notice ?? "",
  );
  const [noticeTone, setNoticeTone] = useState<"error" | "info">("info");
  function showError(message: string) {
    setNoticeTone("error");
    setNotice(message);
  }
  const { user } = useAuth();
  const [shareOpen, setShareOpen] = useState(false);
  const [collaborators, setCollaborators] = useState<FolderCollaborator[] | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  // 목록 카드의 공유 아이콘으로 들어오면(?share=1) 공유 창을 바로 엽니다.
  const shareRequested = useRef(searchParams.get("share") === "1");
  async function loadShare(id: string) {
    setShareOpen(true);
    setShareEmail("");
    setShareError("");
    setCollaborators(null);
    try {
      setCollaborators(await listCollaborators(id));
    } catch (caught) {
      setShareError(apiErrorMessage(caught, "공유 목록을 불러오지 못했습니다."));
      setCollaborators([]);
    }
  }
  const refresh = async () => {
    try {
      setFolder(await getFolder(folderId));
      setLoadState("ready");
    } catch (error) {
      showError(apiErrorMessage(error, "수행평가를 불러오지 못했습니다."));
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
        if (shareRequested.current) {
          shareRequested.current = false;
          setSearchParams({}, { replace: true });
          void loadShare(next.id);
        }
      })
      .catch((error) => {
        if (!active) return;
        showError(apiErrorMessage(error, "수행평가를 불러오지 못했습니다."));
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

  const isOwner = folder.role !== "EDITOR";

  async function openShare() {
    await loadShare(folder!.id);
  }

  async function submitShare(event: FormEvent) {
    event.preventDefault();
    const email = shareEmail.trim();
    if (!email) {
      setShareError("공유할 선생님의 이메일을 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      const added = await shareFolder(folder!.id, email);
      setCollaborators((current) => [...(current ?? []), added]);
      setShareEmail("");
      setShareError("");
      setFolder((current) =>
        current ? { ...current, collaboratorCount: (current.collaboratorCount ?? 0) + 1 } : current,
      );
    } catch (caught) {
      setShareError(apiErrorMessage(caught, "공유하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  async function removeShare(target: FolderCollaborator) {
    const leaving = target.teacherId === user?.id;
    setBusy(true);
    try {
      await unshareFolder(folder!.id, target.teacherId);
      if (leaving) {
        navigate("/teacher/folders?tab=shared", { replace: true });
        return;
      }
      setCollaborators((current) => (current ?? []).filter((item) => item.teacherId !== target.teacherId));
      setFolder((current) =>
        current
          ? { ...current, collaboratorCount: Math.max(0, (current.collaboratorCount ?? 1) - 1) }
          : current,
      );
    } catch (caught) {
      setShareError(apiErrorMessage(caught, "공유를 해제하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

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

  async function submitRename(event: FormEvent) {
    event.preventDefault();
    const target = renameTarget;
    if (!target) return;
    const value = className.trim();
    if (!value || value.length > 30) {
      setError("반 이름을 30자 이내로 입력해주세요.");
      return;
    }
    if (value === target.className) {
      setRenameTarget(null);
      return;
    }
    if (folder!.sessions.some((s) => s.id !== target.id && s.className === value)) {
      setError("이미 있는 반 이름입니다.");
      return;
    }
    setBusy(true);
    try {
      await renameSession(folder!.id, target.id, value);
      setRenameTarget(null);
      setClassName("");
      await refresh();
    } catch (caught) {
      setError(apiErrorMessage(caught, "반 이름을 수정하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  async function confirmRemove() {
    const target = removeTarget;
    if (!target) return;
    setBusy(true);
    try {
      await removeSession(folder!.id, target.id);
      setRemoveTarget(null);
      await refresh();
    } catch (caught) {
      setRemoveTarget(null);
      showError(apiErrorMessage(caught, "반을 삭제하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="teacher-page">
      <TeacherHeader />
      <div className="teacher-page-content">
        <Toast message={notice} tone={noticeTone} onClose={() => setNotice("")} />
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
            <button type="button" className="folder-action" onClick={() => void openShare()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9.5" cy="8" r="3.5" /><path d="M3 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M19 8v6M16 11h6" /></svg>
              {isOwner ? "공유" : "공유 멤버"}
              {isOwner && Boolean(folder.collaboratorCount) && (
                <span className="folder-action-count">{folder.collaboratorCount}</span>
              )}
            </button>
            <button
              type="button"
              className="folder-action"
              onClick={() => navigate(`/teacher/folders/${encodeURIComponent(folder.id)}/edit`)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="M14.5 7.5l3 3" /></svg>
              수정
            </button>
            {!folder.owner && (
              <button
                type="button"
                className="folder-action folder-action--danger"
                onClick={() => setConfirmDelete(true)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></svg>
                삭제
              </button>
            )}
          </div>
        </div>

        <section className="teacher-card folder-section">
          <header className="folder-section-head">
            <h2>평가 정보</h2>
          </header>
          {folder.guidelines.trim() && (
            <div
              className="folder-desc folder-guidelines"
              dangerouslySetInnerHTML={{
                __html: guidelinesToSafeHtml(folder.guidelines),
              }}
            />
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
                    <span className="evaluation-card-actions">
                      <button
                        type="button"
                        aria-label={`${session.className} 이름 수정`}
                        title="수정"
                        onClick={() => {
                          setClassName(session.className);
                          setError("");
                          setRenameTarget(session);
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
                          <path d="M14.5 7.5l3 3" />
                        </svg>
                      </button>
                      {session.state !== "IN_PROGRESS" && (
                        <button
                          type="button"
                          aria-label={`${session.className} 삭제`}
                          title="삭제"
                          onClick={() => setRemoveTarget(session)}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M4 7h16" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M6 7l1 13h10l1-13" />
                            <path d="M9 7V4h6v3" />
                          </svg>
                        </button>
                      )}
                    </span>
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
      {shareOpen && (
        <Modal title={isOwner ? "수행평가 공유" : "공유 멤버"} onClose={() => setShareOpen(false)}>
          <div className="folder-share">
            {isOwner && (
              <form className="folder-create-form" onSubmit={submitShare}>
                <TextInput
                  label="선생님 이메일"
                  type="email"
                  value={shareEmail}
                  placeholder="teacher@example.com"
                  error={shareError}
                  onChange={(event) => {
                    setShareEmail(event.target.value);
                    setShareError("");
                  }}
                />
                <div className="folder-modal-actions">
                  <Button type="submit" loading={busy}>공유하기</Button>
                </div>
              </form>
            )}
            {!isOwner && shareError && <p className="input-error">{shareError}</p>}
            <ul className="folder-share-list">
              {collaborators === null ? (
                <li className="folder-share-empty">불러오는 중…</li>
              ) : (
                <>
                  {folder.owner && (
                    <li>
                      <span>
                        <strong>{folder.owner}</strong>
                        <small>만든 선생님</small>
                      </span>
                    </li>
                  )}
                  {collaborators.length === 0 && !folder.owner && (
                    <li className="folder-share-empty">아직 공유한 선생님이 없어요.</li>
                  )}
                  {collaborators.map((item) => (
                    <li key={item.teacherId}>
                      <span>
                        <strong>{item.name}</strong>
                        <small>{item.email} · 공동 편집</small>
                      </span>
                      {(isOwner || item.teacherId === user?.id) && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void removeShare(item)}
                        >
                          {item.teacherId === user?.id ? "나가기" : "해제"}
                        </button>
                      )}
                    </li>
                  ))}
                </>
              )}
            </ul>
          </div>
        </Modal>
      )}
      {renameTarget && (
        <Modal title="반 이름 수정" onClose={() => setRenameTarget(null)}>
          <form className="folder-create-form" onSubmit={submitRename}>
            <TextInput
              label="반 이름"
              maxLength={30}
              value={className}
              error={error}
              onChange={(event) => {
                setClassName(event.target.value);
                setError("");
              }}
            />
            <div className="folder-modal-actions">
              <Button type="submit" loading={busy}>저장</Button>
              <Button variant="secondary" onClick={() => setRenameTarget(null)}>
                취소
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {removeTarget && (
        <Modal
          title={`${removeTarget.className}을 삭제할까요?`}
          onClose={() => setRemoveTarget(null)}
          actions={
            <>
              <Button variant="white-danger" loading={busy} onClick={() => void confirmRemove()}>
                삭제
              </Button>
              <Button variant="secondary" onClick={() => setRemoveTarget(null)}>
                취소
              </Button>
            </>
          }
        >
          <p>
            {removeTarget.state === "ENDED"
              ? "이 반의 참가자·답안·채점 기록이 모두 삭제되며 되돌릴 수 없습니다."
              : "아직 시작하지 않은 반을 삭제합니다."}
          </p>
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
                    showError(apiErrorMessage(caught, "수행평가를 삭제하지 못했습니다."));
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
