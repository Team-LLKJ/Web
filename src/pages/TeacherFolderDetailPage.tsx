import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  setSessionState,
  type SessionState,
} from "../lib/evaluationFolders";
import "../components/teacher/teacher.css";

const POLICY_LABEL = {
  DISABLED: "AI 사용 안 함",
  HINT_ONLY: "힌트만 허용",
  FULL: "전체 응답 허용",
} as const;

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
  const [folder, setFolder] = useState(() => getFolder(folderId));
  const [adding, setAdding] = useState(false);
  const [className, setClassName] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [starting, setStarting] = useState<{ id: string; className: string } | null>(null);
  const [hours, setHours] = useState("1");
  const [minutes, setMinutes] = useState("0");
  const [startError, setStartError] = useState("");
  const [notice, setNotice] = useState("");
  const refresh = () => setFolder(getFolder(folderId));

  if (!folder) {
    return (
      <main className="teacher-page">
        <TeacherHeader />
        <div className="teacher-page-content">
          <p className="teacher-list-state">수행평가를 찾을 수 없습니다.</p>
          <Link className="button button--secondary neutral" to="/teacher/folders">
            내 수행평가로
          </Link>
        </div>
      </main>
    );
  }

  function submitClass(event: FormEvent) {
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
    addSession(folder!.id, value);
    setClassName("");
    setAdding(false);
    refresh();
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
            <p className="folder-sub">
              문항 {folder.questions.length}개 · {POLICY_LABEL[folder.aiPolicy]}
            </p>
          </div>
          <div className="folder-title-actions">
            <Button variant="secondary" onClick={() => setNotice("평가 틀 수정은 서버 API가 준비되면 연결돼요.")}>
              평가 틀 수정
            </Button>
            <Button variant="white-danger" onClick={() => setConfirmDelete(true)}>
              수행평가 삭제
            </Button>
          </div>
        </div>

        <section className="teacher-card folder-section">
          <header className="folder-section-head">
            <h2>평가 틀</h2>
            <span>모든 반이 같은 문제를 풀어요</span>
          </header>
          {folder.description && <p className="folder-desc">{folder.description}</p>}
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

        <section className="folder-section folder-section--plain">
          <header className="folder-section-head">
            <h2>반별 평가</h2>
            <Button variant="white-primary" onClick={() => setAdding(true)}>
              반 추가
            </Button>
          </header>
          {folder.sessions.length ? (
            <div className="teacher-evaluation-list">
              {folder.sessions.map((session) => {
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
                            onClick={() => {
                              removeSession(folder.id, session.id);
                              refresh();
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
                          {session.state === "READY" ? "-" : `${session.participants}명`}
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
                        if (session.state === "READY") {
                          setStartError("");
                          setStarting({ id: session.id, className: session.className });
                        } else {
                          navigate("/teacher/grading");
                        }
                      }}
                    >
                      {session.state === "READY"
                        ? "평가 시작하러 가기"
                        : "수행평가 현황보기"}
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="folder-empty">반을 추가하면 바로 시작할 수 있어요.</p>
          )}
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
              <Button type="submit">추가</Button>
              <Button variant="secondary" onClick={() => setAdding(false)}>
                취소
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {starting && (
        <Modal title={`${starting.className} 시작하기`} onClose={() => setStarting(null)}>
          <form
            className="folder-create-form"
            onSubmit={(event) => {
              event.preventDefault();
              const total = Number(hours || 0) * 60 + Number(minutes || 0);
              if (!Number.isInteger(total) || total < 1 || total > 1440 || Number(minutes) > 59) {
                setStartError("1분 ~ 24시간 사이로 입력해주세요. (분은 0~59)");
                return;
              }
              setSessionState(folder.id, starting.id, "IN_PROGRESS", total);
              navigate("/teacher/grading");
            }}
          >
            <p className="folder-start-desc">
              학생들이 입장할 수 있는 유효 시간을 정하면 평가가 시작돼요.
            </p>
            <fieldset className="teacher-expiry-field">
              <legend>유효 시간</legend>
              <div className="teacher-expiry-inputs" data-error={!!startError}>
                <label>
                  <input type="number" inputMode="numeric" min={0} max={24} value={hours} aria-label="시간" onChange={(e) => { setHours(e.target.value); setStartError(""); }} />
                  시간
                </label>
                <label>
                  <input type="number" inputMode="numeric" min={0} max={59} value={minutes} aria-label="분" onChange={(e) => { setMinutes(e.target.value); setStartError(""); }} />
                  분
                </label>
              </div>
            </fieldset>
            {startError && <p className="input-error">{startError}</p>}
            <div className="folder-modal-actions">
              <Button type="submit">시작하기</Button>
              <Button variant="secondary" onClick={() => setStarting(null)}>취소</Button>
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
                onClick={() => {
                  deleteFolder(folder.id);
                  navigate("/teacher/folders");
                }}
              >
                삭제
              </Button>
              <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
                취소
              </Button>
            </>
          }
        >
          <p>“{folder.title}” 수행평가와 모든 반별 기록이 삭제되며 되돌릴 수 없습니다.</p>
        </Modal>
      )}
    </main>
  );
}
