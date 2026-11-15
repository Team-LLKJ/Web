import { Link } from "react-router-dom";
export function ViewIndex() {
  return (
    <main className="view-index">
      <Link
        to="/"
        className="lit-logo-link"
        aria-label="처음 화면으로 이동"
      >
        <img src="/lit-logo.png" width="100" height="50" alt="LIT" />
      </Link>
      <h1>화면 미리보기</h1>
      <nav>
        <Link to="/">메인 · Default</Link>
        <Link to="/login">로그인</Link>
        <Link to="/signup">회원가입</Link>
        <Link to="/student/join">학생 참가 · PIN</Link>
        <Link to="/student/nickname">학생 참가 · 닉네임</Link>
        <Link to="/student/wait">학생 대기</Link>
        <Link to="/student/solve">학생 풀이</Link>
        <Link to="/teacher/evaluations">내 수행평가</Link>
        <Link to="/teacher/folders">선생님 수행평가 목록</Link>
        <Link to="/teacher/folders/new">선생님 수행평가 만들기</Link>
        <Link to="/teacher/grading">선생님 채점 화면</Link>
        <Link to="/settings">설정</Link>
        <Link to="/notifications">알림</Link>
        <Link to="/terms">이용약관</Link>
        <Link to="/privacy">개인정보 처리방침</Link>
      </nav>
    </main>
  );
}
