import { lazy, Suspense } from "react";
import type { Student } from "../../data/grading";
import { Avatar } from "../ui/Avatar";

const MarkdownMessage = lazy(() => import("./MarkdownMessage"));

function PendingMessage({ announcement }: { announcement: string }) {
  return (
    <p className="message-pending" role="status">
      <span className="sr-only">대기 중. 잠시만 기다려 주세요. {announcement}</span>
      <span className="message-pending-indicator" aria-hidden="true">
        <span className="message-pending-dots">
          <span />
          <span />
          <span />
        </span>
      </span>
      <span className="message-pending-text" aria-hidden="true">잠시만 기다려 주세요…</span>
    </p>
  );
}

export function ChatMessage({
  student,
  role,
  content,
  pending = false,
}: {
  student: Student;
  role: "user" | "ai";
  content: string;
  pending?: boolean;
}) {
  return (
    <div className={`message ${role === "user" ? "user" : "ai"}`}>
      <div className="message-author">
        {role === "user" ? (
          <Avatar name={student.name} size="small" />
        ) : (
          <Avatar name="AI" size="small" ai />
        )}
        <span>{role === "user" ? student.name : "AI"}</span>
      </div>
      {pending ? (
        <PendingMessage announcement={content} />
      ) : role === "ai" ? (
        <Suspense fallback={<PendingMessage announcement="응답 서식을 준비하고 있습니다." />}>
          <MarkdownMessage content={content} />
        </Suspense>
      ) : (
        <p>{content}</p>
      )}
    </div>
  );
}
