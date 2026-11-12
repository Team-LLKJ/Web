import { Button } from "../ui/Button";

export function StudentLeaveButton({
  onLeave,
  disabled,
}: {
  onLeave: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="white-danger"
      size="small"
      className="waiting-leave"
      disabled={disabled}
      onClick={onLeave}
      icon={<img className="back-icon" src="/student-assets/back.svg" alt="" />}
    >
      나가기
    </Button>
  );
}
