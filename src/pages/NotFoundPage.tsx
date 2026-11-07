import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { ErrorPage } from "../components/ui/ErrorPage";
import { homePathFor, paths } from "../router/paths";

export function NotFoundPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const home = user ? homePathFor(user.role) : paths.home;
  return (
    <ErrorPage
      code="404"
      title="페이지를 찾을 수 없어요"
      description="주소가 잘못됐거나, 페이지가 삭제됐을 수 있어요. 주소를 다시 확인해주세요."
      actions={
        <>
          <Link className="button button--primary button--medium primary" to={home} replace>
            {user?.role === "TEACHER" ? "내 수행평가로" : "처음 화면으로"}
          </Link>
          {window.history.length > 1 && (
            <button
              type="button"
              className="button button--secondary button--medium neutral"
              onClick={() => navigate(-1)}
            >
              이전 페이지로
            </button>
          )}
        </>
      }
    />
  );
}
