import { useRef } from "react";
import { EmptyState } from "../ui/EmptyState";
import type { Student } from "../../data/grading";
import { Icon } from "../ui/Icon";
import { TextInput } from "../ui/TextInput";
import { PlayerButton } from "./PlayerButton";
import {
  DEFAULT_STUDENTS_WIDTH,
  MAX_STUDENTS_WIDTH,
  MIN_STUDENTS_WIDTH,
  clampStudentsWidth,
  saveStudentsWidth,
} from "./sidebarWidth";
import "./students-resize.css";
export function StudentSidebar({
  students,
  student,
  query,
  onQuery,
  onSelect,
  width = DEFAULT_STUDENTS_WIDTH,
  onWidth,
}: {
  students: Student[];
  student: Student;
  query: string;
  onQuery: (query: string) => void;
  onSelect: (index: number) => void;
  /** 사이드바 가로 크기(px)와 바꾸는 동작. 지정하면 경계를 끌어 크기를 조절할 수 있습니다. */
  width?: number;
  onWidth?: (width: number) => void;
}) {
  const drag = useRef<{ x: number; width: number } | null>(null);
  const latest = useRef(width);
  return (
    <aside className={`students ${width === 0 ? "collapsed" : ""}`} aria-label="학생 목록">
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
      {onWidth && (
        <button
          type="button"
          className="students-toggle"
          aria-label={width === 0 ? "학생 목록 펼치기" : "학생 목록 접기"}
          title={width === 0 ? "학생 목록 펼치기" : "학생 목록 접기"}
          onClick={() => {
            const next = width === 0 ? DEFAULT_STUDENTS_WIDTH : 0;
            onWidth(next);
            saveStudentsWidth(next);
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={width === 0 ? "m6 4 4 4-4 4" : "M10 4 6 8l4 4"} />
          </svg>
        </button>
      )}
      {onWidth && width > 0 && (
        <div
          className="students-resize-handle"
          role="separator"
          tabIndex={0}
          aria-label="학생 목록 너비 조절"
          aria-orientation="vertical"
          aria-valuemin={MIN_STUDENTS_WIDTH}
          aria-valuemax={MAX_STUDENTS_WIDTH}
          aria-valuenow={width}
          title="드래그로 학생 목록 너비 조절 · 두 번 클릭하면 초기화"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            drag.current = { x: event.clientX, width };
            event.currentTarget.closest(".teacher-workspace")?.classList.add("is-resizing");
            latest.current = width;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
            latest.current = clampStudentsWidth(drag.current.width + event.clientX - drag.current.x);
            onWidth(latest.current);
          }}
          onPointerUp={(event) => {
            event.currentTarget.closest(".teacher-workspace")?.classList.remove("is-resizing");
            if (drag.current) saveStudentsWidth(latest.current);
            drag.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={(event) => {
            event.currentTarget.closest(".teacher-workspace")?.classList.remove("is-resizing");
            drag.current = null;
          }}
          onDoubleClick={() => {
            onWidth(DEFAULT_STUDENTS_WIDTH);
            saveStudentsWidth(DEFAULT_STUDENTS_WIDTH);
          }}
          onKeyDown={(event) => {
            const keys: Record<string, number> = {
              ArrowRight: width + 12,
              ArrowLeft: width - 12,
              Home: MIN_STUDENTS_WIDTH,
              End: MAX_STUDENTS_WIDTH,
            };
            if (!(event.key in keys)) return;
            event.preventDefault();
            const next = clampStudentsWidth(keys[event.key]);
            onWidth(next);
            saveStudentsWidth(next);
          }}
        />
      )}
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
