import type { ButtonHTMLAttributes, ReactNode } from "react";
type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  children: ReactNode;
};
export function IconButton({
  label,
  children,
  className = "",
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={`icon-button ${className}`}
      aria-label={label}
      {...props}
    >
      {children}
    </button>
  );
}
