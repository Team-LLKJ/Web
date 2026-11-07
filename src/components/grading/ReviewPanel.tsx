import { EmptyState } from "../ui/EmptyState";
import { useEffect, useState } from "react";
import "../student/student.css";
import type { StudentReview } from "../../data/review";
import { ActivityAnalysis } from "./ActivityAnalysis";
import { RubricAssessment } from "./RubricAssessment";
import { AnalysisModal } from "./AnalysisModal";
import type { Message, Student } from "../../data/grading";
import { Tabs } from "../ui/Tabs";
import { ChatMessage } from "./ChatMessage";
type Props = {
  student: Student;
  messages: Message[];
  review: StudentReview;
  onScore: (id: string, score: number) => void;
  /** 기준별 점수(AI 추천 + 교사 점수)가 있을 때 쓰는 저장·확정 동작입니다. */
  onLevel?: (criterionId: number, level: number | null) => void;
  /** AI도 채점하지 못해 직접 채점해야 하는 기준 번호를 돌려줍니다. */
  /** 교사가 AI 추천을 바꾸거나 AI가 못 한 기준을 채점한 근거를 저장합니다. */
  onFeedback?: (criterionId: number, feedback: string) => void;
  onConfirm?: () => Promise<number[]> | void;
  tab: string;
  onTab: (tab: string) => void;
  /** 지정하면 활동·루브릭 탭 대신 이 안내를 보여줍니다(평가 중에는 열람 불가). */
  lockedNotice?: string;
};
export function ReviewPanel({
  student,
  messages,
  review,
  onScore,
  onLevel,
  onConfirm,
  onFeedback,
  tab,
  onTab,
  lockedNotice,
}: Props) {
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [targetConversation, setTargetConversation] = useState<number | null>(null);
  // 평가 근거의 'AI 대화 #n' 링크: AI 대화창으로 옮겨 해당 프롬프트로 스크롤합니다.
  useEffect(() => {
    if (targetConversation === null || tab !== "AI 대화창") return;
    const frame = requestAnimationFrame(() => {
      const nodes = document.querySelectorAll<HTMLElement>(
        `.teacher-chat [data-message-id="${targetConversation}"]`,
      );
      const node = nodes[0];
      if (node) {
        node.scrollIntoView({ block: "center", behavior: "smooth" });
        node.classList.add("message--target");
        window.setTimeout(() => node.classList.remove("message--target"), 2200);
      }
      setTargetConversation(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [targetConversation, tab, messages]);
  return (
    <aside className="details" aria-label="학생 평가 자료">
      <Tabs
        label="평가 자료"
        value={tab}
        items={["AI 대화창", "활동", "루브릭"].map((value) => ({
          value,
          label: value,
        }))}
        onChange={onTab}
        variant="pill"
      />
      <div
        className="review-panel-scroll"
        tabIndex={0}
        aria-label="평가 자료 내용"
      >
        {tab === "AI 대화창" ? (
          <div className="messages student-chat teacher-chat">
            {messages.length ? (
              messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  student={student}
                  role={message.role}
                  content={message.content}
                  pending={message.pending}
                  messageId={message.id}
                />
              ))
            ) : (
              <EmptyState size="inline" icon="chat" title="기록된 AI 대화가 없어요" />
            )}
          </div>
        ) : lockedNotice && tab === "활동" ? (
          <>
            <div className="review-locked review-locked--compact" role="status">
              <strong>경고 외 활동 분석은 평가 종료 후에 볼 수 있어요</strong>
              <p>창 이탈·단축키 경고는 평가 중에도 바로 확인할 수 있어요.</p>
            </div>
            <ActivityAnalysis review={review} warningsOnly />
          </>
        ) : lockedNotice ? (
          <EmptyState size="inline" icon="lock" title={`${tab} 정보는 아직 볼 수 없어요`} description={lockedNotice} />
        ) : tab === "활동" ? (
          <ActivityAnalysis review={review} />
        ) : (
          <RubricAssessment
            review={review}
            onScore={onScore}
            onLevel={onLevel}
            onConfirm={onConfirm}
            onFeedback={onFeedback}
            onAnalysis={() => setAnalysisOpen(true)}
          />
        )}
      </div>
      {analysisOpen && (
        <AnalysisModal
          review={review}
          onClose={() => setAnalysisOpen(false)}
          onOpenConversation={(id) => {
            setAnalysisOpen(false);
            setTargetConversation(id);
            onTab("AI 대화창");
          }}
        />
      )}
    </aside>
  );
}
