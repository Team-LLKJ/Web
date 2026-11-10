import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiError, apiErrorMessage } from "../api/client";
import {
  createMyReport,
  getAiDisclosure,
  getMyReport,
  getMyReportFile,
} from "../api/evaluations";
import type { AiDisclosure } from "../api/types";
import { Skeleton, SkeletonStatus } from "../components/ui/Skeleton";
import { Button } from "../components/ui/Button";
import {
  clearReportCredentials,
  readReportCredentials,
} from "../data/studentSession";
import "../components/student/student.css";
import "../components/student/student-done.css";

/** 제출 완료 화면. 본인 리포트(PDF·HWP)를 받을 수 있습니다. */
export function StudentDonePage() {
  const navigate = useNavigate();
  const [credentials] = useState(readReportCredentials);
  const [busy, setBusy] = useState<"" | "pdf" | "hwp">("");
  const [error, setError] = useState("");

  const [disclosure, setDisclosure] = useState<AiDisclosure | null>(null);
  const [disclosureLoading, setDisclosureLoading] = useState(true);
  const [disclosureError, setDisclosureError] = useState("");
  const [disclosureAttempt, setDisclosureAttempt] = useState(0);

  useEffect(() => {
    if (!credentials) return;
    let active = true;
    void getAiDisclosure(credentials.evaluationId, credentials.participantToken)
      .then((result) => {
        if (active) setDisclosure(result);
      })
      .catch((error: unknown) => {
        if (active)
          setDisclosureError(
            apiErrorMessage(error, "AI 활용 기록을 불러오지 못했어요."),
          );
      })
      .finally(() => {
        if (active) setDisclosureLoading(false);
      });
    return () => {
      active = false;
    };
  }, [credentials, disclosureAttempt]);

  function reloadDisclosure() {
    setDisclosureError("");
    setDisclosureLoading(true);
    setDisclosureAttempt((current) => current + 1);
  }

  if (!credentials) return <Navigate to="/" replace />;

  async function download(format: "pdf" | "hwp") {
    if (!credentials) return;
    setBusy(format);
    setError("");
    const { evaluationId, participantToken } = credentials;
    try {
      const metadata = await getMyReport(evaluationId, participantToken).catch(
        () => null,
      );
      let blob: Blob;
      try {
        blob = await getMyReportFile(
          evaluationId,
          participantToken,
          format,
          metadata?.version,
        );
      } catch (caught) {
        if (!(caught instanceof ApiError && caught.status === 404))
          throw caught;
        const report = await createMyReport(evaluationId, participantToken);
        blob = await getMyReportFile(
          evaluationId,
          participantToken,
          format,
          report.version,
        );
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
          : apiErrorMessage(
              caught,
              "리포트를 받지 못했어요. 잠시 후 다시 시도해주세요.",
            ),
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
      <section
        className="join-card student-done-card"
        aria-labelledby="student-done-title"
      >
        <div className="student-done-icon" aria-hidden="true">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </div>
        <div className="student-done-text">
          <h1 id="student-done-title">제출을 완료했어요</h1>
          <p>
            {credentials.nickname ? `${credentials.nickname}님, ` : ""}
            수고했어요!
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
            <Button
              variant="secondary"
              loading={busy === "pdf"}
              disabled={Boolean(busy)}
              onClick={() => void download("pdf")}
            >
              PDF로 받기
            </Button>
            <Button
              variant="secondary"
              loading={busy === "hwp"}
              disabled={Boolean(busy)}
              onClick={() => void download("hwp")}
            >
              HWP로 받기
            </Button>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <section aria-labelledby="student-disclosure-title">
          <h2 id="student-disclosure-title">AI 활용 기록</h2>
          {disclosureLoading ? (
            <SkeletonStatus label="AI 활용 기록을 불러오는 중">
              <Skeleton
                style={{ display: "block", width: "100%", height: 20 }}
              />
            </SkeletonStatus>
          ) : disclosureError || disclosure?.status === "PENDING" ? (
            <>
              <p role="status">
                {disclosureError || "AI 활용 기록을 준비하고 있어요."}
              </p>
              <Button variant="secondary" onClick={reloadDisclosure}>
                다시 확인
              </Button>
            </>
          ) : disclosure?.status === "FAILED" ? (
            <p role="status">AI 활용 기록을 생성하지 못했어요.</p>
          ) : disclosure &&
            (disclosure.tools || disclosure.usedParts || disclosure.reason) ? (
            <dl>
              {disclosure.tools && (
                <>
                  <dt>사용한 도구</dt>
                  <dd>{disclosure.tools}</dd>
                </>
              )}
              {disclosure.usedParts && (
                <>
                  <dt>활용 내용</dt>
                  <dd>{disclosure.usedParts}</dd>
                </>
              )}
              {disclosure.reason && (
                <>
                  <dt>활용 이유</dt>
                  <dd>{disclosure.reason}</dd>
                </>
              )}
            </dl>
          ) : (
            <p>표시할 AI 활용 기록이 없어요.</p>
          )}
        </section>
        <Button onClick={finish}>처음 화면으로</Button>
      </section>
    </main>
  );
}
