import type { Student } from "../../data/grading";
import { Avatar } from "../ui/Avatar";
import { StatusBadge } from "../ui/StatusBadge";
export function PlayerButton({
  student,
  selected,
  onSelect,
}: {
  student: Student;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`student-row ${selected ? "selected" : ""}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="student-name">
        <Avatar name={student.name} />
        {student.name}
      </span>
      <StatusBadge status={student.status} />
    </button>
  );
}
