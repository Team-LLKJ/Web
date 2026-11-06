import { EmptyState } from "../ui/EmptyState";
import type { Student } from "../../data/grading";
import { Icon } from "../ui/Icon";
import { TextInput } from "../ui/TextInput";
import { PlayerButton } from "./PlayerButton";
export function StudentSidebar({
  students,
  student,
  query,
  onQuery,
  onSelect,
}: {
  students: Student[];
  student: Student;
  query: string;
  onQuery: (query: string) => void;
  onSelect: (index: number) => void;
}) {
  return (
    <aside className="students" aria-label="학생 목록">
      <div className="student-filter">
        <TextInput
          variant="search"
          leadingIcon={<Icon name="search" />}
          aria-label="학생 검색"
          placeholder="아이디를 입력하세요"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
        <div className="counts">
          <span>
            제출 {students.filter((s) => s.status === "제출완료").length}
          </span>
          <span>경고 {students.filter((s) => s.status === "경고").length}</span>
          <span>
            작성중 {students.filter((s) => s.status === "작성중").length}
          </span>
        </div>
      </div>
      <div className="student-list">
        {students
          .filter((s) => s.name.includes(query.trim()))
          .map((s) => (
            <PlayerButton
              key={s.id}
              student={s}
              selected={student.id === s.id}
              onSelect={() => onSelect(students.indexOf(s))}
            />
          ))}
        {!students.some((s) => s.name.includes(query.trim())) && (
          <EmptyState size="inline" icon="search" title="검색 결과가 없어요" />
        )}
      </div>
    </aside>
  );
}
