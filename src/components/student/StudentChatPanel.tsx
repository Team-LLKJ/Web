import { useEffect, useRef } from "react";
import type { Message, Student } from "../../data/grading";
import { ChatMessage } from "../grading/ChatMessage";
import { ChatComposer } from "./ChatComposer";
export function StudentChatPanel({
  student,
  messages,
  disabled,
  busy = false,
  notice,
  onSend,
}: {
  student: Student;
  messages: Message[];
  disabled: boolean;
  busy?: boolean;
  notice: string;
  onSend: (text: string) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages.length]);
  return (
    <aside className="student-chat">
      <h2>AI 대화창</h2>
      <div className="student-chat-history" ref={list}>
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            student={student}
            role={message.role}
            content={message.content}
          />
        ))}
        {notice && (
          <p className="chat-notice" role="status">
            {notice}
          </p>
        )}
      </div>
      <ChatComposer disabled={disabled || busy} onSend={onSend} />
    </aside>
  );
}
