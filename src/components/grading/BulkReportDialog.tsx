import { useEffect, useMemo, useRef, useState } from "react";
import { apiErrorMessage } from "../../api/client";
import {
  listReportTargets,
  loadReportPreview,
  type ReportFormat,
  type ReportTarget,
} from "../../lib/classReports";
import { Button } from "../ui/Button";
import { Dropdown } from "../ui/Dropdown";
import { Modal } from "../ui/Modal";
import { Skeleton } from "../ui/Skeleton";
import { Tabs } from "../ui/Tabs";
import { PdfPagePreview } from "./PdfPagePreview";
import "./report-save-dialog.css";
import "./bulk-report-dialog.css";

const messageOf = (caught: unknown, fallback: string) =>
  caught instanceof Error && caught.message ? caught.message : apiErrorMessage(caught, fallback);

/** 반(또는 폴더) 전체 보고서를 저장하기 전에 학생별 보고서를 미리 보고, 제출한 학생 전원을 ZIP으로 저장합니다. */
export function BulkReportDialog({
  title = "보고서 저장",
  classes,
  hwp,
  onSaveAll,
  onClose,
}: {
  title?: string;
  /** 보고서를 모을 반(평가 회차) 목록 */
  classes: { id: string; name: string; label?: string }[];
  hwp: boolean;
  onSaveAll: (
    format: ReportFormat,
    onProgress: (done: number, total: number) => void,
  ) => Promise<{ saved: number; failed: string[] }>;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [targets, setTargets] = useState<ReportTarget[] | null>(null);
  const [selected, setSelected] = useState(0);
  // 학생별 미리보기 PDF와 실패 여부. 한 번 받은 학생은 다시 받지 않습니다.
  const [blobs, setBlobs] = useState<Record<string, Blob>>({});
  const [failedKeys, setFailedKeys] = useState<Record<string, boolean>>({});
  const requested = useRef(new Set<string>());
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ saved: number; failed: string[] } | null>(null);

  const classKey = useMemo(() => classes.map((item) => item.id).join(","), [classes]);

  useEffect(() => {
    let active = true;
    listReportTargets(classes)
      .then((items) => {
        if (active) setTargets(items);
      })
      .catch((caught) => {
        if (!active) return;
        setError(messageOf(caught, "학생 목록을 불러오지 못했습니다."));
        setTargets([]);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classKey]);

  const current = targets?.[selected];
  const currentKey = current ? `${current.evaluationId}:${current.participantId}` : "";

  useEffect(() => {
    // 지금 학생을 먼저 받고, 다음 학생도 미리 받아 둬 넘길 때 바로 보이게 합니다.
    for (const target of [targets?.[selected], targets?.[selected + 1]]) {
      if (!target) continue;
      const key = `${target.evaluationId}:${target.participantId}`;
      if (requested.current.has(key)) continue;
      requested.current.add(key);
      loadReportPreview(target)
        .then((blob) => setBlobs((value) => ({ ...value, [key]: blob })))
        .catch((caught) => {
          console.error("보고서 미리보기 실패", caught);
          setFailedKeys((value) => ({ ...value, [key]: true }));
        });
    }
  }, [targets, selected]);
  const previewBlob = blobs[currentKey] ?? null;
  const previewFailed = Boolean(failedKeys[currentKey]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      setResult(await onSaveAll(format, (done, total) => setProgress({ done, total })));
    } catch (caught) {
      setError(messageOf(caught, "보고서를 저장하지 못했습니다."));
    } finally {
      setSaving(false);
    }
  }

  const total = targets?.length ?? 0;
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  // 반 → 학생 순으로 고르도록 반 목록과 그 반의 학생 목록을 나눕니다.
  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of targets ?? []) if (!map.has(t.evaluationId)) map.set(t.evaluationId, t.classLabel);
    return [...map];
  }, [targets]);
  const studentOptions = useMemo(
    () =>
      (targets ?? [])
        .map((t, index) => ({ t, index }))
        .filter(({ t }) => t.evaluationId === current?.evaluationId),
    [targets, current?.evaluationId],
  );
  return (
    <Modal
      dismissOnBackdrop={false}
      title={title}
      size="large"
      className="report-save-modal bulk-report-modal"
      onClose={saving ? () => undefined : onClose}
      actions={
        result ? (
          <Button onClick={onClose}>확인</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              취소
            </Button>
            <Button onClick={() => void save()} loading={saving} disabled={total === 0}>
              {total ? `${total}명 저장하기` : "저장하기"}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="bulk-report-result" role="status">
          <strong>{result.saved}명의 보고서를 ZIP으로 저장했어요.</strong>
          {result.failed.length > 0 && <p>받지 못한 학생: {result.failed.join(", ")}</p>}
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
          {targets && total > 0 && (
            <div className="bulk-report-pickers">
              <div className="bulk-report-picker">
                <span>반</span>
                <Dropdown
                  label="반"
                  value={current?.evaluationId ?? ""}
                  disabled={saving}
                  options={classOptions.map(([id, name]) => ({ value: id, label: name || "반" }))}
                  onChange={(id) => {
                    const first = targets.findIndex((t) => t.evaluationId === id);
                    if (first >= 0) setSelected(first);
                  }}
                />
              </div>
              <div className="bulk-report-picker">
                <span>학생</span>
                <Dropdown
                  label="학생"
                  value={String(selected)}
                  disabled={saving}
                  options={studentOptions.map(({ t, index }) => ({ value: String(index), label: t.nickname }))}
                  onChange={(index) => setSelected(Number(index))}
                />
              </div>
            </div>
          )}
          <div className="report-preview">
            {targets === null ? (
              <Skeleton className="report-preview-skeleton" />
            ) : total === 0 ? (
              <p className="report-preview-empty">제출한 학생이 없어 저장할 보고서가 없어요.</p>
            ) : previewFailed ? (
              <p className="report-preview-empty">미리보기를 불러오지 못했어요.</p>
            ) : previewBlob ? (
              <PdfPagePreview blob={previewBlob} title={`${current?.nickname ?? ""} 학습 보고서`} />
            ) : (
              <Skeleton className="report-preview-skeleton" />
            )}
          </div>
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
