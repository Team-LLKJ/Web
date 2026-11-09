import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { paths } from "../../router/paths";

/** Keep the main entry points reachable after the hero scrolls out of view. */
export function LandingMobileActions() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const actions = document.getElementById("landing-primary-actions");
    if (!actions || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Do not show a second set of actions before the hero has been passed.
        setVisible(
          !entry.isIntersecting && entry.boundingClientRect.bottom < 0,
        );
      },
      { threshold: 0 },
    );
    observer.observe(actions);
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;

  return (
    <nav className="landing-mobile-actions" aria-label="수행평가 시작">
      <Link className="button landing-outline" to={paths.login}>
        평가 만들기
      </Link>
      <Link className="button primary" to={paths.join}>
        평가 참여하기
      </Link>
    </nav>
  );
}
