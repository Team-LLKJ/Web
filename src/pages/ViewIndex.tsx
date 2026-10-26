import { Link } from "react-router-dom";
export function ViewIndex() {
  return (
    <main className="view-index">
      <Link
        to="/views"
        className="lit-logo-link"
        aria-label="LIT 화면 목록으로 이동"
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
        <Link to="/teacher/grading">선생님 채점</Link>
      </nav>
    </main>
  );
}
