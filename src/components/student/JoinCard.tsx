import type { ReactNode } from "react";
export function JoinCard({
  title,
  children,
  onSubmit,
}: {
  title: string;
  children: ReactNode;
  onSubmit: () => void;
}) {
  return (
    <form
      className="join-card"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <h1>{title}</h1>
      {children}
    </form>
  );
}
