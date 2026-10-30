import { useEffect, useRef, useState } from "react";
import type { Message, Student } from "../../data/grading";
import { ChatMessage } from "../grading/ChatMessage";
import { ChatComposer } from "./ChatComposer";
export function StudentChatPanel({
  student,
  messages,
  disabled,
  busy = false,
  expanded = false,
  onExpandedChange,
  notice,
  onSend,
}: {
  student: Student;
  messages: Message[];
  disabled: boolean;
  busy?: boolean;
  expanded?: boolean;
  onExpandedChange: (expanded: boolean) => void;
  notice: string;
  onSend: (text: string) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages, expanded]);

  const conversation = (
    <>
      <div
        className="student-chat-history"
        ref={list}
        role="log"
        aria-label="AI 대화 기록"
        aria-live="polite"
        aria-relevant="additions text"
        tabIndex={0}
      >
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            student={student}
            role={message.role}
            content={message.content}
          />
        ))}
        {!messages.length && (
          <p className="student-chat-empty">
            AI에게 질문하며 생각을 정리해보세요.
          </p>
        )}
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
