import { Component, type ErrorInfo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ErrorPage } from "./ErrorPage";

type State = { error: Error | null };

/** 배포 직후 옛 화면 파일을 못 불러온 경우(새로고침하면 해결). */
const isChunkError = (error: Error) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk/i.test(
    error.message,
  );

class Boundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[LIT] 화면 오류", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const chunk = isChunkError(error);
    return (
      <ErrorPage
        code={chunk ? "NEW" : "500"}
        title={chunk ? "새 버전이 나왔어요" : "화면을 보여주는 중 문제가 생겼어요"}
        description={
          chunk
            ? "새로고침하면 최신 화면으로 바로 이어서 쓸 수 있어요."
            : "잠시 후 다시 시도해주세요. 작성 중이던 답안은 자동 저장된 내용까지 남아 있어요."
        }
        actions={
          <>
            <button
              type="button"
              className="button button--primary button--medium primary"
              onClick={() => window.location.reload()}
            >
              새로고침
            </button>
            {!chunk && (
              <a className="button button--secondary button--medium neutral" href="/">
                처음 화면으로
              </a>
            )}
          </>
        }
        detail={import.meta.env.DEV ? `${error.name}: ${error.message}` : undefined}
      />
    );
  }
}

/** 화면 이동하면 오류 상태를 풀어 다른 페이지는 정상으로 보이게 합니다. */
export function AppErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <Boundary key={location.pathname}>{children}</Boundary>;
}
