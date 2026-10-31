import { Link } from "react-router-dom";
import { paths } from "../../router/paths";
import { useAuth } from "../../auth/useAuth";
export function LandingFooter() {
  const { user } = useAuth();
  return (
    <footer className="landing-footer">
      <div className="landing-footer-main">
        <div className="landing-footer-brand">
          <img src="/lit-logo.png" width="100" height="50" alt="LIT" />
          <p>AI 활용 과정을 근거로 평가합니다</p>
          <small>수행평가를 위한 AI 활용 분석 플랫폼 · Team-LLKJ</small>
        </div>
        <nav className="landing-footer-links" aria-label="푸터 메뉴">
          <div>
            <h4>서비스</h4>
            <Link to={paths.join}>수행평가 참여하기</Link>
            <Link to={paths.login}>수행평가 만들기</Link>
            {user?.role === "TEACHER" && (
              <Link to={paths.evaluations}>내 수행평가</Link>
            )}
          </div>
          <div>
            <h4>계정</h4>
            {user ? (
              <>
                <Link to={paths.home}>홈</Link>
                <Link to={paths.settings}>설정</Link>
                <Link to={paths.notifications}>알림</Link>
              </>
            ) : (
              <>
                <Link to={paths.login}>로그인</Link>
                <Link to={paths.signup}>회원가입</Link>
                <Link to={paths.resetPassword}>비밀번호 재설정</Link>
              </>
            )}
          </div>
        </nav>
      </div>
      <div className="landing-footer-bottom">
        <div>
          <p>© 2026 LIT. All rights reserved.</p>
          <p className="landing-footer-legal">
            <Link to={paths.terms}>이용약관</Link>
            <Link to={paths.privacy}>개인정보 처리방침</Link>
          </p>
        </div>
        <div className="landing-footer-info">
          <p>제작: Team-LLKJ</p>
          <p>AI 활용 분석 플랫폼 LIT</p>
        </div>
      </div>
    </footer>
  );
}
