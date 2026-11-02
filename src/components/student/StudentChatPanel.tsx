import { useCallback, useEffect, useRef, useState } from "react";
import type { AiPolicy } from "../../api/types";
import type { Message, Student } from "../../data/grading";
import { ChatHistorySkeleton } from "../grading/ChatHistorySkeleton";
import { ChatMessage } from "../grading/ChatMessage";
import { ChatComposer } from "./ChatComposer";

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
  expanded = false,
  onExpandedChange,
  notice,
  onSend,
}: {
  student: Student;
  messages: Message[];
  loadingHistory?: boolean;
  aiPolicy: AiPolicy;
  disabled: boolean;
  busy?: boolean;
  expanded?: boolean;
  onExpandedChange: (expanded: boolean) => void;
  notice: string;
  onSend: (text: string) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const historyAtBottom = useRef(true);
  const scrollHistoryToBottom = useCallback(() => {
    const history = list.current;
    if (!history) return;
    history.scrollTop = history.scrollHeight;
    historyAtBottom.current = true;
  }, []);
  useEffect(() => {
    scrollHistoryToBottom();
  }, [messages, expanded, loadingHistory, scrollHistoryToBottom]);
  const keepHistoryAtBottomOnComposerResize = useCallback(() => {
    if (!historyAtBottom.current) return;
    requestAnimationFrame(() => {
      if (historyAtBottom.current) scrollHistoryToBottom();
    });
  }, [scrollHistoryToBottom]);

  const conversation = (
    <>
      <div
        className="student-chat-history"
        ref={list}
        onScroll={(event) => {
          const history = event.currentTarget;
          historyAtBottom.current =
            history.scrollHeight - history.scrollTop - history.clientHeight <=
            24;
        }}
        role="log"
        aria-label="AI 대화 기록"
        aria-live="polite"
        aria-relevant="additions text"
        tabIndex={0}
      >
        <StudentAiWelcome policy={aiPolicy} />
        {loadingHistory ? (
          <ChatHistorySkeleton />
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
        ) : null}
        {notice && (
          <p className="chat-notice" role="status">
            {notice}
          </p>
        )}
      </div>
      <ChatComposer
        disabled={disabled}
        busy={busy}
        disabledReason={notice || undefined}
        value={draft}
        onValueChange={setDraft}
        onSend={onSend}
        onResize={keepHistoryAtBottomOnComposerResize}
      />
    </>
  );

  return (
    <aside
      className={`student-chat ${expanded ? "is-expanded" : ""}`}
      onKeyDown={(event) => {
        if (expanded && event.key === "Escape") {
          event.preventDefault();
          onExpandedChange(false);
        }
      }}
    >
      <div className="student-chat-heading">
        <h2>AI 대화창</h2>
        <button
          type="button"
          className="student-chat-expand"
          aria-label={expanded ? "AI 대화창 축소" : "AI 대화창 전체보기"}
          aria-expanded={expanded}
          onClick={() => onExpandedChange(!expanded)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path
              d={
                expanded
                  ? "M3 8h5V3M21 8h-5V3M8 21v-5H3M16 21v-5h5M8 8 3 3M16 8l5-5M8 16l-5 5M16 16l5 5"
                  : "M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M3 3l6 6M21 3l-6 6M3 21l6-6M21 21l-6-6"
              }
            />
          </svg>
          {expanded ? "축소" : "전체보기"}
        </button>
      </div>
      {conversation}
    </aside>
  );
}
