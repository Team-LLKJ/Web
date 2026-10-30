import type { CSSProperties, ReactNode } from "react";

type SkeletonProps = {
  className?: string;
  style?: CSSProperties;
};

export function Skeleton({ className = "", style }: SkeletonProps) {
  return <span aria-hidden="true" className={`skeleton ${className}`} style={style} />;
}

export function SkeletonStatus({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className} role="status">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
