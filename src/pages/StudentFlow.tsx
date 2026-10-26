import { useEffect, useState } from "react";
import { questions, type Student } from "../data/grading";
import {
  emptySession,
  readSession,
  saveSession,
  type StudentSession,
} from "../data/studentSession";
import { useNavigate } from "react-router-dom";
import { PinJoinForm } from "../components/student/PinJoinForm";
import { NicknameForm } from "../components/student/NicknameForm";
import { WaitingRoom } from "../components/student/WaitingRoom";
import { StudentHeader } from "../components/student/StudentHeader";
import { StudentWorkspace } from "../components/student/StudentWorkspace";
import { AnswerEditor } from "../components/student/AnswerEditor";
import { StudentChatPanel } from "../components/student/StudentChatPanel";
import {
  StudentDialogs,
  type StudentDialog,
} from "../components/student/StudentDialogs";
import "../components/student/student.css";
export function StudentFlow({ route }: { route: string }) {
  const navigate = useNavigate();
  const [session, setSession] = useState(() => {
    const saved = readSession();
    return route === "/student/solve" && !saved.pin
      ? {
          ...saved,
          nickname: saved.nickname || "이하랑",
          messages: saved.messages.length
            ? saved.messages
            : Array.from({ length: 8 }, (_, index) => ({
                id: `preview-${index}`,
                role: index % 2 === 0 ? ("user" as const) : ("ai" as const),
                content: "답변 내용 입력",
              })),
        }
      : saved;
  });
  const [questionId, setQuestionId] = useState(questions[0]?.id ?? 0);
  const [dialog, setDialog] = useState<StudentDialog>("");
  const [notice, setNotice] = useState("");
  const [chatNotice, setChatNotice] = useState("");
  const isSolving = route === "/student/solve";
  const update = (next: StudentSession) => {
    setSession(next);
    saveSession(next);
  };
  const student: Student = {
    id: "participant",
    name: session.nickname || "이하랑",
    color: "#ffbb76",
    status: session.submittedAt ? "제출완료" : "작성중",
    submittedAt: session.submittedAt,
    answers: [],
    messages: session.messages,
    activities: [],
    rubric: [],
  };
  useEffect(() => {
    if (route !== "/student/wait") return;
    const start = () => navigate("/student/solve");
    window.addEventListener("lit:evaluation-started", start);
    return () => window.removeEventListener("lit:evaluation-started", start);
  }, [route, navigate]);
  useEffect(() => {
    if (!isSolving || session.submittedAt) return;
    const detect = () => {
      if (document.visibilityState === "hidden") setDialog("warning");
    };
    document.addEventListener("visibilitychange", detect);
    return () => document.removeEventListener("visibilitychange", detect);
  }, [isSolving, session.submittedAt]);
  const leave = () => {
    setDialog("");
    navigate("/student/join");
  };
  if (route === "/student/wait")
    return (
      <WaitingRoom
        nickname={session.nickname || "정서진"}
        onLeave={() => navigate("/student/join")}
      />
    );
  if (!isSolving)
    return (
      <main className="student-join">
        {route === "/student/nickname" ? (
          <NicknameForm
            initialNickname={session.nickname}
            onJoin={(nickname) => {
              update({ ...session, nickname });
              navigate("/student/wait");
            }}
          />
        ) : (
          <PinJoinForm
            initialPin={session.pin}
            onJoin={(pin) => {
              update(pin === session.pin ? session : { ...emptySession, pin });
              navigate("/student/nickname");
            }}
          />
        )}
      </main>
    );
  return (
    <div className="student-solving compact-workspace">
      <StudentHeader
        submitted={!!session.submittedAt}
        onLeave={() => setDialog("leave")}
        onSubmit={() => setDialog("submit")}
        onNotice={(title) => {
          setNotice(title);
          setDialog("notice");
        }}
      />
      <StudentWorkspace
        editor={
          <main className="student-writing">
            <AnswerEditor
              questions={questions}
              questionId={questionId}
              answers={session.answers}
              readOnly={!!session.submittedAt}
              onQuestion={setQuestionId}
              onAnswer={(id, text) => {
                if (session.submittedAt) return;
                update({
                  ...session,
                  answers: { ...session.answers, [id]: text },
                });
              }}
            />
          </main>
        }
        chat={
          <StudentChatPanel
            student={student}
            messages={session.messages}
            disabled={!!session.submittedAt}
            notice={
              session.submittedAt
                ? "제출 완료 후에는 AI에게 질문할 수 없습니다."
                : chatNotice
            }
            onSend={(text) => {
              if (session.submittedAt) return;
              update({
                ...session,
                messages: [
                  ...session.messages,
                  { id: crypto.randomUUID(), role: "user", content: text },
                ],
              });
              setChatNotice("AI 응답 서비스가 아직 연결되지 않았습니다.");
            }}
          />
        }
      />
      <StudentDialogs
        kind={dialog}
        notice={notice}
        onClose={() => setDialog("")}
        onLeave={leave}
        onSubmit={() => {
          update({
            ...session,
            submittedAt: new Date().toLocaleDateString("ko-KR"),
          });
          setDialog("submitted");
        }}
      />
    </div>
  );
}
