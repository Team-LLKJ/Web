import { Link } from "react-router-dom";
import { paths } from "../router/paths";
export function NotFoundPage() {
  return (
    <main className="view-index">
      <h1>페이지를 찾을 수 없어요</h1>
      <p>주소를 확인하거나 화면 목록에서 다시 선택해주세요.</p>
      <nav>
        <Link to={paths.views}>화면 목록으로</Link>
      </nav>
    </main>
  );
}
