type Props<T extends string | number> = {
  label: string;
  value: T;
  items: readonly {
    value: T;
    label: string;
  }[];
  onChange: (value: T) => void;
  variant?: "underline" | "pill";
};
export function Tabs<T extends string | number>({
  label,
  value,
  items,
  onChange,
  variant = "underline",
}: Props<T>) {
  return (
    <div
      className={variant === "pill" ? "detail-tabs" : "question-tabs"}
      role="tablist"
      aria-label={label}
    >
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          className={value === item.value ? "active" : ""}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
