import { Link } from "react-router-dom";
import { TeacherHeader } from "./TeacherHeader";
import "./evaluation-started-screen.css";

export function EvaluationStartedScreen({
  evaluationId,
  title,
  className,
  folderId,
}: {
  evaluationId: string;
  title?: string;
  className?: string;
  folderId?: string;
}) {
  return (
    <main className="teacher-page">
      <TeacherHeader />
      <div className="teacher-page-content evaluation-started-content">
        <h1>{title || "수행평가"}</h1>
        {className && <p className="evaluation-started-class">{className}</p>}

        <section
          className="teacher-card evaluation-started-screen"
          aria-labelledby="evaluation-started-title"
        >
          <span className="evaluation-started-icon" aria-hidden="true">
            ✓
          </span>
          <h2 id="evaluation-started-title">평가가 시작됐어요</h2>
          <p className="evaluation-started-description">
            학생들이 이제 답안을 작성할 수 있어요. 학생 현황에서 작성 중인
            학생과 제출을 완료한 학생을 확인할 수 있습니다.
          </p>
          <p className="teacher-notice evaluation-started-notice">
            평가 시간은 이 화면에서도 계속 흘러요.
          </p>
          <Link
            className="button button--primary button--medium primary"
            to={`/teacher/grading/${encodeURIComponent(evaluationId)}`}
            replace
            state={folderId ? { folderId } : undefined}
          >
            현황 보기
          </Link>
        </section>
      </div>
    </main>
  );
}
