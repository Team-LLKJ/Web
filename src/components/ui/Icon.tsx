export function Icon({ name }: { name: "search" | "bell" | "settings" }) {
  return (
    <svg
      width={name === "search" ? 24 : 30}
      height={name === "search" ? 24 : 30}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "search" ? (
        <>
          <circle cx="10.5" cy="10.5" r="7" />
          <path d="m16 16 5 5" />
        </>
      ) : name === "bell" ? (
        <>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </>
      ) : (
        <>
          <path
            d="m9 3 1-2h4l1 2 2 1 2-.5 2 3-1.5 2v3l1.5 2-2 3-2-.5-2 1-1 3h-4l-1-3-2-1-2 .5-2-3L4.5 12V9L3 7l2-3 2 .5Z"
            transform="translate(0 1) scale(1 .95)"
          />
          <circle cx="12" cy="11.5" r="3" />
        </>
      )}
    </svg>
  );
}
