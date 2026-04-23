import { FolderOpen, Loader2, Plus, RefreshCw, Upload } from 'lucide-react';

import type { UploadSectionProps } from './types';
import { formatFileSize } from './utils';

export function StepUpload(props: UploadSectionProps) {
  return (
    <section className="workflow-panel centered-panel">
      <div className="panel-kicker">01 / Загрузка</div>
      <h1>Создайте проект и добавьте PDF</h1>
      <p className="lead">Начните с проекта, затем загрузите файл или прикрепите PDF из FileBrowser inbox.</p>

      <div className="setup-grid">
        <label className="field">
          <span>Новый проект</span>
          <input
            value={props.newProjectName}
            onChange={(event) => props.onProjectNameChange(event.target.value)}
            placeholder="Например: Общежитие, 5ВРУ"
          />
        </label>
        <button className="btn btn-primary" onClick={props.onCreateProject} disabled={props.creatingProject || !props.newProjectName.trim()}>
          {props.creatingProject ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}
          Создать проект
        </button>
      </div>

      <div className="upload-drop">
        <Upload size={30} />
        <strong>PDF с проектной документацией</strong>
        <span>Выберите файл на компьютере или используйте inbox ниже.</span>
        <input ref={props.fileRef} type="file" accept="application/pdf" disabled={!props.canWork} />
        <button className="btn btn-primary" onClick={props.onUpload} disabled={!props.canWork || props.uploading}>
          {props.uploading ? <Loader2 className="spin" size={16} /> : <Upload size={16} />}
          Загрузить PDF
        </button>
      </div>

      <div className="inbox-import">
        <label className="field">
          <span>FileBrowser inbox</span>
          <select
            value={props.selectedInboxPath}
            onChange={(event) => props.onInboxPathChange(event.target.value)}
            disabled={props.loadingInbox || !props.inboxFiles.length}
          >
            {props.inboxFiles.length ? (
              props.inboxFiles.map((file) => (
                <option key={file.path} value={file.path}>
                  {file.filename} · {formatFileSize(file.size)}
                </option>
              ))
            ) : (
              <option value="">PDF в inbox не найден</option>
            )}
          </select>
        </label>
        <button className="btn btn-secondary" onClick={props.onRefreshInbox} disabled={props.loadingInbox}>
          {props.loadingInbox ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
          Обновить
        </button>
        <button
          className="btn btn-secondary"
          onClick={props.onImportInbox}
          disabled={!props.canWork || !props.selectedInboxPath || props.importingInbox}
        >
          {props.importingInbox ? <Loader2 className="spin" size={16} /> : <FolderOpen size={16} />}
          Прикрепить
        </button>
        {props.inboxError ? <p className="field-note error">FileBrowser inbox недоступен: {props.inboxError}</p> : null}
      </div>
    </section>
  );
}
