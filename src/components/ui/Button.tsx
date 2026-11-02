import type { ButtonHTMLAttributes, ReactNode } from "react";
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "white-danger"
  | "white-primary"
  | "ghost"
  | "text";
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "small" | "medium" | "large";
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  /** true면 글자 앞에 빙글빙글 도는 표시를 보이고 버튼을 잠급니다. */
  loading?: boolean;
};
export function Button({
  variant = "primary",
  size = "medium",
  icon,
  iconPosition = "left",
  className = "",
  children,
  type = "button",
  loading = false,
  disabled,
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={`button button--${variant} button--${size} ${variant === "secondary" ? "neutral" : variant === "white-danger" ? "danger" : variant === "primary" ? "primary" : ""} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="button-spinner" aria-hidden="true" />}
      {iconPosition === "left" && icon}
      {children}
      {iconPosition === "right" && icon}
    </button>
  );
}
