import { readStudentsWidth } from "./sidebarWidth";
import { Skeleton, SkeletonStatus } from "../ui/Skeleton";
import { Icon } from "../ui/Icon";
import { TextInput } from "../ui/TextInput";
import { Tabs } from "../ui/Tabs";
import { ChatHistorySkeleton } from "./ChatHistorySkeleton";

// 실제 채점 화면과 같은 컨테이너·크기를 써서 로딩 → 실제 화면 전환 시 레이아웃이 움직이지 않게 한다.
export function StudentSidebarSkeleton() {
  return (
    <aside className={`students${readStudentsWidth() === 0 ? " collapsed" : ""}`} aria-label="학생 목록">
      <span className="sr-only" role="status">
        학생 목록을 불러오고 있습니다.
      </span>
      <>
        <div className="student-filter" aria-hidden="true">
          <TextInput
            variant="search"
            leadingIcon={<Icon name="search" />}
            aria-label="학생 검색"
            placeholder="아이디를 입력하세요"
            disabled
            readOnly
          />
          <div className="counts">
            <span>제출</span>
            <span>경고</span>
            <span>작성중</span>
          </div>
        </div>
        <div className="student-list" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="student-row" key={index}>
              <span className="student-name">
                <Skeleton style={{ width: 25, height: 25, borderRadius: 25 }} />
                <Skeleton style={{ width: 56, height: 22 }} />
              </span>
              <Skeleton style={{ width: 55, height: 25, borderRadius: 10 }} />
            </div>
          ))}
        </div>
      </>
      {/* 실제 화면의 목록 접기 버튼 자리 */}
      <span className="students-toggle" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 4 6 8l4 4" />
        </svg>
      </span>
    </aside>
  );
}

export function SubmissionSkeleton() {
  return (
    <main className="answer-area">
      <SkeletonStatus label="제출 답안을 불러오고 있습니다." className="grading-skeleton-stack">
        <section className="student-summary" aria-hidden="true">
          <div className="identity">
            <Skeleton style={{ width: 37.5, height: 37.5, borderRadius: 37.5 }} />
            <div className="grading-skeleton-lines">
              <Skeleton style={{ width: 56, height: 23 }} />
              <Skeleton style={{ width: 96, height: 13 }} />
            </div>
          </div>
          <Skeleton style={{ width: 107, height: 45, borderRadius: 8 }} />
        </section>
        <section className="answer-card teacher-submission" aria-hidden="true">
          <h2>제출 답안</h2>
          <Skeleton style={{ width: 360, maxWidth: "100%", height: 42, borderRadius: 11, marginBottom: 15 }} />
          <section className="question-box teacher-question">
            <Skeleton style={{ width: "100%", height: 22, marginBottom: 8 }} />
            <Skeleton style={{ width: "55%", height: 22 }} />
          </section>
          <section className="response-box">
            <Skeleton style={{ width: 75, height: 28, marginBottom: 10 }} />
            {Array.from({ length: 8 }, (_, index) => (
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

const REVIEW_TABS = ["AI 대화창", "활동", "루브릭"].map((value) => ({ value, label: value }));

// 탭은 고정 요소라 스켈레톤으로 바꾸지 않고 실제 탭을 그대로 보여줍니다.
export function ReviewSkeleton({
  tab = "AI 대화창",
  onTab,
}: {
  tab?: string;
  onTab?: (tab: string) => void;
}) {
  return (
    <aside className="details" aria-label="학생 평가 자료">
      <Tabs
        label="평가 자료"
        value={tab}
        items={REVIEW_TABS}
        onChange={(value) => onTab?.(value)}
        variant="pill"
      />
      <SkeletonStatus label="평가 자료를 불러오고 있습니다.">
        <div className="messages">
          <ChatHistorySkeleton count={4} label="AI 대화 기록을 불러오고 있습니다." />
        </div>
      </SkeletonStatus>
    </aside>
  );
}
