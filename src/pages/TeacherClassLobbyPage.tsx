import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TeacherHeader } from "../components/teacher/TeacherHeader";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { getFolder, setSessionState } from "../lib/evaluationFolders";
import { EmptyParticipantsIcon, ParticipantAvatar } from "./TeacherEvaluationPage";
import "../components/teacher/teacher.css";

const MOCK_NAMES = ["김민준", "이서윤", "박지호", "최하은", "정우진", "한유나", "오세현", "윤다인"];

// 서버 API가 연결되기 전까지 보여 주는 임시 PIN·QR입니다.
function mockPin(seed: string) {
  let hash = 7;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 1000000;
  return String(hash).padStart(6, "0");
}

function mockQr(seed: string) {
  const size = 25;
  let state = 0;
  for (const char of seed) state = (state * 33 + char.charCodeAt(0)) >>> 0;
  const rand = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
  const finder = (x: number, y: number) =>
    [[0, 0], [size - 7, 0], [0, size - 7]].some(
      ([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7,
    );
  let rects = "";
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (finder(x, y)) continue;
      if (rand() > 0.52) rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }
  }
  const eye = (fx: number, fy: number) =>
    `<rect x="${fx}" y="${fy}" width="7" height="7"/><rect x="${fx + 1}" y="${fy + 1}" width="5" height="5" fill="#fff"/><rect x="${fx + 2}" y="${fy + 2}" width="3" height="3"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ${size + 2} ${size + 2}" shape-rendering="crispEdges"><rect x="-1" y="-1" width="${size + 2}" height="${size + 2}" fill="#fff"/><g fill="#111">${rects}${eye(0, 0)}${eye(size - 7, 0)}${eye(0, size - 7)}</g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function TeacherClassLobbyPage() {
  const { folderId = "", sessionId = "" } = useParams();
  const navigate = useNavigate();
  const folder = getFolder(folderId);
  const session = folder?.sessions.find((item) => item.id === sessionId);
  const pin = useMemo(() => mockPin(sessionId), [sessionId]);
  const qr = useMemo(() => mockQr(sessionId), [sessionId]);
  const [people, setPeople] = useState<string[]>([]);
  const [qrOpen, setQrOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [hours, setHours] = useState("1");
  const [minutes, setMinutes] = useState("0");
  const [error, setError] = useState("");

  // 학생이 하나씩 들어오는 모습을 임시로 보여 줍니다.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setPeople((current) =>
        current.length >= MOCK_NAMES.length ? current : [...current, MOCK_NAMES[current.length]],
      );
    }, 2500);
    return () => window.clearInterval(timer);
  }, []);

  if (!folder || !session) {
    return (
      <main className="teacher-page">
        <TeacherHeader />
        <div className="teacher-page-content">
          <p className="teacher-list-state">반을 찾을 수 없습니다.</p>
        </div>
      </main>
    );
  }

  function start(event: FormEvent) {
    event.preventDefault();
    const total = Number(hours || 0) * 60 + Number(minutes || 0);
    if (!Number.isInteger(total) || total < 1 || total > 1440 || Number(minutes) > 59) {
      setError("1분 ~ 24시간 사이로 입력해주세요. (분은 0~59)");
      return;
    }
    setSessionState(folder!.id, session!.id, "IN_PROGRESS", total);
    navigate("/teacher/grading");
  }

  return (
    <main className="teacher-page">
      <TeacherHeader onLeave={() => navigate(`/teacher/folders/${folder.id}`)}>
        <Button disabled={people.length === 0} onClick={() => { setError(""); setStarting(true); }}>
          평가 시작하기
        </Button>
      </TeacherHeader>
      <div className="teacher-page-content">
        <h1 className="lobby-title">
          {folder.title}
          <span>{session.className}</span>
        </h1>
        <div className="teacher-lobby">
          <section className="teacher-card teacher-join-card">
            <div>
              <p className="teacher-join-label">참여 PIN</p>
              <p className="teacher-lobby-pin">{pin}</p>
              <p className="teacher-join-hint">QR코드를 스캔하거나 PIN을 입력해 참여하세요</p>
            </div>
            <div className="teacher-join-qr">
              <button
                type="button"
                className="teacher-lobby-qr-button"
                aria-label="QR 코드 크게 보기"
                onClick={() => setQrOpen(true)}
              >
                <img className="teacher-lobby-qr" src={qr} alt="학생 참가용 QR 코드" />
              </button>
            </div>
          </section>
          <section className="teacher-card teacher-lobby-people">
            <div className="teacher-lobby-people-head">
              <h2>참여자 {people.length > 0 && <span>{people.length}명</span>}</h2>
            </div>
            {people.length ? (
              <ul className="teacher-lobby-pills">
                {people.map((name) => (
                  <li key={name} className="teacher-lobby-pill">
                    <ParticipantAvatar name={name} />
                    <span>{name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="teacher-lobby-empty">
                <EmptyParticipantsIcon />
                <p>참여자를 기다리고 있습니다.</p>
                <small>연결된 학생이 1명 이상이어야 평가를 시작할 수 있습니다.</small>
              </div>
            )}
          </section>
        </div>
      </div>
      {qrOpen && (
        <Modal
          title="참여 QR 코드"
          className="teacher-qr-modal"
          onClose={() => setQrOpen(false)}
          actions={<Button onClick={() => setQrOpen(false)}>확인</Button>}
        >
          <img className="teacher-qr-large" src={qr} alt="학생 참가용 QR 코드 (확대)" />
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
              <Button type="submit">시작하기</Button>
              <Button variant="secondary" onClick={() => setStarting(false)}>취소</Button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}
