import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Loader2 } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

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
  page: number | null;
  sources: SourceEvidence[];
  onPageChange: (page: number) => void;
};

export function PdfSourceViewer({ pdfUrl, page, sources, onPageChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [doc, setDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);
  const [highlightRects, setHighlightRects] = useState<HighlightRect[]>([]);

  const selectedPage = page ?? 1;
  const pageSources = useMemo(
    () => sources.filter((source) => source.page === selectedPage),
    [sources, selectedPage],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setDoc(null);

    if (!pdfUrl) {
      setLoading(false);
      return;
    }

    pdfjs.getDocument(pdfUrl)
      .promise.then((loaded) => {
        if (cancelled) {
          loaded.destroy();
          return;
        }
        setDoc(loaded);
        setPageCount(loaded.numPages);
      })
      .catch((err: any) => {
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
    };
  }, [pdfUrl]);

  useEffect(() => {
    if (!containerRef.current) return;
    const element = containerRef.current;
    
    const update = () => setContainerWidth(element.clientWidth);
    update();
    
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!doc || !selectedPage || containerWidth <= 0) return;

    const render = async () => {
      try {
        const pdfPage = await doc.getPage(selectedPage);
        const baseViewport = pdfPage.getViewport({ scale: 1 });
        const scale = (containerWidth - 48) / baseViewport.width;
        const viewport = pdfPage.getViewport({ scale });
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        await pdfPage.render({
          canvasContext: context,
          viewport,
        }).promise;

        if (cancelled) return;

        setPageHeight(viewport.height);
        
        const rects: HighlightRect[] = [];
        for (const source of pageSources) {
          if (!source.bbox) continue;
          const [x0, y0, x1, y1] = source.bbox;
          // Coordinates in PDF are [xMin, yMin, xMax, yMax] from bottom-left
          // viewport.convertToViewportRectangle converts them to viewport coordinates
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
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message);
        }
      }
    };

    render();
    return () => {
      cancelled = true;
    };
  }, [doc, selectedPage, containerWidth, pageSources]);

  const goToPage = (delta: number) => {
    if (!pageCount) return;
    const next = Math.min(pageCount, Math.max(1, selectedPage + delta));
    onPageChange(next);
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#525659] overflow-hidden">
      <div className="h-12 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-4 shrink-0 shadow-sm z-10 transition-colors">
        <div className="flex items-center gap-2">
          <button 
            className="p-1 hover:bg-[#F1F5F9] rounded disabled:opacity-30" 
            onClick={() => goToPage(-1)} 
            disabled={selectedPage <= 1}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-[12px] font-bold text-[#64748B] w-20 text-center">
             {selectedPage} / {pageCount || '?'}
          </span>
          <button 
            className="p-1 hover:bg-[#F1F5F9] rounded disabled:opacity-30" 
            onClick={() => goToPage(1)} 
            disabled={selectedPage >= pageCount}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-[#EFF6FF] text-[#2563EB] px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
            {pageSources.length} попаданий
          </span>
          <button 
            className="p-1 hover:bg-[#F1F5F9] rounded" 
            onClick={() => onPageChange(1)}
            title="В начало"
          >
            <RotateCcw size={16} className="text-[#64748B]" />
          </button>
        </div>
      </div>
      
      <div ref={containerRef} className="flex-1 w-full overflow-auto p-4 md:p-8 flex flex-col items-center relative scrollbar-hide">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 backdrop-blur-sm z-20">
            <Loader2 className="animate-spin text-white mb-2" size={32} />
            <span className="text-white text-sm font-medium">Загрузка PDF...</span>
          </div>
        )}
        
        {error && (
          <div className="bg-rose-50 border border-rose-200 p-6 rounded-xl text-center max-w-sm mt-10">
            <p className="text-rose-600 text-sm font-bold mb-2">Ошибка PDF</p>
            <p className="text-rose-500 text-xs">{error}</p>
          </div>
        )}

        {!error && doc && (
          <div className="relative shadow-[0_8px_30px_rgb(0,0,0,0.5)] bg-white rounded-sm mb-10 overflow-hidden" style={{ height: pageHeight > 0 ? `${pageHeight}px` : 'auto' }}>
            <canvas ref={canvasRef} className="block" />
            <div className="absolute inset-0 pointer-events-none">
              {highlightRects.map((rect) => (
                <div
                  key={rect.id}
                  className="absolute border-2 border-yellow-400 bg-yellow-400/20 shadow-[0_0_8px_rgba(250,204,21,0.5)] transition-all cursor-help pointer-events-auto"
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
          </div>
        )}
      </div>
    </div>
  );
}
