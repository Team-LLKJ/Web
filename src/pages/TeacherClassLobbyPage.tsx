import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiErrorMessage } from "../api/client";
import { getEvaluationQr, getParticipants } from "../api/evaluations";
import type { Participant } from "../api/types";
import { TeacherHeader } from "../components/teacher/TeacherHeader";
import { Toast } from "../components/teacher/Toast";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { PageLoading } from "../components/ui/PageLoading";
import {
  endSession,
  getFolder,
  startSession,
  type EvaluationFolder,
  type FolderSession,
} from "../lib/evaluationFolders";
import { EmptyParticipantsIcon, ParticipantAvatar } from "./TeacherEvaluationPage";
import "../components/teacher/teacher.css";

const POLL_MS = 3000;

export function TeacherClassLobbyPage() {
  const { folderId = "", sessionId = "" } = useParams();
  const navigate = useNavigate();
  const [folder, setFolder] = useState<EvaluationFolder | null>(null);
  const [session, setSession] = useState<FolderSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<Participant[]>([]);
  const [qrUrl, setQrUrl] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [hours, setHours] = useState("1");
  const [minutes, setMinutes] = useState("0");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const running = session?.state === "IN_PROGRESS";

  useEffect(() => {
    let active = true;
    getFolder(folderId)
      .then((next) => {
        if (!active) return;
        setFolder(next);
        setSession(next.sessions.find((item) => item.id === sessionId) ?? null);
      })
      .catch((caught) => {
        if (active) setNotice(apiErrorMessage(caught, "반 정보를 불러오지 못했습니다."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [folderId, sessionId]);

  // 시작된 반만 PIN이 있고, 참여자는 주기적으로 새로 받아 옵니다.
  const refreshPeople = useCallback(async () => {
    const lobby = await getParticipants(sessionId);
    setPeople(lobby.participants);
  }, [sessionId]);

  useEffect(() => {
    if (!running) return;
    let active = true;
    const load = () => {
      refreshPeople().catch(() => {
        /* 일시적인 오류는 다음 주기에 다시 시도합니다. */
      });
    };
    load();
    const timer = window.setInterval(() => {
      if (active) load();
    }, POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [running, refreshPeople]);

  useEffect(() => {
    if (!running) return;
    let active = true;
    let objectUrl = "";
    getEvaluationQr(sessionId)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setQrUrl(objectUrl);
      })
      .catch((caught) => {
        if (active) setNotice(apiErrorMessage(caught, "QR 이미지를 불러오지 못했습니다."));
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [running, sessionId]);

  if (loading) return <PageLoading layout="lobby" />;

  if (!folder || !session) {
    return (
      <main className="teacher-page">
        <TeacherHeader />
        <div className="teacher-page-content">
          <Toast message={notice} onClose={() => setNotice("")} />
          <p className="teacher-list-state">반을 찾을 수 없습니다.</p>
        </div>
      </main>
    );
  }

  async function start(event: FormEvent) {
    event.preventDefault();
    const total = Number(hours || 0) * 60 + Number(minutes || 0);
    if (!Number.isInteger(total) || total < 1 || total > 1440 || Number(minutes) > 59) {
      setError("1분 ~ 24시간 사이로 입력해주세요. (분은 0~59)");
      return;
    }
    setBusy(true);
    try {
      const next = await startSession(folder!.id, session!.id, total);
      setSession(next);
      setStarting(false);
    } catch (caught) {
      setError(apiErrorMessage(caught, "평가를 시작하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    try {
      await endSession(folder!.id, session!.id);
      navigate(`/teacher/grading/${encodeURIComponent(session!.id)}`, { replace: true });
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
              onClick={() => navigate(`/teacher/grading/${encodeURIComponent(session.id)}`)}
            >
              학생 현황 보기
            </Button>
            <Button variant="white-danger" onClick={() => setEnding(true)}>
              평가 종료하기
            </Button>
          </>
        ) : ended ? (
          <Button onClick={() => navigate(`/teacher/grading/${encodeURIComponent(session.id)}`)}>
            채점 결과 보기
          </Button>
        ) : (
          <Button
            onClick={() => {
              setError("");
              setStarting(true);
            }}
          >
            평가 시작하기
          </Button>
        )}
      </TeacherHeader>
      <div className="teacher-page-content">
        <Toast message={notice} onClose={() => setNotice("")} />
        <h1 className="lobby-title">
          {folder.title}
          <span>{session.className}</span>
        </h1>
        <div className="teacher-lobby">
          <section className="teacher-card teacher-join-card">
            {running ? (
              <>
                <div>
                  <p className="teacher-join-label">참여 PIN</p>
                  <p className="teacher-lobby-pin">{session.pin ?? "------"}</p>
                  <p className="teacher-join-hint">QR코드를 스캔하거나 PIN을 입력해 참여하세요</p>
                </div>
                <div className="teacher-join-qr">
                  {qrUrl && (
                    <button
                      type="button"
                      className="teacher-lobby-qr-button"
                      aria-label="QR 코드 크게 보기"
                      onClick={() => setQrOpen(true)}
                    >
                      <img className="teacher-lobby-qr" src={qrUrl} alt="학생 참가용 QR 코드" />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div>
                <p className="teacher-join-label">참여 PIN</p>
                <p className="teacher-join-hint">
                  {ended
                    ? "종료된 평가입니다."
                    : "평가를 시작하면 참여 PIN과 QR 코드가 만들어져요."}
                </p>
              </div>
            )}
          </section>
          <section className="teacher-card teacher-lobby-people">
            <div className="teacher-lobby-people-head">
              <h2>
                참여자 {people.length > 0 && <span>{people.length}명</span>}
              </h2>
            </div>
            {people.length ? (
              <ul className="teacher-lobby-pills">
                {people.map((person) => (
                  <li key={person.id} className="teacher-lobby-pill">
                    <ParticipantAvatar name={person.nickname} />
                    <span>{person.nickname}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="teacher-lobby-empty">
                <EmptyParticipantsIcon />
                <p>{running ? "참여자를 기다리고 있습니다." : "평가를 시작하면 참여자가 여기에 보여요."}</p>
              </div>
            )}
          </section>
        </div>
      </div>
      {qrOpen && qrUrl && (
        <Modal
          title="참여 QR 코드"
          className="teacher-qr-modal"
          onClose={() => setQrOpen(false)}
          actions={<Button onClick={() => setQrOpen(false)}>확인</Button>}
        >
          <img className="teacher-qr-large" src={qrUrl} alt="학생 참가용 QR 코드 (확대)" />
        </Modal>
      )}
      {starting && (
        <Modal title={`${session.className} 시작하기`} onClose={() => setStarting(false)}>
          <form className="folder-create-form" onSubmit={start}>
            <p className="folder-start-desc">학생들이 입장할 수 있는 유효 시간을 정하면 평가가 시작돼요.</p>
            <fieldset className="teacher-expiry-field">
              <legend>유효 시간</legend>
              <div className="teacher-expiry-inputs" data-error={!!error}>
                <label>
                  <input type="number" inputMode="numeric" min={0} max={24} value={hours} aria-label="시간" onChange={(e) => { setHours(e.target.value); setError(""); }} />
                  시간
                </label>
                <label>
                  <input type="number" inputMode="numeric" min={0} max={59} value={minutes} aria-label="분" onChange={(e) => { setMinutes(e.target.value); setError(""); }} />
                  분
                </label>
              </div>
            </fieldset>
            {error && <p className="input-error">{error}</p>}
            <div className="folder-modal-actions">
              <Button type="submit" loading={busy}>시작하기</Button>
              <Button variant="secondary" onClick={() => setStarting(false)}>취소</Button>
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
              <Button variant="white-danger" loading={busy} onClick={() => void finish()}>
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
