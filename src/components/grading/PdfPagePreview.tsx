import { useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import "./pdf-page-preview.css";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;
const clampZoom = (value: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100));

/** 서버 PDF를 브라우저 기본 뷰어 없이 한 쪽씩 보여주고 < > 버튼으로 넘깁니다. 스크롤 없이 한 쪽 전체가 보입니다. */
export function PdfPagePreview({ blob, title }: { blob: Blob; title: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let active = true;
    let loaded: PDFDocumentProxy | undefined;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = worker;
        loaded = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
        if (!active) {
          void loaded.destroy();
          return;
        }
        setDoc(loaded);
      } catch (caught) {
        console.error("PDF 미리보기 엔진을 불러오지 못했습니다", caught);
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
      void loaded?.destroy();
    };
  }, [blob]);

  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    let task: RenderTask | undefined;
    (async () => {
      const current = await doc.getPage(page);
      const canvas = canvasRef.current;
      const box = boxRef.current;
      if (!canvas || !box || cancelled) return;
      const ratio = window.devicePixelRatio || 1;
      const base = current.getViewport({ scale: 1 });
      const fit = Math.min(box.offsetWidth / base.width, box.offsetHeight / base.height) * zoom;
      const viewport = current.getViewport({ scale: fit * ratio });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / ratio}px`;
      canvas.style.height = `${viewport.height / ratio}px`;
      const context = canvas.getContext("2d");
      if (!context) return;
      task = current.render({ canvasContext: context, viewport });
      try {
        await task.promise;
      } catch {
        // 쪽을 빠르게 넘기면 이전 그리기가 취소됩니다.
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, page, zoom]);

  // Ctrl(⌘)+휠로 확대·축소합니다.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom((value) => clampZoom(value + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)));
    };
    box.addEventListener("wheel", onWheel, { passive: false });
    return () => box.removeEventListener("wheel", onWheel);
  }, []);
  // 미리보기 엔진을 못 쓰는 환경(서버가 .mjs를 잘못 내려주는 경우 등)에서는 브라우저 기본 PDF 뷰어로 보여줍니다.
  if (failed) return <FallbackViewer blob={blob} title={title} />;
  const total = doc?.numPages ?? 0;
  return (
    <div className="pdf-preview">
      <div className={`pdf-preview-scroll ${zoom > 1 ? "is-zoomed" : ""}`} ref={boxRef}>
        <canvas ref={canvasRef} role="img" aria-label={`${title} ${page}쪽`} />
      </div>
      <div className="pdf-preview-zoom" role="group" aria-label="확대 축소">
        <button type="button" aria-label="축소" disabled={zoom <= ZOOM_MIN} onClick={() => setZoom((v) => clampZoom(v - ZOOM_STEP))}>−</button>
        <button type="button" className="pdf-preview-zoom-value" aria-label="원래 크기로" onClick={() => setZoom(1)}>
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" aria-label="확대" disabled={zoom >= ZOOM_MAX} onClick={() => setZoom((v) => clampZoom(v + ZOOM_STEP))}>+</button>
      </div>
      <div className="pdf-preview-nav">
        <button type="button" aria-label="이전 쪽" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <span>
          {total ? page : "-"} / {total || "-"}
        </span>
        <button type="button" aria-label="다음 쪽" disabled={!total || page >= total} onClick={() => setPage((value) => value + 1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function FallbackViewer({ blob, title }: { blob: Blob; title: string }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <iframe className="pdf-preview-fallback" src={url} title={title} />;
}
