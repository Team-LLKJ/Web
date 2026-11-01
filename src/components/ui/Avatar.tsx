type Props = {
  name: string;
  color?: string;
  size?: "small" | "medium" | "large";
  ai?: boolean;
};
const AVATAR_COLORS = [
  "#F2B8A2",
  "#F6D186",
  "#B7D7A8",
  "#9FD3C7",
  "#A9C8EC",
  "#C5B8E8",
  "#EBB5D0",
  "#D9C2A7",
  "#F3A9A0",
  "#B8D8E8",
];
function pickAvatarColor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
export function Avatar({ name, color, size = "medium", ai = false }: Props) {
  const background = ai ? color : (color ?? pickAvatarColor(name));
  return (
    <span
      className={`avatar ${size === "small" ? "small" : ""} ${size === "large" ? "avatar-large" : ""} ${ai ? "ai-avatar" : ""}`}
      style={
        background
          ? { background, color: ai ? undefined : "#1c1c1e" }
          : undefined
      }
    >
      {ai ? "AI" : name[0]}
    </span>
  );
}
