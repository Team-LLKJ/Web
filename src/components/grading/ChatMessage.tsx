import type { Student } from "../../data/grading";
import { Avatar } from "../ui/Avatar";
export function ChatMessage({
  student,
  role,
  content,
}: {
  student: Student;
  role: "user" | "ai";
  content: string;
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
      <p>{content}</p>
    </div>
  );
}
