import type { Question, Student } from "../../data/grading";
import type { StudentReview } from "../../data/review";

// PDF로 저장하기(인쇄)할 때만 보이는 보고서 레이아웃. 화면에서는 숨겨져 있다.
export function PrintReport({
  student,
  questions,
  review,
}: {
  student: Student;
  questions: Question[];
  review: StudentReview | undefined;
}) {
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const scored = review?.criteria.filter((item) => item.score !== null) ?? [];
  const total = scored.reduce((sum, item) => sum + (item.score ?? 0), 0);
  const max = scored.reduce((sum, item) => sum + item.maxScore, 0);

  return (
    <article className="print-report" aria-hidden="true">
      <header className="print-report-header">
        <img src="/lit-logo.png" width="80" height="40" alt="" />
        <div>
          <h1>AI 활용 학습 보고서</h1>
          <p>출력일 {today}</p>
        </div>
      </header>

      <table className="print-report-info">
        <tbody>
          <tr>
            <th>학생</th>
            <td>{student.name}</td>
            <th>제출 상태</th>
            <td>{student.status}</td>
          </tr>
          <tr>
            <th>제출일</th>
            <td>{student.submittedAt ?? "제출 전"}</td>
            <th>평가 점수</th>
            <td>{scored.length ? `${total} / ${max}점` : "미채점"}</td>
          </tr>
        </tbody>
      </table>

      {review && (
        <section>
          <h2>1. 종합 평가</h2>
          <p>{review.summary}</p>
        </section>
      )}

      {review && review.criteria.length > 0 && (
        <section>
          <h2>2. 평가 기준별 루브릭</h2>
          <table className="print-report-table">
            <thead>
              <tr>
                <th>평가 기준</th>
                <th className="print-report-score">점수</th>
                <th>평가 내용</th>
              </tr>
            </thead>
            <tbody>
              {review.criteria.map((item) => (
                <tr key={item.id}>
                  <td>{item.criterion}</td>
                  <td className="print-report-score">
                    {item.score === null ? "미채점" : `${item.score} / ${item.maxScore}`}
                  </td>
                  <td>{item.feedback}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {review && (
        <section>
          <h2>3. AI 활용 분석</h2>
          <table className="print-report-table">
            <tbody>
              <tr>
                <th>학생이 직접 작성한 비율</th>
                <td>
                  {review.studentContribution === null
                    ? "분석 전"
                    : `${review.studentContribution}%`}
                </td>
              </tr>
              {review.usage.map((metric) => (
                <tr key={metric.label}>
                  <th>{metric.label}</th>
                  <td>
                    {metric.percent}% ({metric.level})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section>
        <h2>4. 활동 및 경고 기록</h2>
        {student.activities.length || review?.warnings.length ? (
          <ul className="print-report-list">
            {review?.warnings.map((warning) => (
              <li key={warning.id}>
                <time>{warning.time}</time> {warning.label}
              </li>
            ))}
            {student.activities.map((activity) => (
              <li key={activity.id}>
                <time>{activity.time}</time> {activity.description}
              </li>
            ))}
          </ul>
        ) : (
          <p>기록된 활동이 없습니다.</p>
        )}
      </section>

      <section>
        <h2>5. 문항별 제출 답안</h2>
        {questions.map((question) => {
          const answer = student.answers.find((item) => item.questionId === question.id);
          const paragraphs = answer?.paragraphs.filter((text) => text.trim()) ?? [];
          return (
            <div className="print-report-question" key={question.id}>
              <h3>{question.title}</h3>
              <p className="print-report-prompt">{question.content}</p>
              <div className="print-report-answer">
                {paragraphs.length ? (
                  paragraphs.map((text, index) => <p key={index}>{text}</p>)
                ) : (
                  <p>작성된 답안이 없습니다.</p>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="print-report-appendix">
        <h2>부록. AI 대화 기록</h2>
        {student.messages.length ? (
          student.messages.map((message) => (
            <div className="print-report-message" key={message.id}>
              <strong>{message.role === "user" ? student.name : "AI"}</strong>
              <p>{message.content}</p>
            </div>
          ))
        ) : (
          <p>기록된 AI 대화가 없습니다.</p>
        )}
      </section>
    </article>
  );
}
