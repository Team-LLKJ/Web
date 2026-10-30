import { useCallback, useEffect, useRef } from "react";
import type { AiPolicy } from "../../api/types";
import type { Message, Student } from "../../data/grading";
import { ChatMessage } from "../grading/ChatMessage";
import { ChatComposer } from "./ChatComposer";
import { Skeleton, SkeletonStatus } from "../ui/Skeleton";

function StudentAiWelcome({ policy }: { policy: AiPolicy }) {
  const guidance = {
    DISABLED: {
      introduction: "안녕하세요! 이 평가의 AI 사용 안내예요.",
      points: [
        "이 평가에서는 AI 사용이 허용되지 않습니다.",
        "문제 풀이와 답안 작성은 AI 도움 없이 본인의 생각으로 해 주세요.",
      ],
    },
    HINT_ONLY: {
      introduction: "안녕하세요! 저는 평가 중 학습을 돕는 AI예요.",
      points: [
        "이 평가에서는 개념 설명과 풀이 방향에 대한 힌트를 받을 수 있어요.",
        "완성된 답안을 대신 작성하게 하거나 AI 답변을 그대로 제출하지 말고, 자신의 말로 정리해 주세요.",
      ],
    },
    FULL: {
      introduction: "안녕하세요! 이 평가에서 궁금한 점을 질문하고 AI의 도움을 받을 수 있어요.",
      points: [
        "AI 답변이 항상 정확한 것은 아니니 중요한 정보는 확인해 주세요.",
        "도움을 받은 뒤에는 내용을 이해하고 본인의 판단을 담아 최종 답안을 작성해 주세요.",
      ],
    },
  }[policy];

  return (
    <div className="message ai student-chat-welcome">
      <div className="message-author">
        <span className="avatar small ai-avatar" aria-hidden="true">AI</span>
        <span>AI</span>
      </div>
      <div className="message-content message-content--markdown">
        <p>{guidance.introduction}</p>
        <ul>
          {guidance.points.map((point) => <li key={point}>{point}</li>)}
        </ul>
      </div>
    </div>
  );
}

export function StudentChatPanel({
  student,
  messages,
  loadingHistory = false,
  aiPolicy,
  disabled,
  busy = false,
  notice,
  onSend,
}: {
  student: Student;
  messages: Message[];
  loadingHistory?: boolean;
  aiPolicy: AiPolicy;
  disabled: boolean;
  busy?: boolean;
  notice: string;
  onSend: (text: string) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  const historyAtBottom = useRef(true);
  const scrollHistoryToBottom = useCallback(() => {
    const history = list.current;
    if (!history) return;
    history.scrollTop = history.scrollHeight;
    historyAtBottom.current = true;
  }, []);

  useEffect(() => {
    scrollHistoryToBottom();
  }, [messages.length, scrollHistoryToBottom]);

  const keepHistoryAtBottomOnComposerResize = useCallback(() => {
    if (!historyAtBottom.current) return;
    requestAnimationFrame(() => {
      if (historyAtBottom.current) scrollHistoryToBottom();
    });
  }, [scrollHistoryToBottom]);
  return (
    <aside className="student-chat">
      <h2>AI 대화창</h2>
      <div
        className="student-chat-history"
        ref={list}
        onScroll={(event) => {
          const history = event.currentTarget;
          historyAtBottom.current =
            history.scrollHeight - history.scrollTop - history.clientHeight <= 24;
        }}
      >
        {loadingHistory ? (
          <SkeletonStatus className="student-chat-loading-list" label="대화 기록을 불러오고 있습니다.">
            {Array.from({ length: 3 }, (_, index) => (
              <div className={`student-chat-loading-message ${index % 2 ? "is-user" : ""}`} key={index} aria-hidden="true">
                <div className="student-chat-loading-author"><Skeleton style={{ width: 25, height: 25, borderRadius: "50%" }} /><Skeleton style={{ width: 56, height: 13 }} /></div>
                <Skeleton style={{ width: index % 2 ? "54%" : "72%", height: 48, borderRadius: 10 }} />
              </div>
            ))}
          </SkeletonStatus>
        ) : messages.length > 0 ? (
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
          <StudentAiWelcome policy={aiPolicy} />
        )}
        {notice && (
          <p className="chat-notice" role="status">
            {notice}
          </p>
        )}
      </div>
      <ChatComposer
        disabled={disabled || busy}
        onSend={onSend}
        onResize={keepHistoryAtBottomOnComposerResize}
      />
    </aside>
  );
}
