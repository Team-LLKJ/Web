import type { Student } from "../../data/grading";
import { Avatar } from "../ui/Avatar";
import { Skeleton } from "../ui/Skeleton";
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
            <span className="sr-only">{content}</span>
            <span className="message-pending-skeleton" aria-hidden="true">
              <Skeleton className="message-pending-skeleton-line" />
              <Skeleton className="message-pending-skeleton-line" />
              <Skeleton className="message-pending-skeleton-line" />
            </span>
          </>
        ) : content}
      </p>
    </div>
  );
}
