import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { paths } from "../../router/paths";
import { HeaderUtilities } from "../ui/HeaderDialogs";
import { useAuth } from "../../auth/useAuth";
export function LandingHeader({
  showUtilities = true,
}: {
  /** 예전 로그아웃 안내용. 로그아웃은 설정 화면으로 옮겨서 지금은 쓰지 않습니다. */
  onNotice?: (title: string) => void;
  /** false면 알림·설정 아이콘을 숨깁니다(처음 화면). */
  showUtilities?: boolean;
}) {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  // Transparent over the hero, frosted glass once content scrolls underneath.
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header className={`landing-header${scrolled ? " is-scrolled" : ""}`}>
      <Link
        className="lit-logo-link"
        to={paths.home}
        aria-label="처음 화면으로 이동"
      >
        <img src="/lit-logo.png" width="100" height="50" alt="LIT" />
      </Link>
      <nav aria-label="서비스 메뉴">
        {/* 로그인했을 때만 알림·설정 아이콘을 보여 줍니다. */}
        {showUtilities && user && <HeaderUtilities />}
        {!loading && !user && (
          <>
            <Link className="button landing-outline" to={paths.signup}>
              회원가입
            </Link>
            <Link className="button primary" to={paths.login}>
              로그인
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
