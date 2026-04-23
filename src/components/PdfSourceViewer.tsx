import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist/legacy/build/pdf.mjs';
import PdfJsWorker from '../pdfjs-worker?worker';
import { Toolbar } from './Toolbar';

GlobalWorkerOptions.workerPort = new PdfJsWorker();

export type SourceEvidence = {
  raw_id: string;
  page: number;
  bbox: [number, number, number, number] | null;
  raw_text: string;
  source_type: string;
  extractor: string;
};

type HighlightRect = {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  label: string;
};

type Props = {
  pdfUrl: string;
  fileName: string;
  page: number | null;
  sources: SourceEvidence[];
  onPageChange: (page: number) => void;
  onNewDocument: () => void;
};

export function PdfSourceViewer({ pdfUrl, fileName, page, sources, onPageChange, onNewDocument }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [pageInput, setPageInput] = useState('1');
  const [containerWidth, setContainerWidth] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pageWidth, setPageWidth] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);
  const [highlightRects, setHighlightRects] = useState<HighlightRect[]>([]);

  const requestedPage = page ?? 1;
  const selectedPage = pageCount ? Math.min(pageCount, Math.max(1, requestedPage)) : Math.max(1, requestedPage);

  const pageSources = useMemo(
    () => sources.filter((source) => source.page === selectedPage),
    [sources, selectedPage],
  );

  useEffect(() => {
    let cancelled = false;
    renderTaskRef.current?.cancel();
    renderTaskRef.current = null;
    setLoading(true);
    setError('');
    setDoc(null);
    if (!pdfUrl) {
      setLoading(false);
      return;
    }

    getDocument(pdfUrl)
      .promise.then((loaded) => {
        if (cancelled) {
          loaded.destroy();
          return;
        }
        setDoc(loaded);
        setPageCount(loaded.numPages);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, [pdfUrl]);

  useEffect(() => {
    setPageInput(String(selectedPage));
    if (pageCount && requestedPage !== selectedPage) {
      onPageChange(selectedPage);
    }
  }, [onPageChange, pageCount, requestedPage, selectedPage]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const element = containerRef.current;
    const update = () => setContainerWidth(element.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!doc || !selectedPage || containerWidth <= 0) {
      return;
    }

    const render = async () => {
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;

      const pdfPage = await doc.getPage(selectedPage);
      if (cancelled) return;

      const baseViewport = pdfPage.getViewport({ scale: 1 });
      const fitScale = Math.max(0.75, (containerWidth - 24) / baseViewport.width);
      const scale = fitScale * zoomLevel;
      const viewport = pdfPage.getViewport({ scale });

      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      if (!context) return;
      setError('');

      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

      const renderTask = pdfPage.render({
        canvas,
        canvasContext: context,
        viewport,
      });
      renderTaskRef.current = renderTask;

      try {
        await renderTask.promise;
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'RenderingCancelledException') {
          return;
        }
        throw err;
      } finally {
        if (renderTaskRef.current === renderTask) {
          renderTaskRef.current = null;
        }
      }

      if (cancelled) {
        return;
      }

      setPageWidth(viewport.width);
      setPageHeight(viewport.height);

      const rects: HighlightRect[] = [];
      for (const source of pageSources) {
        if (!source.bbox) continue;
        const [x0, y0, x1, y1] = source.bbox;
        const [leftX, topY, rightX, bottomY] = viewport.convertToViewportRectangle([x0, y0, x1, y1]);
        const left = Math.min(leftX, rightX);
        const top = Math.min(topY, bottomY);
        const width = Math.abs(rightX - leftX);
        const height = Math.abs(bottomY - topY);
        rects.push({
          id: source.raw_id,
          left,
          top,
          width,
          height,
          label: source.extractor,
        });
      }
      setHighlightRects(rects);
    };

    render().catch((err: unknown) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, [doc, selectedPage, containerWidth, pageSources, zoomLevel]);

  const goToPage = (delta: number) => {
    if (!pageCount) return;
    const next = Math.min(pageCount, Math.max(1, selectedPage + delta));
    onPageChange(next);
  };

  const commitPageInput = () => {
    if (!pageCount) {
      setPageInput(String(selectedPage));
      return;
    }
    const next = Number(pageInput);
    if (!Number.isInteger(next) || next < 1) {
      setPageInput(String(selectedPage));
      return;
    }
    onPageChange(Math.min(pageCount, next));
  };

  const updateZoom = (nextZoom: number) => {
    setZoomLevel(Math.min(2.5, Math.max(0.5, Number(nextZoom.toFixed(2)))));
  };

  const handlePrint = () => {
    const printWindow = window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    printWindow?.addEventListener('load', () => printWindow.print(), { once: true });
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = fileName || 'document.pdf';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="pdf-viewer-shell">
      <Toolbar
        fileName={fileName}
        pageCount={pageCount}
        pageInput={pageInput}
        zoomPercent={Math.round(zoomLevel * 100)}
        disabled={!pageCount}
        canGoPrev={selectedPage > 1}
        canGoNext={selectedPage < pageCount}
        onPageInputChange={setPageInput}
        onPageInputCommit={commitPageInput}
        onPrevPage={() => goToPage(-1)}
        onNextPage={() => goToPage(1)}
        onZoomOut={() => updateZoom(zoomLevel - 0.1)}
        onZoomReset={() => updateZoom(1)}
        onZoomIn={() => updateZoom(zoomLevel + 0.1)}
        onPrint={handlePrint}
        onDownload={handleDownload}
        onCloseOrNew={onNewDocument}
      />

      <div ref={containerRef} className="pdf-viewer-frame">
        {loading ? <div className="pdf-state">Loading PDF...</div> : null}
        {error ? <div className="pdf-state error">{error}</div> : null}
        {!loading && !error && doc ? (
          <div className="bg-slate-100 p-8 min-h-full flex justify-center">
            <motion.div
              className="pdf-stage"
              style={{ width: `${pageWidth}px`, height: `${pageHeight}px` }}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              key={`${pdfUrl}:${selectedPage}:${zoomLevel}`}
            >
              <canvas
                ref={canvasRef}
                className="pdf-canvas shadow-[0_0_50px_-12px_rgba(0,0,0,0.25)] border border-white/50 rounded-sm"
              />
              <div className="pdf-overlay">
                {highlightRects.map((rect) => (
                  <div
                    key={rect.id}
                    className="pdf-highlight"
                    style={{
                      left: `${rect.left}px`,
                      top: `${rect.top}px`,
                      width: `${rect.width}px`,
                      height: `${rect.height}px`,
                    }}
                    title={rect.label}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
