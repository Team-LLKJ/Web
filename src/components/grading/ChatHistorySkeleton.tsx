import { Skeleton, SkeletonStatus } from "../ui/Skeleton";

// 학생 풀이 화면의 대화 기록 스켈레톤과 같은 모양: 작성자 줄 + 말풍선 박스 (AI는 왼쪽, 학생은 오른쪽).
export function ChatHistorySkeleton({
  count = 3,
  label = "대화 기록을 불러오고 있습니다.",
}: {
  count?: number;
  label?: string;
}) {
  return (
    <SkeletonStatus className="chat-history-skeleton" label={label}>
      {Array.from({ length: count }, (_, index) => (
        <div
          className={`chat-history-skeleton-message ${index % 2 ? "is-user" : ""}`}
          key={index}
          aria-hidden="true"
        >
          <div className="chat-history-skeleton-author">
            <Skeleton style={{ width: 25, height: 25, borderRadius: "50%" }} />
            <Skeleton style={{ width: 56, height: 20 }} />
          </div>
          <Skeleton
            style={{
              width: index % 2 ? "54%" : "72%",
              height: index % 2 ? 45 : 70,
              borderRadius: 10,
            }}
          />
        </div>
      ))}
    </SkeletonStatus>
  );
}
