import { avatarColor } from "../../lib/avatarColor";
type Props = {
  name: string;
  color?: string;
  size?: "small" | "medium" | "large";
  ai?: boolean;
};
export function Avatar({ name, color, size = "medium", ai = false }: Props) {
  const background = ai ? color : (color ?? avatarColor(name));
  return (
    <span
      className={`avatar ${size === "small" ? "small" : ""} ${size === "large" ? "avatar-large" : ""} ${ai ? "ai-avatar" : ""}`}
      style={
        background
          ? { background, color: ai ? undefined : "#fff" }
          : undefined
      }
    >
      {ai ? "AI" : name[0]}
    </span>
  );
}
