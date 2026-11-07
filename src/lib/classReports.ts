import { ApiError } from "../api/client";
import {
  createGradingReport,
  getGradingReportHwp,
  getGradingReportPdf,
  getGradingStudents,
} from "../api/evaluations";
import { createZip, type ZipEntry } from "./zip";

export type ReportFormat = "pdf" | "hwp";

const safe = (name: string) => name.replace(/[\\/:*?"<>|]/g, "_").trim();

/** 한 반(평가 회차)에서 제출한 학생 전원의 보고서를 받아 ZIP 하나로 저장합니다. */
export function downloadClassReports(
  evaluationId: string,
  format: ReportFormat,
  onProgress: (done: number, total: number) => void,
) {
  return downloadReportsZip([{ id: evaluationId, name: "" }], format, onProgress, "반 전체 학습 보고서");
}

/** 폴더 안의 모든 반에서 제출한 학생의 보고서를 반 이름별 폴더로 묶어 ZIP 하나로 저장합니다. */
export function downloadFolderReports(
  folderName: string,
  classes: { id: string; name: string }[],
  format: ReportFormat,
  onProgress: (done: number, total: number) => void,
) {
  return downloadReportsZip(classes, format, onProgress, `${safe(folderName) || "폴더"} 전체 학습 보고서`);
}

async function downloadReportsZip(
  classes: { id: string; name: string }[],
  format: ReportFormat,
  onProgress: (done: number, total: number) => void,
  zipName: string,
): Promise<{ saved: number; failed: string[] }> {
  const targets: { evaluationId: string; folder: string; nickname: string; participantId: string }[] = [];
  for (const item of classes) {
    const { students } = await getGradingStudents(item.id, { size: 500 });
    for (const s of students) {
      if (s.submissionStatus === "SUBMITTED")
        targets.push({
          evaluationId: item.id,
          folder: item.name ? `${safe(item.name) || "반"}/` : "",
          nickname: s.nickname,
          participantId: s.participantId,
        });
    }
  }
  if (!targets.length) throw new Error("제출한 학생이 없어요.");
  const files: ZipEntry[] = [];
  const failed: string[] = [];
  const used = new Map<string, number>();
  onProgress(0, targets.length);
  for (const [index, student] of targets.entries()) {
    const { evaluationId } = student;
    try {
      let blob: Blob;
      if (format === "hwp") {
        try {
          blob = await getGradingReportHwp(evaluationId, student.participantId);
        } catch (e) {
          if (!(e instanceof ApiError && e.status === 404)) throw e;
          await createGradingReport(evaluationId, student.participantId);
          blob = await getGradingReportHwp(evaluationId, student.participantId);
        }
      } else {
        blob = await getGradingReportPdf(evaluationId, student.participantId);
      }
      const base = `${student.folder}${safe(student.nickname) || "학생"}`;
      const count = (used.get(base) ?? 0) + 1;
      used.set(base, count);
      files.push({
        name: `${base}${count > 1 ? ` (${count})` : ""} 학습 보고서.${format}`,
        data: new Uint8Array(await blob.arrayBuffer()),
      });
    } catch {
      failed.push(student.nickname);
    }
    onProgress(index + 1, targets.length);
  }
  if (!files.length) throw new Error("보고서를 하나도 받지 못했어요.");
  const url = URL.createObjectURL(createZip(files));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${zipName}(${format.toUpperCase()}).zip`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { saved: files.length, failed };
}
