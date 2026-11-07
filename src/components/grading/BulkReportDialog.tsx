import { useState } from "react";
import { apiErrorMessage } from "../../api/client";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Tabs } from "../ui/Tabs";
import type { ReportFormat } from "../../lib/classReports";
import "./bulk-report-dialog.css";

/** 이 반에서 제출한 학생 전원의 보고서를 한 번에 ZIP으로 저장합니다. */
export function BulkReportDialog({
  title = "반 전체 보고서 저장",
  submitted,
  hwp,
  onSaveAll,
  onClose,
}: {
  title?: string;
  /** 보고서를 저장할 수 있는(제출한) 학생 수 */
  submitted: number;
  hwp: boolean;
  onSaveAll: (
    format: ReportFormat,
    onProgress: (done: number, total: number) => void,
  ) => Promise<{ saved: number; failed: string[] }>;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: submitted });
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ saved: number; failed: string[] } | null>(null);

  async function save() {
    setSaving(true);
    setError("");
    try {
      setResult(await onSaveAll(format, (done, total) => setProgress({ done, total })));
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message
          ? caught.message
          : apiErrorMessage(caught, "보고서를 저장하지 못했습니다."),
      );
    } finally {
      setSaving(false);
    }
  }

  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <Modal
      title={title}
      onClose={saving ? () => undefined : onClose}
      className="bulk-report-modal"
      actions={
        result ? (
          <Button onClick={onClose}>확인</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              취소
            </Button>
            <Button onClick={() => void save()} loading={saving} disabled={submitted === 0}>
              저장하기
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="bulk-report-result" role="status">
          <strong>{result.saved}명의 보고서를 ZIP으로 저장했어요.</strong>
          {result.failed.length > 0 && (
            <p>받지 못한 학생: {result.failed.join(", ")}</p>
          )}
        </div>
      ) : (
        <>
          {hwp && (
            <Tabs
              label="저장 형식"
              variant="segment"
              value={format}
              items={[
                { value: "pdf", label: "PDF" },
                { value: "hwp", label: "한글(HWP)" },
              ]}
              onChange={setFormat}
            />
          )}
          <p className="bulk-report-info">
            {submitted > 0
              ? `제출한 학생 ${submitted}명의 보고서를 ZIP 파일 하나로 저장해요.`
              : "제출한 학생이 없어 저장할 보고서가 없어요."}
          </p>
          {saving && (
            <div className="bulk-report-progress" role="status" aria-live="polite">
              <div className="bulk-report-bar">
                <span style={{ width: `${percent}%` }} />
              </div>
              <small>
                {progress.done} / {progress.total}명 받는 중
              </small>
            </div>
          )}
          {error && (
            <p className="dialog-error" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </Modal>
  );
}
