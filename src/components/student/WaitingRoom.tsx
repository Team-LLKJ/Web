import { Button } from "../ui/Button";
export function WaitingRoom({
  nickname,
  onLeave,
}: {
  nickname: string;
  onLeave: () => void;
}) {
  return (
    <main className="student-join waiting-room">
      <Button
        variant="white-danger"
        size="large"
        className="waiting-leave"
        onClick={onLeave}
        icon={
          <img className="back-icon" src="/student-assets/back.svg" alt="" />
        }
      >
        나가기
      </Button>
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
      </div>
    </main>
  );
}
