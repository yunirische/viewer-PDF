import { ChevronLeft, ChevronRight, Download, FileText, Minus, Plus, Printer, XCircle } from 'lucide-react';

export function Toolbar(props: {
  fileName: string;
  pageCount: number;
  pageInput: string;
  zoomPercent: number;
  disabled?: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPageInputChange: (value: string) => void;
  onPageInputCommit: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomIn: () => void;
  onPrint: () => void;
  onDownload: () => void;
  onCloseOrNew: () => void;
}) {
  return (
    <div className="pdf-toolbar flex justify-between items-center px-4 py-2 bg-white border-b">
      <div className="pdf-toolbar__file">
        <FileText size={16} className="text-slate-400" />
        <strong className="max-w-[200px] truncate" title={props.fileName}>
          {props.fileName}
        </strong>
      </div>

      <div className="pdf-toolbar__center">
        <div className="pdf-toolbar-group">
          <button
            className="pdf-toolbar-button border-x-0 first:border-l last:border-r"
            onClick={props.onPrevPage}
            disabled={props.disabled || !props.canGoPrev}
            title="Предыдущая страница"
          >
            <ChevronLeft size={14} />
          </button>
          <label className="pdf-toolbar-page border-x-0 first:border-l last:border-r">
            <input
              value={props.pageInput}
              onBlur={props.onPageInputCommit}
              onChange={(event) => props.onPageInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur();
                }
              }}
              inputMode="numeric"
              pattern="[0-9]*"
              disabled={props.disabled}
            />
            <span>/ {props.pageCount || '?'}</span>
          </label>
          <button
            className="pdf-toolbar-button border-x-0 first:border-l last:border-r"
            onClick={props.onNextPage}
            disabled={props.disabled || !props.canGoNext}
            title="Следующая страница"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="pdf-toolbar-group">
          <button
            className="pdf-toolbar-button border-x-0 first:border-l last:border-r"
            onClick={props.onZoomOut}
            disabled={props.disabled}
            title="Уменьшить"
          >
            <Minus size={14} />
          </button>
          <button
            className="pdf-toolbar-button pdf-toolbar-button--wide border-x-0 first:border-l last:border-r"
            onClick={props.onZoomReset}
            disabled={props.disabled}
            title="Сбросить масштаб"
          >
            {props.zoomPercent}%
          </button>
          <button
            className="pdf-toolbar-button border-x-0 first:border-l last:border-r"
            onClick={props.onZoomIn}
            disabled={props.disabled}
            title="Увеличить"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div className="pdf-toolbar__actions">
        <button className="pdf-toolbar-button" onClick={props.onPrint} disabled={props.disabled} title="Печать">
          <Printer size={14} />
        </button>
        <button className="pdf-toolbar-button" onClick={props.onDownload} disabled={props.disabled} title="Скачать">
          <Download size={14} />
        </button>
        <button className="pdf-toolbar-button pdf-toolbar-button--accent" onClick={props.onCloseOrNew} title="Новый документ">
          <XCircle size={14} />
        </button>
      </div>
    </div>
  );
}
