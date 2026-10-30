import { useCallback, useEffect, useRef } from "react";
import type { Message, Student } from "../../data/grading";
import { ChatMessage } from "../grading/ChatMessage";
import { ChatComposer } from "./ChatComposer";
import { Skeleton, SkeletonStatus } from "../ui/Skeleton";
export function StudentChatPanel({
  student,
  messages,
  loadingHistory = false,
  disabled,
  busy = false,
  notice,
  onSend,
}: {
  student: Student;
  messages: Message[];
  loadingHistory?: boolean;
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
        ) : messages.map((message) => (
          <ChatMessage
            key={message.id}
            student={student}
            role={message.role}
            content={message.content}
            pending={message.pending}
          />
        ))}
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
