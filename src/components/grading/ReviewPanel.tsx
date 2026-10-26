import { useState } from "react";
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
};
export function ReviewPanel({
  student,
  messages,
  review,
  onScore,
  tab,
  onTab,
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
          <div className="messages">
            {messages.length ? (
              messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  student={student}
                  role={message.role}
                  content={message.content}
                />
              ))
            ) : (
              <p className="empty">기록된 AI 대화가 없습니다.</p>
            )}
          </div>
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
