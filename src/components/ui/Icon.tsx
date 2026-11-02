import bellIcon from "../../assets/Bell.svg";
import settingsIcon from "../../assets/Settings.svg";

export function Icon({ name }: { name: "search" | "bell" | "settings" }) {
  if (name !== "search") {
    return (
      <img
        src={name === "bell" ? bellIcon : settingsIcon}
        width={30}
        height={30}
        alt=""
        aria-hidden="true"
      />
    );
  }

  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="10.5" cy="10.5" r="7" />
      <path d="m16 16 5 5" />
    </svg>
  );
}
