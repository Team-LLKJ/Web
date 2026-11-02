import { Skeleton, SkeletonStatus } from "../ui/Skeleton";
import { ChatHistorySkeleton } from "./ChatHistorySkeleton";

// 실제 채점 화면과 같은 컨테이너·크기를 써서 로딩 → 실제 화면 전환 시 레이아웃이 움직이지 않게 한다.
export function StudentSidebarSkeleton() {
  return (
    <aside className="students" aria-label="학생 목록">
      <SkeletonStatus label="학생 목록을 불러오고 있습니다.">
        <div className="student-filter" aria-hidden="true">
          <Skeleton style={{ height: 45, borderRadius: 10 }} />
          <div className="counts">
            <Skeleton style={{ width: 40, height: 20 }} />
            <Skeleton style={{ width: 40, height: 20 }} />
            <Skeleton style={{ width: 52, height: 20 }} />
          </div>
        </div>
        <div className="student-list" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="student-row" key={index}>
              <span className="student-name">
                <Skeleton style={{ width: 30, height: 30, borderRadius: 30 }} />
                <Skeleton style={{ width: 56, height: 22 }} />
              </span>
              <Skeleton style={{ width: 55, height: 27, borderRadius: 10 }} />
            </div>
          ))}
        </div>
      </SkeletonStatus>
    </aside>
  );
}

export function SubmissionSkeleton() {
  return (
    <main className="answer-area">
      <SkeletonStatus label="제출 답안을 불러오고 있습니다." className="grading-skeleton-stack">
        <section className="student-summary" aria-hidden="true">
          <div className="identity">
            <Skeleton style={{ width: 37.5, height: 37.5, borderRadius: 50 }} />
            <div className="grading-skeleton-lines">
              <Skeleton style={{ width: 60, height: 16 }} />
              <Skeleton style={{ width: 80, height: 11 }} />
            </div>
          </div>
          <Skeleton style={{ width: 125, height: 33, borderRadius: 8 }} />
        </section>
        <section className="answer-card" aria-hidden="true">
          <Skeleton style={{ width: 97, height: 34, marginBottom: 15 }} />
          <div className="grading-skeleton-tabs">
            <Skeleton style={{ width: 75, height: 30 }} />
            <Skeleton style={{ width: 75, height: 30 }} />
          </div>
          <section className="question-box">
            <Skeleton style={{ width: 75, height: 28, marginBottom: 10 }} />
            <Skeleton style={{ width: "100%", height: 22, marginBottom: 8 }} />
            <Skeleton style={{ width: "100%", height: 22, marginBottom: 8 }} />
            <Skeleton style={{ width: "55%", height: 22 }} />
          </section>
          <section className="response-box">
            <Skeleton style={{ width: 75, height: 28, marginBottom: 10 }} />
            {Array.from({ length: 12 }, (_, index) => (
              <Skeleton
                key={index}
                style={{
                  width: index % 4 === 3 ? "62%" : "100%",
                  height: 22,
                  marginBottom: index % 4 === 3 ? 22 : 8,
                }}
              />
            ))}
          </section>
        </section>
      </SkeletonStatus>
    </main>
  );
}

export function ReviewSkeleton() {
  return (
    <aside className="details" aria-label="학생 평가 자료">
      <SkeletonStatus label="평가 자료를 불러오고 있습니다.">
        <div className="grading-skeleton-review-tabs" aria-hidden="true">
          <Skeleton style={{ width: 100, height: 47, borderRadius: 10 }} />
          <Skeleton style={{ width: 100, height: 47, borderRadius: 10 }} />
          <Skeleton style={{ width: 100, height: 47, borderRadius: 10 }} />
        </div>
      </SkeletonStatus>
      <div className="messages">
        <ChatHistorySkeleton count={4} label="AI 대화 기록을 불러오고 있습니다." />
      </div>
    </aside>
  );
}
