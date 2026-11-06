import {
  ClassEvaluationCard,
  ClassEvaluationSection,
} from "../components/teacher/ClassEvaluationSection";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { EmptyState } from "../components/ui/EmptyState";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
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
  getCachedFolder,
  getFolder,
  removeSession,
  renameSession,
  type EvaluationFolder,
  type FolderSession,
  type SessionState,
} from "../lib/evaluationFolders";
import { evaluationCriteria } from "../data/landing";
import { guidelinesToSafeHtml } from "../lib/guidelinesText";
import "../components/teacher/teacher.css";
import "../components/teacher/class-card-actions.css";
import "../components/teacher/folder-detail-text.css";
import "../components/teacher/folder-share.css";
import { ShareDialog } from "../components/teacher/ShareDialog";

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

export function TeacherFolderDetailPage() {
  const { folderId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [folder, setFolder] = useState<EvaluationFolder | null>(() =>
    getCachedFolder(folderId),
  );
  const [loadState, setLoadState] = useState<"loading" | "ready" | "missing">(
    () => (getCachedFolder(folderId) ? "ready" : "loading"),
  );
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
  const [shareOpen, setShareOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  // 예전 링크(?share=1)로 들어오면 공유 창을 바로 엽니다.
  const shareRequested = useRef(searchParams.get("share") === "1");
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
          setShareOpen(true);
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
          <EmptyState
            icon="search"
            title="수행평가를 찾을 수 없어요"
            description="삭제됐거나 공유가 해제된 수행평가일 수 있어요."
            action={
              <Link
                className="button button--secondary neutral"
                to="/teacher/folders"
              >
                내 수행평가로
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  const visibleSessions = folder.sessions.filter(
    (session) => filter === "ALL" || session.state === filter,
  );
  // 반 추가 카드는 "전체" 보기에서만 둡니다. 상태별 보기에서 비어 있으면 안내만 보여 줍니다.
  const canAddHere = filter === "ALL";

  const isOwner = folder.role !== "EDITOR";

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
    if (
      folder!.sessions.some((s) => s.id !== target.id && s.className === value)
    ) {
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
        <Toast
          message={notice}
          tone={noticeTone}
          onClose={() => setNotice("")}
        />
        <Link className="folder-back" to="/teacher/folders">
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
          내 수행평가
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
            <button
              type="button"
              className="folder-action"
              onClick={() => setShareOpen(true)}
            >
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
              {isOwner ? "공유" : "공유 멤버"}
              {isOwner && Boolean(folder.collaboratorCount) && (
                <span className="folder-action-count">
                  {folder.collaboratorCount}
                </span>
              )}
            </button>
            <button
              type="button"
              className="folder-action"
              onClick={() =>
                navigate(
                  `/teacher/folders/${encodeURIComponent(folder.id)}/edit`,
                )
              }
            >
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
            </button>
            {!folder.owner && (
              <button
                type="button"
                className="folder-action folder-action--danger"
                onClick={() => setConfirmDelete(true)}
              >
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
              <li className="folder-empty-item">
                <EmptyState
                  size="inline"
                  icon="doc"
                  title="아직 문항이 없어요"
                />
              </li>
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

        <ClassEvaluationSection
          sessions={folder.sessions}
          filter={filter}
          onFilter={setFilter}
        >
          {/* 고른 상태의 반이 없을 때(반이 시작·종료되거나 삭제된 경우 포함) */}
          {visibleSessions.length === 0 && filter !== "ALL" && (
            <EmptyState
              size="panel"
              icon="class"
              title={
                filter === "READY"
                  ? "시작 전인 반이 없어요"
                  : filter === "IN_PROGRESS"
                    ? "진행 중인 반이 없어요"
                    : "종료된 반이 없어요"
              }
              description={
                filter === "READY"
                  ? "새 반은 '전체'에서 추가할 수 있어요."
                  : filter === "IN_PROGRESS"
                    ? "시작 전인 반에서 평가를 시작해 보세요."
                    : "평가를 종료한 반이 여기에 모여요."
              }
            />
          )}
          <div className="teacher-evaluation-list class-evaluation-grid">
            {visibleSessions.map((session) => (
              <ClassEvaluationCard
                key={session.id}
                session={session}
                onRename={() => {
                  setClassName(session.className);
                  setError("");
                  setRenameTarget(session);
                }}
                onRemove={() => setRemoveTarget(session)}
                onOpen={() =>
                  navigate(
                    session.state === "ENDED"
                      ? `/teacher/grading/${encodeURIComponent(session.id)}`
                      : `/teacher/folders/${encodeURIComponent(folder.id)}/classes/${encodeURIComponent(session.id)}`,
                  )
                }
              />
            ))}
            {canAddHere && <AddClassCard onAddClass={() => setAdding(true)} />}
          </div>
        </ClassEvaluationSection>
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
              <Button type="submit" loading={busy}>
                추가
              </Button>
              <Button variant="secondary" onClick={() => setAdding(false)}>
                취소
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {shareOpen && (
        <ShareDialog
          folder={folder}
          onClose={() => setShareOpen(false)}
          onCountChange={(count) =>
            setFolder((current) =>
              current ? { ...current, collaboratorCount: count } : current,
            )
          }
          onLeft={() =>
            navigate("/teacher/folders?tab=shared", { replace: true })
          }
        />
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
              <Button type="submit" loading={busy}>
                저장
              </Button>
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
              <Button
                variant="white-danger"
                loading={busy}
                onClick={() => void confirmRemove()}
              >
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
                    showError(
                      apiErrorMessage(
                        caught,
                        "수행평가를 삭제하지 못했습니다.",
                      ),
                    );
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
