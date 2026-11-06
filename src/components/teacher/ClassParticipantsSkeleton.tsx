import { Skeleton, SkeletonStatus } from "../ui/Skeleton";

export function ClassParticipantsSkeleton() {
  return (
    <SkeletonStatus label="참가자 목록을 불러오고 있습니다.">
      <ul className="teacher-lobby-pills" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <li className="teacher-lobby-pill" key={index}>
            <Skeleton className="teacher-lobby-avatar" />
            <Skeleton style={{ width: "3em", height: "1lh" }} />
          </li>
        ))}
      </ul>
    </SkeletonStatus>
  );
}
