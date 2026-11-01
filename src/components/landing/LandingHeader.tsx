import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { paths } from "../../router/paths";
import { HeaderUtilities } from "../ui/HeaderDialogs";
import { useAuth } from "../../auth/useAuth";
import { Button } from "../ui/Button";
export function LandingHeader({
  onNotice,
}: {
  onNotice: (title: string) => void;
}) {
  const { user, logout } = useAuth();
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
        to={paths.views}
        aria-label="LIT 화면 목록으로 이동"
      >
        <img src="/lit-logo.png" width="100" height="50" alt="LIT" />
      </Link>
      <nav aria-label="서비스 메뉴">
        <HeaderUtilities />
        {user ? (
          <>
            <Link className="button landing-outline" to={user.role === "TEACHER" ? paths.evaluations : paths.join}>
              {user.role === "TEACHER" ? "내 수행평가" : "평가 참여"}
            </Link>
            <Button variant="primary" onClick={() => void logout().then(() => onNotice("로그아웃되었습니다."))}>로그아웃</Button>
          </>
        ) : (
          <>
            <Link className="button landing-outline" to={paths.signup}>회원가입</Link>
            <Link className="button primary" to={paths.login}>로그인</Link>
          </>
        )}
      </nav>
    </header>
  );
}
