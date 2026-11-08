import { useEffect, useState, type ReactNode } from "react";
import { apiErrorMessage } from "../../api/client";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Skeleton } from "../ui/Skeleton";
import { Tabs } from "../ui/Tabs";
import { PdfPagePreview } from "./PdfPagePreview";
import { ReportPagePreview } from "./ReportPagePreview";
import "./report-save-dialog.css";

export type { ReportFormat } from "../../lib/classReports";
import type { ReportFormat } from "../../lib/classReports";

const messageOf = (caught: unknown, fallback: string) =>
  caught instanceof Error && caught.message ? caught.message : apiErrorMessage(caught, fallback);

/** 보고서를 저장하기 전에 형식(PDF/한글)을 고르고 인쇄될 모습을 미리 봅니다. */
export function ReportSaveDialog({
  studentName,
  hwp,
  loadPreview,
  report,
  onSave,
  onClose,
}: {
  studentName: string;
  /** 한글(HWP) 저장을 제공하는지 */
  hwp: boolean;
  /** 서버 PDF(한글 파일과 같은 서버 보고서)를 불러와 미리보기로 씁니다. */
  loadPreview?: () => Promise<Blob>;
  /** 서버가 없을 때 대신 보여줄 앱 보고서 내용(인쇄되는 것과 같습니다). */
  report?: ReactNode;
  onSave: (format: ReportFormat) => Promise<void> | void;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    if (!loadPreview) return;
    let active = true;
    loadPreview()
      .then((blob) => {
        if (active) setPreviewBlob(blob);
      })
      .catch((caught) => {
        if (!active) return;
        setError(messageOf(caught, "미리보기를 불러오지 못했습니다."));
        setPreviewFailed(true);
      });
    return () => {
      active = false;
    };
  }, [loadPreview]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      await onSave(format);
      onClose();
    } catch (caught) {
      setError(messageOf(caught, "보고서를 저장하지 못했습니다."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      dismissOnBackdrop={false}
      title="보고서 저장"
      size="large"
      className="report-save-modal"
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button onClick={() => void save()} loading={saving}>
            저장하기
          </Button>
        </>
      }
    >
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
      <div className="report-preview">
        {loadPreview ? (
          previewFailed ? (
            <p className="report-preview-empty">미리보기를 불러오지 못했어요.</p>
          ) : previewBlob ? (
            <PdfPagePreview blob={previewBlob} title={`${studentName} 학습 보고서`} />
          ) : (
            <Skeleton className="report-preview-skeleton" />
          )
        ) : (
          <ReportPagePreview title={`${studentName} 학습 보고서`}>{report}</ReportPagePreview>
        )}
      </div>
      {error && !previewFailed && (
        <p className="dialog-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
