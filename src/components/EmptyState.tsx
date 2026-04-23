import { useId, useState } from 'react';
import { UploadCloud } from 'lucide-react';

export function EmptyState(props: {
  disabled?: boolean;
  uploading?: boolean;
  onFileSelected: (file: File) => void;
}) {
  const inputId = useId();
  const [dragActive, setDragActive] = useState(false);

  return (
    <div
      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-12 bg-slate-50/50 text-center ${
        dragActive ? 'border-blue-500' : 'border-slate-300'
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!props.disabled && !props.uploading) {
          setDragActive(true);
        }
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragActive(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragActive(false);
        if (props.disabled || props.uploading) return;
        const file = event.dataTransfer.files?.[0];
        if (!file || file.type !== 'application/pdf') return;
        props.onFileSelected(file);
      }}
    >
      <UploadCloud size={48} className="text-slate-400" />
      <h2 className="mt-4 text-xl font-semibold text-slate-900">Загрузите документ</h2>
      <p className="mt-2 text-sm text-slate-600">Перетащите PDF сюда или нажмите для выбора</p>
      <input
        id={inputId}
        type="file"
        accept="application/pdf"
        className="hidden"
        disabled={props.disabled || props.uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setDragActive(false);
          props.onFileSelected(file);
          event.target.value = '';
        }}
      />
      <label
        htmlFor={inputId}
        className={`mt-6 inline-flex cursor-pointer items-center rounded-xl px-5 py-3 text-sm font-medium transition ${
          props.disabled || props.uploading
            ? 'pointer-events-none bg-slate-200 text-slate-500'
            : 'bg-slate-900 text-white hover:bg-slate-800'
        }`}
      >
        {props.uploading ? 'Загрузка...' : 'Выбрать PDF'}
      </label>
    </div>
  );
}
