import { EmptyState } from "../ui/EmptyState";
import { useEffect, useState } from "react";
import "../student/student.css";
import type { StudentReview } from "../../data/review";
import { ActivityAnalysis } from "./ActivityAnalysis";
import { RubricAssessment } from "./RubricAssessment";
import { AnalysisModal } from "./AnalysisModal";
import type { Message, Student } from "../../data/grading";
import type { PurposeType } from "../../api/types";
import { Tabs } from "../ui/Tabs";
import { ChatMessage } from "./ChatMessage";
import { clearEvidenceMark, markEvidence } from "./highlightText";
import { clearAiSourceMark, markAiSources } from "./authorshipMark";
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
  /** 답안에 줄을 쳐 보여주는 종류와 바꾸는 동작 */
  authorMark?: "student" | "ai" | "paste" | null;
  onAuthorMark?: (kind: "student" | "ai" | "paste" | null) => void;
  onSentenceSource?: (sentenceId: string, source: "AI" | "DIRECT") => void;
  onPurpose?: (conversationId: number, purpose: PurposeType) => void;
  /** 'AI의 답변을 사용함'을 켰을 때, 답안에서 AI 답변을 사용한 문장(대화창에서 출처를 칠합니다) */
  aiAnswerSentences?: { text: string; closest?: string | null }[];
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
  authorMark,
  onAuthorMark,
  onSentenceSource,
  onPurpose,
  aiAnswerSentences = [],
}: Props) {
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [target, setTarget] = useState<{ id: number; quote?: string } | null>(null);
  const targetConversation = target?.id ?? null;
  // 평가 근거의 'AI 대화 #n' 링크: AI 대화창으로 옮겨 해당 프롬프트로 스크롤합니다.
  useEffect(() => {
    if (targetConversation === null || tab !== "AI 대화창") return;
    const frame = requestAnimationFrame(() => {
      // 대화 번호가 메시지 id와 그대로 같거나(73), 숫자 부분으로 들어 있는(turn-73, 73:user 등) 말풍선을 찾습니다.
      const nodes = [
        ...document.querySelectorAll<HTMLElement>(".teacher-chat [data-message-id]"),
      ];
      const token = new RegExp(`(^|\\D)${targetConversation}(\\D|$)`);
      const node =
        nodes.find((item) => item.dataset.messageId === String(targetConversation)) ??
        nodes.find((item) => token.test(item.dataset.messageId ?? ""));
      if (node) {
        node.scrollIntoView({ block: "center", behavior: "smooth" });
        node.classList.add("message--target");
        window.setTimeout(() => node.classList.remove("message--target"), 2200);
        // 근거가 된 문장만 형광펜처럼 표시합니다. (못 찾으면 이동만 합니다)
        clearEvidenceMark();
        const text = node.querySelector<HTMLElement>(".message-content, p");
        if (text) markEvidence(text, target?.quote);
      }
      setTarget(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, targetConversation, tab, messages]);
  // 'AI의 답변을 사용함'을 켠 채 대화창을 보면, 답안이 가져간 AI 문장에도 같은 배경을 칠합니다.
  const sourceKey = aiAnswerSentences.map((s) => `${s.text}\u0002${s.closest ?? ""}`).join("\u0001");
  useEffect(() => {
    if (authorMark !== "ai" || tab !== "AI 대화창" || !sourceKey) return clearAiSourceMark();
    const apply = (scroll: boolean) => {
      const bubbles = [...document.querySelectorAll<HTMLElement>(".teacher-chat .message.ai")];
      const sentences = sourceKey.split("\u0001").map((item) => {
        const [text, closest] = item.split("\u0002");
        return { text, closest: closest || null };
      });
      const first = markAiSources(bubbles, sentences);
      if (scroll) first?.scrollIntoView({ block: "center", behavior: "smooth" });
    };
    // 마크다운 말풍선은 늦게 그려지므로 잠시 뒤 다시 칠합니다.
    const timers = [window.setTimeout(() => apply(false), 0), window.setTimeout(() => apply(true), 400)];
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      clearAiSourceMark();
    };
  }, [authorMark, tab, sourceKey, messages]);
  // 탭을 옮기거나 화면을 떠나면 형광펜 표시를 지웁니다.
  useEffect(() => clearEvidenceMark, [tab]);
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
          <ActivityAnalysis
            review={review}
            authorMark={authorMark}
            onAuthorMark={onAuthorMark}
            onSentenceSource={onSentenceSource}
            onPurpose={onPurpose}
            answerChars={student.answers.reduce(
              (sum, answer) => sum + (answer.paragraphs.join("").replace(/\s/g, "").length || 0),
              0,
            )}
          />
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
          messages={messages}
          answerTexts={student.answers.map((answer) => answer.paragraphs.join("\n"))}
          onClose={() => setAnalysisOpen(false)}
          onOpenConversation={(id, quote) => {
            setAnalysisOpen(false);
            setTarget({ id, quote });
            onTab("AI 대화창");
          }}
        />
      )}
    </aside>
  );
}
