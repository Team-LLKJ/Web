type Props = {
  name: string;
  color?: string;
  size?: "small" | "medium" | "large";
  ai?: boolean;
};
export function Avatar({ name, color, size = "medium", ai = false }: Props) {
  return (
    <span
      className={`avatar ${size === "small" ? "small" : ""} ${size === "large" ? "avatar-large" : ""} ${ai ? "ai-avatar" : ""}`}
      style={color ? { background: color } : undefined}
    >
      {ai ? "AI" : name[0]}
    </span>
  );
}
