import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { clearSubmittedInfo, readSubmittedInfo } from "../data/studentSession";
import "../components/student/student.css";
import "../components/student/student-done.css";

/** 제출 완료 화면. 학생은 제출 뒤 평가 화면과 기록을 볼 수 없어 완료 안내만 보여줍니다. */
export function StudentDonePage() {
  const navigate = useNavigate();
  const [info] = useState(readSubmittedInfo);

  function finish() {
    clearSubmittedInfo();
    navigate("/", { replace: true });
  }

  if (!info) return <Navigate to="/" replace />;

  return (
    <main className="student-join">
      <section
        className="join-card student-done-card"
        aria-labelledby="student-done-title"
      >
        <div className="student-done-icon" aria-hidden="true">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </div>
        <div className="student-done-text">
          <h1 id="student-done-title">{info.ended ? "평가가 종료됐어요" : "제출을 완료했어요"}</h1>
          <p>
            {info.nickname ? `${info.nickname}님, ` : ""}
            수고했어요!
            {info.title && (
              <>
                <br />
                <strong>{info.title}</strong>{" "}
                {info.ended
                  ? info.submitted
                    ? "평가가 끝나 지금까지 작성한 답안이 선생님께 제출됐어요."
                    : "평가가 끝나 저장된 답안까지 선생님께 전달돼요."
                  : "답안이 선생님께 전달됐어요."}
              </>
            )}
          </p>
        </div>
        <Button onClick={finish}>처음 화면으로</Button>
      </section>
    </main>
  );
}
