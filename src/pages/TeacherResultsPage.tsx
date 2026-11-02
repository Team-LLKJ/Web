import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiErrorMessage } from "../api/client";
import { getEvaluation, getParticipants, getTeacherLearningEvents } from "../api/evaluations";
import type { Evaluation, LearningEvent, Lobby, Participant } from "../api/types";
import { Button } from "../components/ui/Button";
import { TeacherHeader } from "../components/teacher/TeacherHeader";
import { Skeleton, SkeletonStatus } from "../components/ui/Skeleton";
import { PageLoading } from "../components/ui/PageLoading";
import { TextInput } from "../components/ui/TextInput";
import "../components/teacher/teacher.css";
import { Toast } from "../components/teacher/Toast";

const eventNames: Record<string, string> = {
  ANSWER_SAVED: "답안 저장",
  AI_REQUESTED: "AI 질문",
  AI_COMPLETED: "AI 응답 완료",
  AI_FAILED: "AI 응답 실패",
  SUBMITTED: "답안 제출",
};
const detailKeys = ["questionId", "source", "answerVersion", "errorCode"];
const emptyParticipants: Participant[] = [];

function visibleDetails(details: Record<string, unknown>) {
  return detailKeys.flatMap((key) => {
    const value = details[key];
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? [[key, String(value)]]
      : [];
  });
}

export function TeacherResultsPage() {
  const { evaluationId = "" } = useParams();
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [eventsSnapshot, setEventsSnapshot] = useState<{ key: string; items: LearningEvent[] }>({ key: "", items: [] });
  const [loadedEvaluationId, setLoadedEvaluationId] = useState("");
  const [loadedEventsKey, setLoadedEventsKey] = useState("");
  const [refreshingEventsKey, setRefreshingEventsKey] = useState("");
  const [notice, setNotice] = useState("");
  const eventsKey = `${evaluationId}:${selectedId}`;
  const events = eventsSnapshot.key === eventsKey ? eventsSnapshot.items : [];
  const eventsLoading = Boolean(evaluationId && selectedId)
    && (loadedEventsKey !== eventsKey || refreshingEventsKey === eventsKey);
  const loading = Boolean(evaluationId) && loadedEvaluationId !== evaluationId;

  const refreshLobby = useCallback(async () => {
    if (!evaluationId) return;
    const [nextEvaluation, nextLobby] = await Promise.all([
      getEvaluation(evaluationId),
      getParticipants(evaluationId),
    ]);
    setEvaluation(nextEvaluation);
    setLobby(nextLobby);
    setSelectedId((current) => current && nextLobby.participants.some((item) => item.id === current)
      ? current
      : nextLobby.participants[0]?.id ?? "");
  }, [evaluationId]);

  useEffect(() => {
    if (!evaluationId) return;
    let active = true;
    void Promise.resolve().then(() => refreshLobby()).catch((error) => {
      if (active) setNotice(apiErrorMessage(error, "평가 결과를 불러오지 못했습니다."));
    }).finally(() => {
      if (active) setLoadedEvaluationId(evaluationId);
    });
    return () => { active = false; };
  }, [evaluationId, refreshLobby]);

  useEffect(() => {
    if (!evaluationId || evaluation?.state === "ENDED" || evaluation?.state === "EXPIRED") return;
    const timer = window.setInterval(() => {
      void refreshLobby().catch((error) => setNotice(apiErrorMessage(error)));
    }, 6000);
    return () => window.clearInterval(timer);
  }, [evaluationId, evaluation?.state, refreshLobby]);

  useEffect(() => {
    if (!evaluationId || !selectedId) {
      return;
    }
    let active = true;
    void getTeacherLearningEvents(evaluationId, selectedId, 0, 200).then((next) => {
      if (active) setEventsSnapshot({ key: eventsKey, items: next });
    }).catch((error) => {
      if (active) setNotice(apiErrorMessage(error, "학습 기록을 불러오지 못했습니다."));
    }).finally(() => {
      if (active) setLoadedEventsKey(eventsKey);
    });
    return () => { active = false; };
  }, [evaluationId, selectedId, eventsKey]);

  const participants = lobby?.participants ?? emptyParticipants;
  const visibleParticipants = participants.filter((participant) =>
    participant.nickname.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const selected = participants.find((participant) => participant.id === selectedId) ?? null;
  const connectedCount = participants.filter((participant) => participant.presence === "CONNECTED").length;
  const savedAnswers = events.filter((event) => event.type === "ANSWER_SAVED").length;
  const aiRequests = events.filter((event) => event.type === "AI_REQUESTED").length;
  const submitted = events.some((event) => event.type === "SUBMITTED");

  async function refreshEvents() {
    if (!selectedId || !evaluationId) return;
    const key = `${evaluationId}:${selectedId}`;
    setRefreshingEventsKey(key);
    setNotice("");
    try {
      const next = await getTeacherLearningEvents(evaluationId, selectedId, 0, 200);
      setEventsSnapshot({ key, items: next });
      setLoadedEventsKey(key);
    } catch (error) {
      setNotice(apiErrorMessage(error, "학습 기록을 새로 불러오지 못했습니다."));
    } finally {
      setRefreshingEventsKey((current) => current === key ? "" : current);
    }
  }

  if (loading) return <PageLoading layout="results" />;

  return (
    <main className="teacher-page teacher-results-page">
      <TeacherHeader className="no-print" onLeave={() => navigate("/teacher/evaluations")}>
        <Button onClick={() => window.print()}>기록 인쇄 / PDF</Button>
      </TeacherHeader>

      <div className="teacher-page-content">
        <p className="teacher-eyebrow">TEACHER / REVIEW</p>
        <h1>{evaluation?.title ?? "평가 학습 기록"}</h1>
        <div className="teacher-results-toolbar no-print">
          <Link to={`/teacher/evaluations/${encodeURIComponent(evaluationId)}`}>평가 관리로 돌아가기</Link>
          <Button variant="secondary" disabled={eventsLoading} onClick={() => void refreshLobby().then(refreshEvents).catch((error) => setNotice(apiErrorMessage(error)))}>
            새로고침
          </Button>
        </div>
        <Toast message={notice} onClose={() => setNotice("")} />

        <div className="teacher-results-summary" aria-label="평가 현황">
          <section className="teacher-card"><span>전체 참가자</span><strong>{participants.length}</strong></section>
          <section className="teacher-card"><span>현재 접속 중</span><strong>{connectedCount}</strong></section>
          <section className="teacher-card"><span>{selected?.nickname ?? "선택 학생"} · 답안 저장 기록</span><strong>{savedAnswers}</strong></section>
          <section className="teacher-card"><span>{selected?.nickname ?? "선택 학생"} · AI 질문 기록</span><strong>{aiRequests}</strong></section>
        </div>

        <section className="teacher-card teacher-results-card">
          <div className="teacher-card-heading"><h2>참가자</h2><span className="teacher-live-dot">접속 상태 실시간 갱신</span></div>
          <TextInput label="학생 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
          {visibleParticipants.length ? (
            <ul className="teacher-participant-list teacher-result-participants">
              {visibleParticipants.map((participant: Participant) => (
                <li key={participant.id}>
                  <button type="button" className={selectedId === participant.id ? "is-selected" : ""} onClick={() => setSelectedId(participant.id)}>
                    <span>{participant.nickname}</span>
                    <span className={`presence ${participant.presence === "CONNECTED" ? "presence-connected" : "presence-disconnected"}`}>
                      {participant.presence === "CONNECTED" ? "접속 중" : "연결 끊김"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="teacher-hint">검색 결과가 없습니다.</p>}
        </section>

        <section className="teacher-card teacher-results-card teacher-results-detail">
          <div className="teacher-card-heading">
            <h2>{selected?.nickname ?? "학생 기록"} 활동 타임라인</h2>
            <div className="teacher-results-status">
              <span className={`presence ${submitted ? "presence-connected" : "presence-disconnected"}`}>{submitted ? "제출 기록 확인" : "제출 기록 없음"}</span>
              <span className="teacher-event-count">{events.length}개 기록</span>
            </div>
          </div>
          {eventsLoading ? (
            <SkeletonStatus className="teacher-event-list-skeleton" label="학습 기록을 불러오고 있습니다.">
              {Array.from({ length: 4 }, (_, index) => (
                <div className="teacher-loading-event-row" key={index} aria-hidden="true">
                  <Skeleton style={{ width: 120, height: 20 }} />
                  <Skeleton style={{ width: 150, height: 20 }} />
                  <Skeleton style={{ gridColumn: "1 / -1", width: "74%", height: 20 }} />
                </div>
              ))}
            </SkeletonStatus>
          )
            : events.length ? (
              <ol className="teacher-event-list">
                {events.map((event) => (
                  <li key={event.id}>
                    <span className="event-type">{eventNames[event.type] ?? event.type}</span>
                    <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString("ko-KR")}</time>
                    {visibleDetails(event.details).length > 0 && (
                      <dl className="teacher-event-details">
                        {visibleDetails(event.details).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}
                      </dl>
                    )}
                  </li>
                ))}
              </ol>
            ) : <p className="teacher-hint">선택한 학생의 학습 이벤트 기록이 없습니다.</p>}
        </section>

        <section className="teacher-card teacher-results-limits">
          <h2>분석 및 제출물</h2>
          <p>현재 연결된 API는 참가자 접속 상태와 학습 이벤트만 제공합니다. 학생의 제출 답안, AI 대화 원문, 다섯 영역 루브릭 점수·근거, 교사 조정 내역 및 정식 PDF 보고서는 제공하지 않아 이 화면에서 임의 점수나 분석을 만들지 않습니다.</p>
          <p>창 이탈 경고도 서버에 저장하는 이벤트가 아직 없어 타임라인에 나타나지 않습니다. 이 화면의 인쇄 / PDF 기능은 표시된 실제 학습 이벤트 기록만 출력합니다.</p>
        </section>
      </div>
    </main>
  );
}
