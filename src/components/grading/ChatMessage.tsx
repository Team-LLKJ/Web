import type { Student } from "../../data/grading";
import { Avatar } from "../ui/Avatar";
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
          <Avatar name={student.name} color={student.color} size="small" />
        ) : (
          <Avatar name="AI" size="small" ai />
        )}
        <span>{role === "user" ? student.name : "AI"}</span>
      </div>
      <p className={pending ? "message-pending" : undefined} role={pending ? "status" : undefined}>
        {pending ? (
          <>
            <span className="sr-only">잠시만 기다려 주세요. {content}</span>
            <span className="message-pending-text" aria-hidden="true">잠시만 기다려 주세요…</span>
          </>
        ) : content}
      </p>
    </div>
  );
}
