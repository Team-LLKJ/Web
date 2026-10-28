import { useId, type InputHTMLAttributes, type ReactNode } from "react";
type Props = InputHTMLAttributes<HTMLInputElement> & {
  leadingIcon?: ReactNode;
  trailingAction?: ReactNode;
  variant?: "box" | "under-bar" | "search";
  label?: string;
  floatingLabel?: boolean;
  error?: string;
};
export function TextInput({
  leadingIcon,
  trailingAction,
  variant = "box",
  label,
  floatingLabel = false,
  error,
  className = "",
  id,
  placeholder,
  ...props
}: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const currentValue = props.value ?? props.defaultValue;
  const isFilled = currentValue !== undefined && currentValue !== null && String(currentValue).length > 0;
  return (
    <div className={`text-input-field ${floatingLabel ? "text-input-field--floating" : ""} ${floatingLabel && isFilled ? "text-input-field--filled" : ""} ${className}`}>
      {label && <label htmlFor={inputId}>{label}</label>}
      <span
        className={
          variant === "search" ? "search" : `text-input text-input--${variant}`
        }
        data-error={!!error}
      >
        {leadingIcon}
        <input
          id={inputId}
          placeholder={placeholder}
          aria-invalid={!!error}
          {...props}
        />
        {trailingAction}
      </span>
      {error && <span className="input-error">{error}</span>}
    </div>
  );
}
