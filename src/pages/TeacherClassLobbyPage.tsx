import { ClassParticipantsSkeleton } from "../components/teacher/ClassParticipantsSkeleton";
import { Skeleton } from "../components/ui/Skeleton";
import { useEffect, useState, type FormEvent } from "react";
import { EmptyState } from "../components/ui/EmptyState";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, apiErrorMessage } from "../api/client";
import { getEvaluationQr, getParticipants } from "../api/evaluations";
import type { Participant } from "../api/types";
import { TeacherHeader } from "../components/teacher/TeacherHeader";
import { Toast } from "../components/teacher/Toast";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { PageLoading } from "../components/ui/PageLoading";
import {
  endSession,
  getCachedFolder,
  getFolder,
  openSessionLobby,
  startSession,
  type EvaluationFolder,
  type FolderSession,
} from "../lib/evaluationFolders";
import { ParticipantAvatar } from "./TeacherEvaluationPage";
import { ProcessPolicyDialog } from "../components/teacher/ProcessPolicyDialog";
import "../components/teacher/teacher.css";
import "../components/teacher/class-card-actions.css";

const POLL_MS = 3000;

export function TeacherClassLobbyPage() {
  const { folderId = "", sessionId = "" } = useParams();
  const navigate = useNavigate();
  // 상세 화면에서 넘어오면 이미 받은 정보로 바로 그리고, 뒤에서 새로 받아 옵니다.
  const [folder, setFolder] = useState<EvaluationFolder | null>(() =>
    getCachedFolder(folderId),
  );
  const [session, setSession] = useState<FolderSession | null>(
    () =>
      getCachedFolder(folderId)?.sessions.find(
        (item) => item.id === sessionId,
      ) ?? null,
  );
  const [loading, setLoading] = useState(
    () =>
      !getCachedFolder(folderId)?.sessions.some(
        (item) => item.id === sessionId,
      ),
  );
  const [peopleResult, setPeopleResult] = useState<{
    sessionId: string;
    items: Participant[] | null;
    error: string;
  } | null>(null);
  const peopleSnapshot =
    peopleResult?.sessionId === sessionId ? peopleResult : null;
  const people = peopleSnapshot?.items ?? [];
  const [qrResult, setQrResult] = useState<{
    sessionId: string;
    url: string;
  } | null>(null);
  const qrUrl = qrResult?.sessionId === sessionId ? qrResult.url : "";
  const [qrOpen, setQrOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [hours, setHours] = useState("1");
  const [minutes, setMinutes] = useState("0");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const running = session?.state === "IN_PROGRESS";
  // 대기실을 열면(시작 전인데 PIN이 있음) 학생이 미리 들어와 기다릴 수 있습니다.
  const lobbyOpen = Boolean(session?.lobbyOpen);
  const live = running || lobbyOpen;
  const [opening, setOpening] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const peopleLoading = live && !peopleSnapshot;
  const qrLoading = live && qrResult?.sessionId !== sessionId;

  useEffect(() => {
    let active = true;
    getFolder(folderId)
      .then((next) => {
        if (!active) return;
        setFolder(next);
        const found =
          next.sessions.find((item) => item.id === sessionId) ?? null;
        setSession(found);
      })
      .catch((caught) => {
        if (active)
          setNotice(apiErrorMessage(caught, "반 정보를 불러오지 못했습니다."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [folderId, sessionId]);

  // 처음 조회하는 동안에는 빈 참가자 안내를 표시하지 않습니다.
  // 주기 갱신 중에는 이미 받은 목록을 유지하고, 이전 반의 응답은 무시합니다.
  useEffect(() => {
    if (!live) return;
    let active = true;
    let inFlight = false;
    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const lobby = await getParticipants(sessionId);
        if (active)
          setPeopleResult({ sessionId, items: lobby.participants, error: "" });
      } catch (caught) {
        if (active)
          setPeopleResult((current) => ({
            sessionId,
            items: current?.sessionId === sessionId ? current.items : null,
            error: apiErrorMessage(
              caught,
              "참가자를 불러오지 못했습니다. 잠시 후 다시 확인합니다.",
            ),
          }));
      } finally {
        inFlight = false;
      }
    };
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [live, sessionId]);

  useEffect(() => {
    if (!live) return;
    let active = true;
    let objectUrl = "";
    getEvaluationQr(sessionId)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setQrResult({ sessionId, url: objectUrl });
      })
      .catch((caught) => {
        if (active) {
          setQrResult({ sessionId, url: "" });
          setNotice(
            apiErrorMessage(caught, "QR 이미지를 불러오지 못했습니다."),
          );
        }
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [live, sessionId]);

  if (loading) return <PageLoading layout="lobby" />;

  if (!folder || !session) {
    return (
      <main className="teacher-page">
        <TeacherHeader />
        <div className="teacher-page-content">
          <Toast message={notice} onClose={() => setNotice("")} />
          <EmptyState
            icon="search"
            title="반을 찾을 수 없어요"
            description="삭제된 반이거나 주소가 잘못됐을 수 있어요."
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

  async function start(event: FormEvent) {
    event.preventDefault();
    const total = Number(hours || 0) * 60 + Number(minutes || 0);
    if (
      !Number.isInteger(total) ||
      total < 1 ||
      total > 1440 ||
      Number(minutes) > 59
    ) {
      setError("1분 ~ 24시간 사이로 입력해주세요. (분은 0~59)");
      return;
    }
    setBusy(true);
    try {
      let next;
      try {
        next = await startSession(folder!.id, session!.id, total);
      } catch (caught) {
        // 대기실을 먼저 열어야 하는 서버면 대기실을 열고 바로 시작합니다.
        if (!(caught instanceof ApiError && caught.code === "CLASS_LOBBY_REQUIRED")) throw caught;
        await openSessionLobby(folder!.id, session!.id);
        next = await startSession(folder!.id, session!.id, total);
      }
      setSession(next);
      setStarting(false);
    } catch (caught) {
      setError(apiErrorMessage(caught, "평가를 시작하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  async function openLobby() {
    setOpening(true);
    try {
      const next = await openSessionLobby(folder!.id, session!.id);
      setSession(next);
    } catch (caught) {
      // 대기실 API가 아직 없는 서버면 예전처럼 바로 시작 창을 엽니다.
      const missing =
        caught instanceof ApiError &&
        (caught.status === 405 ||
          (caught.status === 404 &&
            caught.code !== "ASSESSMENT_NOT_FOUND" &&
            caught.code !== "CLASS_NOT_FOUND"));
      if (missing) {
        setError("");
        setStarting(true);
      } else {
        setNotice(apiErrorMessage(caught, "대기실을 열지 못했습니다."));
      }
    } finally {
      setOpening(false);
    }
  }

  async function finish() {
    setBusy(true);
    try {
      await endSession(folder!.id, session!.id);
      navigate(`/teacher/grading/${encodeURIComponent(session!.id)}`, {
        replace: true,
      });
    } catch (caught) {
      setEnding(false);
      setNotice(apiErrorMessage(caught, "평가를 종료하지 못했습니다."));
      setBusy(false);
    }
  }

  const ended = session.state === "ENDED";

  return (
    <main className="teacher-page">
      <TeacherHeader>
        {running ? (
          <>
            <Button
              variant="secondary"
              onClick={() =>
                navigate(`/teacher/grading/${encodeURIComponent(session.id)}`)
              }
            >
              학생 현황 보기
            </Button>
            <Button variant="white-danger" onClick={() => setEnding(true)}>
              평가 종료하기
            </Button>
          </>
        ) : ended ? (
          <Button
            onClick={() =>
              navigate(`/teacher/grading/${encodeURIComponent(session.id)}`)
            }
          >
            채점 결과 보기
          </Button>
        ) : lobbyOpen ? (
          <>
          <Button variant="secondary" onClick={() => setPolicyOpen(true)}>
            과정 평가 설정
          </Button>
          <Button
            onClick={() => {
              setError("");
              setStarting(true);
            }}
          >
            평가 시작하기
          </Button>
          </>
        ) : (
          <>
          <Button variant="secondary" onClick={() => setPolicyOpen(true)}>
            과정 평가 설정
          </Button>
          <Button loading={opening} onClick={() => void openLobby()}>
            대기실 열기
          </Button>
          </>
        )}
      </TeacherHeader>
      <div className="teacher-page-content">
        <Toast message={notice} onClose={() => setNotice("")} />
        <Link
          className="folder-back"
          to={`/teacher/folders/${encodeURIComponent(folder.id)}`}
        >
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
          수행평가로
        </Link>
        <h1 className="lobby-title">
          {folder.title}
          <span>{session.className}</span>
        </h1>
        <div className="teacher-lobby">
          <section className="teacher-card teacher-join-card">
            {live ? (
              <>
                <div>
                  <p className="teacher-join-label">참여 PIN</p>
                  <p className="teacher-lobby-pin">{session.pin ?? "------"}</p>
                  <p className="teacher-join-hint">
                    {running
                      ? "QR코드를 스캔하거나 PIN을 입력해 참여하세요"
                      : "QR코드를 스캔하거나 PIN을 입력해 들어와 기다려주세요"}
                  </p>
                </div>
                <div className="teacher-join-qr">
                  {qrLoading ? (
                    <Skeleton className="teacher-lobby-qr" />
                  ) : qrUrl ? (
                    <button
                      type="button"
                      className="teacher-lobby-qr-button"
                      aria-label="QR 코드 크게 보기"
                      onClick={() => setQrOpen(true)}
                    >
                      <img
                        className="teacher-lobby-qr"
                        src={qrUrl}
                        alt="학생 참가용 QR 코드"
                      />
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <div>
                <p className="teacher-join-label">참여 PIN</p>
                <p className="teacher-join-hint">
                  {ended
                    ? "종료된 평가입니다."
                    : "대기실을 열면 PIN과 QR 코드가 만들어져요. 학생이 모두 들어오면 평가를 시작하세요."}
                </p>
              </div>
            )}
          </section>
          <section className="teacher-card teacher-lobby-people">
            <div className="teacher-lobby-people-head">
              <h2>
                참여자{" "}
                {peopleLoading ? (
                  <Skeleton className="class-evaluation-count" />
                ) : (
                  people.length > 0 && <span>{people.length}명</span>
                )}
              </h2>
            </div>
            {peopleSnapshot?.error && (
              <p role="alert" className="teacher-hint">
                {peopleSnapshot.error}
              </p>
            )}
            {peopleLoading ? (
              <ClassParticipantsSkeleton />
            ) : peopleSnapshot?.items === null ? null : people.length ? (
              <ul className="teacher-lobby-pills">
                {people.map((person) => (
                  <li key={person.id} className="teacher-lobby-pill">
                    <ParticipantAvatar name={person.nickname} />
                    <span>{person.nickname}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                size="panel"
                icon="users"
                title={
                  live ? "참여자를 기다리고 있어요" : "아직 참여자가 없어요"
                }
                description={
                  live
                    ? "학생이 PIN이나 QR로 들어오면 여기에 보여요."
                    : "대기실을 열면 들어온 학생이 여기에 보여요."
                }
              />
            )}
          </section>
        </div>
      </div>
      {policyOpen && (
        <ProcessPolicyDialog
          evaluationId={session.id}
          onClose={() => setPolicyOpen(false)}
        />
      )}
      {qrOpen && qrUrl && (
        <Modal
          title="참여 QR 코드"
          className="teacher-qr-modal"
          onClose={() => setQrOpen(false)}
          actions={<Button onClick={() => setQrOpen(false)}>확인</Button>}
        >
          <img
            className="teacher-qr-large"
            src={qrUrl}
            alt="학생 참가용 QR 코드 (확대)"
          />
        </Modal>
      )}
      {starting && (
        <Modal
          title={`${session.className} 시작하기`}
          onClose={() => setStarting(false)}
        >
          <form className="folder-create-form" onSubmit={start}>
            <p className="folder-start-desc">
              {lobbyOpen
                ? "풀이 시간을 정해주세요. 시작하면 대기실에 있는 학생들의 타이머가 함께 시작되고, 시작한 뒤에도 학생이 들어올 수 있어요."
                : "풀이 시간을 정해주세요. 시작하면 PIN과 QR 코드가 만들어지고, 학생은 시작한 뒤에도 들어올 수 있어요."}
            </p>
            <fieldset className="teacher-expiry-field">
              <legend>풀이 시간</legend>
              <div className="teacher-expiry-inputs" data-error={!!error}>
                <label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={24}
                    value={hours}
                    aria-label="시간"
                    onChange={(e) => {
                      setHours(e.target.value);
                      setError("");
                    }}
                  />
                  시간
                </label>
                <label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={59}
                    value={minutes}
                    aria-label="분"
                    onChange={(e) => {
                      setMinutes(e.target.value);
                      setError("");
                    }}
                  />
                  분
                </label>
              </div>
            </fieldset>
            {error && <p className="input-error">{error}</p>}
            <div className="folder-modal-actions">
              <Button type="submit" loading={busy}>
                시작하기
              </Button>
              <Button variant="secondary" onClick={() => setStarting(false)}>
                취소
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {ending && (
        <Modal
          title="평가를 종료할까요?"
          onClose={() => setEnding(false)}
          actions={
            <>
              <Button
                variant="white-danger"
                loading={busy}
                onClick={() => void finish()}
              >
                종료
              </Button>
              <Button variant="secondary" onClick={() => setEnding(false)}>
                취소
              </Button>
            </>
          }
        >
          <p>종료하면 학생들은 더 이상 답안을 수정할 수 없어요.</p>
        </Modal>
      )}
    </main>
  );
}
