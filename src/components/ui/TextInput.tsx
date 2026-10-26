import type { InputHTMLAttributes, ReactNode } from "react";
type Props = InputHTMLAttributes<HTMLInputElement> & {
  leadingIcon?: ReactNode;
  variant?: "box" | "under-bar" | "search";
  label?: string;
  error?: string;
};
export function TextInput({
  leadingIcon,
  variant = "box",
  label,
  error,
  className = "",
  id,
  ...props
}: Props) {
  return (
    <label className={`text-input-field ${className}`}>
      {label && <span>{label}</span>}
      <span
        className={
          variant === "search" ? "search" : `text-input text-input--${variant}`
        }
        data-error={!!error}
      >
        {leadingIcon}
        <input id={id} aria-invalid={!!error} {...props} />
      </span>
      {error && <span className="input-error">{error}</span>}
    </label>
  );
}
