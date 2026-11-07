import { lazy, Suspense } from "react";
import type { Student } from "../../data/grading";
import { Avatar } from "../ui/Avatar";
import { Skeleton } from "../ui/Skeleton";

const loadMarkdownMessage = () => import("./MarkdownMessage");
const MarkdownMessage = lazy(loadMarkdownMessage);
// 대화 기록을 열기 전에 서식 렌더러를 미리 받아 두어 로딩 표시가 거의 보이지 않게 한다.
void loadMarkdownMessage();

// 이미 받은 기록의 서식을 준비하는 동안 보이는 스켈레톤 (AI가 답변을 만드는 중인 "대기" 상태와 구분). 글자가 아니라 말풍선 박스 전체를 스켈레톤으로 보여준다.
function HistorySkeleton({ role }: { role: "user" | "ai" }) {
  return (
    <div className="message-history-skeleton" role="status">
      <span className="sr-only">대화 기록을 불러오고 있습니다.</span>
      <Skeleton
        style={{
          width: role === "ai" ? 260 : 150,
          height: role === "ai" ? 70 : 45,
          borderRadius: 10,
        }}
      />
    </div>
  );
}

function PendingMessage({ announcement }: { announcement: string }) {
  return (
    <p className="message-pending" role="status">
      <span className="sr-only">대기 중. 잠시만 기다려 주세요. {announcement}</span>
      <span className="message-pending-indicator" aria-hidden="true">
        <span className="message-pending-dots">
          <span />
          <span />
          <span />
        </span>
      </span>
      <span className="message-pending-text" aria-hidden="true">잠시만 기다려 주세요…</span>
    </p>
  );
}

export function ChatMessage({
  student,
  role,
  content,
  pending = false,
  messageId,
}: {
  student: Student;
  role: "user" | "ai";
  content: string;
  pending?: boolean;
  /** 평가 근거 링크가 이 말풍선으로 이동할 때 쓰는 대화 번호 */
  messageId?: string;
}) {
  return (
    <div
      className={`message ${role === "user" ? "user" : "ai"}`}
      data-message-id={messageId}
    >
      <div className="message-author">
        {role === "user" ? (
          <Avatar name={student.name} size="small" />
        ) : (
          <Avatar name="AI" size="small" ai />
        )}
        <span>{role === "user" ? student.name : "AI"}</span>
      </div>
      {pending ? (
        <PendingMessage announcement={content} />
      ) : role === "ai" ? (
        <Suspense fallback={<HistorySkeleton role={role} />}>
          <MarkdownMessage content={content} />
        </Suspense>
      ) : (
        <p>{content}</p>
      )}
    </div>
  );
}
