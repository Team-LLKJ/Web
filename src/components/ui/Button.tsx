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
};
export function Button({
  variant = "primary",
  size = "medium",
  icon,
  iconPosition = "left",
  className = "",
  children,
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={`button button--${variant} button--${size} ${variant === "secondary" ? "neutral" : variant === "white-danger" ? "danger" : variant === "primary" ? "primary" : ""} ${className}`}
      {...props}
    >
      {iconPosition === "left" && icon}
      {children}
      {iconPosition === "right" && icon}
    </button>
  );
}
