import { ensureProcessPolicy } from "../lib/processRubric";
import { ClassParticipantsSkeleton } from "../components/teacher/ClassParticipantsSkeleton";
import { Skeleton } from "../components/ui/Skeleton";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { EmptyState } from "../components/ui/EmptyState";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { EvaluationStartedScreen } from "../components/teacher/EvaluationStartedScreen";
import { ApiError, apiErrorMessage } from "../api/client";
import { expelParticipant, extendEvaluation, getEvaluationQr, getParticipants } from "../api/evaluations";
import type { Participant } from "../api/types";
import { TeacherHeader } from "../components/teacher/TeacherHeader";
import { Toast } from "../components/teacher/Toast";
import { EvaluationControls } from "../components/ui/EvaluationControls";
import { DurationPicker } from "../components/teacher/DurationPicker";
import { addedMinutes, toEndInfo, type EndInfo } from "../lib/remainingTime";
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
import "../components/teacher/teacher.css";
import "../components/teacher/class-card-actions.css";

const POLL_MS = 2000;

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
  // 서버는 지금 연결된(30초 안에 응답한) 학생이 있어야 시작을 허락합니다.
  const connectedCount = people.filter((person) => person.presence !== "DISCONNECTED").length;
  const [qrResult, setQrResult] = useState<{
    sessionId: string;
    url: string;
  } | null>(null);
  const qrUrl = qrResult?.sessionId === sessionId ? qrResult.url : "";
  const [qrOpen, setQrOpen] = useState(false);
  // 모바일에서는 QR을 처음부터 크게 보여 주므로 따로 확대하지 않습니다.
  const phone = useMediaQuery("(max-width: 1100px)");
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [hours, setHours] = useState("1");
  const [minutes, setMinutes] = useState("0");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [timeToast, setTimeToast] = useState("");
  const [expelTarget, setExpelTarget] = useState<Participant | null>(null);
  const [expelling, setExpelling] = useState(false);
  const lobbyRef = useRef<HTMLDivElement>(null);
  const [lobbyPane, setLobbyPane] = useState<0 | 1>(0);
  const showLobbyPane = (pane: 0 | 1) => {
    const lobby = lobbyRef.current;
    setLobbyPane(pane);
    lobby?.scrollTo({ left: pane === 1 ? lobby.scrollWidth : 0, behavior: "smooth" });
  };
  // 모바일: 옆으로 밀면 아래 전환 칩도 같이 바뀝니다.
  useEffect(() => {
    const lobby = lobbyRef.current;
    if (!lobby) return;
    const sync = () => setLobbyPane(lobby.scrollLeft > lobby.clientWidth / 2 ? 1 : 0);
    lobby.addEventListener("scroll", sync, { passive: true });
    return () => lobby.removeEventListener("scroll", sync);
  });
  const [endInfo, setEndInfo] = useState<EndInfo | null>(null);
  const lastEndsAt = useRef<number | null>(null);
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState(0);
  const [extending, setExtending] = useState(false);
  const [busy, setBusy] = useState(false);
  // 방금 이 화면에서 시작한 반: 화면 공유를 끄고 학생 현황으로 넘어갈 수 있게 시작 안내 화면을 먼저 보여줍니다.
  const [startedHere, setStartedHere] = useState(false);
  const running = session?.state === "IN_PROGRESS";
  // 대기실을 열면(시작 전인데 PIN이 있음) 학생이 미리 들어와 기다릴 수 있습니다.
  const lobbyOpen = Boolean(session?.lobbyOpen);
  const live = running || lobbyOpen;
  const [opening, setOpening] = useState(false);
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
        if (active) {
          setPeopleResult({ sessionId, items: lobby.participants, error: "" });
          if (lobby.endsAt) {
            const endsAt = new Date(lobby.endsAt).getTime();
            const added = addedMinutes(lastEndsAt.current, endsAt);
            if (added > 0) setTimeToast(`평가 시간이 ${added}분 추가되었어요.`);
            lastEndsAt.current = endsAt;
            setEndInfo(toEndInfo(lobby.endsAt, lobby.serverNow));
          }
        }
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

  if (startedHere && session.state === "IN_PROGRESS") {
    return (
      <EvaluationStartedScreen
        evaluationId={session.id}
        folderId={folderId}
      />
    );
  }
  // 대기실은 시작 전에만 씁니다. 평가 중이거나 끝난 반은 바로 학생 현황(채점) 화면으로 보냅니다.
  if (session.state === "IN_PROGRESS" || session.state === "ENDED") {
    return (
      <Navigate
        to={`/teacher/grading/${encodeURIComponent(session.id)}`}
        replace
        state={{ folderId }}
      />
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
    await startWith(total);
  }

  // 평가를 만들 때 정한 풀이 시간이 있으면 바로 시작하고, 없을 때만 시간을 묻습니다.
  function requestStart() {
    // 대기실에 학생이 한 명도 없으면 시작하지 않습니다.
    if (lobbyOpen && connectedCount === 0) {
      setNotice("접속한 학생이 한 명 이상 대기실에 있어야 평가를 시작할 수 있어요.");
      return;
    }
    const preset = folder?.durationMinutes;
    if (preset && preset >= 1 && preset <= 1440) void startWith(preset);
    else setStarting(true);
  }

  async function startWith(total: number) {
    setBusy(true);
    try {
      // AI 루브릭 판정은 시작 전에 저장한 사전 정책이 있어야 돌아가므로, 없으면 먼저 만들어 둡니다.
      // 실패해도 평가 시작은 막지 않습니다(그 경우 루브릭은 교사가 직접 채점).
      await ensureProcessPolicy(session!.id).catch(() => undefined);
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
      setStartedHere(true);
    } catch (caught) {
      const message =
        caught instanceof ApiError && caught.code === "NO_PARTICIPANTS"
          ? "접속한 학생이 한 명 이상 있어야 평가를 시작할 수 있어요."
          : apiErrorMessage(caught, "평가를 시작하지 못했습니다.");
      setError(message);
      setNotice(message);
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
        requestStart();
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
      const next = await endSession(folderId, sessionId);
      setSession(next);
      setEnding(false);
    } catch (caught) {
      setEnding(false);
      setNotice(apiErrorMessage(caught, "평가를 종료하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  // 평가 중·종료된 반은 위에서 채점 화면으로 보내지만, 화면 분기는 그대로 둡니다.
  const sessionState: string = session.state;
  const ended = sessionState === "ENDED";
  const openGrading = () =>
    navigate(`/teacher/grading/${encodeURIComponent(session.id)}`, { state: { folderId } });

  return (
    <main className="teacher-page">
      <TeacherHeader>
        {running ? (
          <Button variant="secondary" onClick={openGrading}>
            학생 현황 보기
          </Button>
        ) : ended ? (
          <>
            <Link
              className="button button--secondary neutral button--small"
              to={`/teacher/folders/${encodeURIComponent(folder.id)}`}
            >
              이전
            </Link>
            <Button onClick={openGrading}>채점 결과 보기</Button>
          </>
        ) : lobbyOpen ? (
          <Button
            loading={busy}
            disabled={connectedCount === 0}
            title={connectedCount === 0 ? "접속한 학생이 한 명 이상 있어야 시작할 수 있어요" : undefined}
            onClick={() => {
              setError("");
              requestStart();
            }}
          >
            평가 시작하기
          </Button>
        ) : (
          <Button loading={opening} onClick={() => void openLobby()}>
            대기실 열기
          </Button>
        )}
      </TeacherHeader>
      <div className="teacher-page-content">
        <Toast message={notice} onClose={() => setNotice("")} />
        <Toast message={timeToast} tone="info" onClose={() => setTimeToast("")} />
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
        {running && (
          <EvaluationControls
            className="lobby-controls"
            endInfo={endInfo}
            onExtend={() => {
              setExtendMinutes(0);
              setExtendOpen(true);
            }}
            onEnd={() => setEnding(true)}
          />
        )}
        <div className="teacher-lobby" ref={lobbyRef}>
          <section className="teacher-card teacher-join-card">
            {live ? (
              <>
                <div>
                  {running && (
                    <p className="teacher-join-hint" role="status">
                      평가가 시작됐어요. 이 화면에서 참여자를 확인할 수 있어요.
                    </p>
                  )}
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
                    <Skeleton className="teacher-lobby-qr teacher-lobby-qr--large" />
                  ) : qrUrl && phone ? (
                    <img
                      className="teacher-lobby-qr teacher-lobby-qr--large"
                      src={qrUrl}
                      alt="학생 참가용 QR 코드"
                    />
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
                {ended ? (
                  <div>
                    <p className="teacher-join-hint">평가가 종료되어 참여 PIN이 닫혔어요.</p>
                    <p className="teacher-join-hint">
                      참여 {session.participants}명 · 제출 {session.submitted}명
                    </p>
                  </div>
                ) : (
                  <p className="teacher-join-hint">
                    대기실을 열면 PIN과 QR 코드가 만들어져요. 학생이 모두 들어오면 평가를 시작하세요.
                  </p>
                )}
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
                    {live && (
                      <button
                        type="button"
                        className="teacher-lobby-expel"
                        aria-label={`${person.nickname} 내보내기`}
                        onClick={() => setExpelTarget(person)}
                      >
                        내보내기
                      </button>
                    )}
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
        <div className="teacher-lobby-pager" role="group" aria-label="대기실 화면 전환">
          <button
            type="button"
            aria-pressed={lobbyPane === 0}
            onClick={() => showLobbyPane(0)}
          >
            PIN
          </button>
          <button
            type="button"
            aria-pressed={lobbyPane === 1}
            onClick={() => showLobbyPane(1)}
          >
            참여자{people.length > 0 ? ` ${people.length}` : ""}
          </button>
        </div>
      </div>
      {qrOpen && qrUrl && !phone && (
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
      {expelTarget && (
        <Modal
          title="참여자 내보내기"
          onClose={() => !expelling && setExpelTarget(null)}
          actions={
            <>
              <Button variant="secondary" disabled={expelling} onClick={() => setExpelTarget(null)}>
                취소
              </Button>
              <Button
                disabled={expelling}
                onClick={async () => {
                  const target = expelTarget;
                  setExpelling(true);
                  try {
                    await expelParticipant(session.id, target.id);
                    setPeopleResult((current) =>
                      current?.sessionId === sessionId && current.items
                        ? { ...current, items: current.items.filter((item) => item.id !== target.id) }
                        : current,
                    );
                    setNotice(`${target.nickname} 학생을 내보냈어요.`);
                    setExpelTarget(null);
                  } catch (caught) {
                    setNotice(apiErrorMessage(caught));
                  } finally {
                    setExpelling(false);
                  }
                }}
              >
                {expelling ? "내보내는 중…" : "내보내기"}
              </Button>
            </>
          }
        >
          <p className="folder-start-desc">
            {expelTarget.nickname} 학생을 내보낼까요? 다시 들어올 수 없고, 이미 쓴 기록은 채점 화면에 남아요.
          </p>
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
      {extendOpen && (
        <Modal title="평가 시간 연장" onClose={() => !extending && setExtendOpen(false)}>
          <form
            className="extend-form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!Number.isInteger(extendMinutes) || extendMinutes < 1 || extendMinutes > 600) {
                setNotice("1분 ~ 10시간(600분) 사이로 입력해주세요.");
                return;
              }
              setExtending(true);
              try {
                await extendEvaluation(session.id, extendMinutes);
                setExtendOpen(false);
              } catch (caught) {
                setNotice(
                  caught instanceof ApiError && caught.code === "EVALUATION_NOT_RUNNING"
                    ? "진행 중인 평가만 시간을 연장할 수 있어요."
                    : apiErrorMessage(caught, "평가 시간을 연장하지 못했습니다."),
                );
              } finally {
                setExtending(false);
              }
            }}
          >
            <p>학생들이 계속 작성할 수 있도록 남은 시간을 늘려요.</p>
            <div className="extend-custom">
              <span>연장할 시간</span>
              <DurationPicker
                hours={Math.floor(extendMinutes / 60)}
                minutes={extendMinutes % 60}
                disabled={extending}
                onChange={(h, m) => setExtendMinutes(h * 60 + m)}
              />
            </div>
            <div className="extend-actions">
              <Button type="submit" loading={extending}>
                연장하기
              </Button>
              <Button variant="secondary" disabled={extending} onClick={() => setExtendOpen(false)}>
                취소
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {ending && (
        <Modal
          title="평가를 종료할까요?"
          onClose={() => !busy && setEnding(false)}
          actions={
            <>
              <Button
                variant="white-danger"
                loading={busy}
                onClick={() => void finish()}
              >
                종료
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => setEnding(false)}>
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
