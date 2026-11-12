import { StudentLeaveButton } from "./StudentLeaveButton";
export function WaitingRoom({
  nickname,
  onLeave,
  notice,
}: {
  nickname: string;
  onLeave: () => void;
  notice?: string;
}) {
  return (
    <main className="student-join waiting-room">
      <StudentLeaveButton onLeave={onLeave} />
      <div className="waiting-content" role="status">
        <img
          className="waiting-loader"
          src="/student-assets/loader.png"
          width="100"
          height="100"
          alt=""
        />
        <h1>
          {nickname}님 시작하기 전까지
          <br />
          잠시만 기다려주세요.
        </h1>
        {notice && <p className="student-runtime-notice" role="alert">{notice}</p>}
      </div>
    </main>
  );
}
