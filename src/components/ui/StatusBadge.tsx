import type { StudentStatus } from "../../data/grading";
export function StatusBadge({ status }: { status: StudentStatus }) {
  return (
    <span
      className={`badge ${status === "제출완료" ? "submitted" : status === "경고" ? "warning" : ""}`}
    >
      {status}
    </span>
  );
}
