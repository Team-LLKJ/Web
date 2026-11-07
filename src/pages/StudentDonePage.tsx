import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiError, apiErrorMessage } from "../api/client";
import { createMyReport, getMyReportFile } from "../api/evaluations";
import { Button } from "../components/ui/Button";
import { clearReportCredentials, readReportCredentials } from "../data/studentSession";
import "../components/student/student.css";
import "../components/student/student-done.css";

/** 제출 완료 화면. 본인 리포트(PDF·HWP)를 받을 수 있습니다. */
export function StudentDonePage() {
  const navigate = useNavigate();
  const [credentials] = useState(readReportCredentials);
  const [busy, setBusy] = useState<"" | "pdf" | "hwp">("");
  const [error, setError] = useState("");

  if (!credentials) return <Navigate to="/" replace />;

  async function download(format: "pdf" | "hwp") {
    if (!credentials) return;
    setBusy(format);
    setError("");
    const { evaluationId, participantToken } = credentials;
    try {
      let blob: Blob;
      try {
        blob = await getMyReportFile(evaluationId, participantToken, format);
      } catch (caught) {
        // 아직 만든 리포트가 없으면 만들고 다시 받습니다.
        if (!(caught instanceof ApiError && caught.status === 404)) throw caught;
        await createMyReport(evaluationId, participantToken);
        blob = await getMyReportFile(evaluationId, participantToken, format);
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${credentials.title || "수행평가"} 리포트.${format}`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 401
          ? "지금은 리포트를 받을 수 없어요. 선생님께 문의해주세요."
          : apiErrorMessage(caught, "리포트를 받지 못했어요. 잠시 후 다시 시도해주세요."),
      );
    } finally {
      setBusy("");
    }
  }

  function finish() {
    clearReportCredentials();
    navigate("/", { replace: true });
  }

  return (
    <main className="student-join">
      <section className="join-card student-done-card" aria-labelledby="student-done-title">
        <div className="student-done-icon" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </div>
        <div className="student-done-text">
          <h1 id="student-done-title">제출을 완료했어요</h1>
          <p>
            {credentials.nickname ? `${credentials.nickname}님, ` : ""}수고했어요!
            {credentials.title && (
              <>
                <br />
                <strong>{credentials.title}</strong> 답안이 선생님께 전달됐어요.
              </>
            )}
          </p>
        </div>
        <div className="student-done-report">
          <p>내 답안과 AI 사용 기록을 리포트로 받아 둘 수 있어요.</p>
          <div className="student-done-actions">
            <Button variant="secondary" loading={busy === "pdf"} disabled={Boolean(busy)} onClick={() => void download("pdf")}>
              PDF로 받기
            </Button>
            <Button variant="secondary" loading={busy === "hwp"} disabled={Boolean(busy)} onClick={() => void download("hwp")}>
              HWP로 받기
            </Button>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
        <Button onClick={finish}>처음 화면으로</Button>
      </section>
    </main>
  );
}
