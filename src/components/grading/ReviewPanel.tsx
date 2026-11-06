import { EmptyState } from "../ui/EmptyState";
import { useState } from "react";
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
  tab,
  onTab,
  lockedNotice,
}: Props) {
  const [analysisOpen, setAnalysisOpen] = useState(false);
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
            onAnalysis={() => setAnalysisOpen(true)}
          />
        )}
      </div>
      {analysisOpen && (
        <AnalysisModal review={review} onClose={() => setAnalysisOpen(false)} />
      )}
    </aside>
  );
}
