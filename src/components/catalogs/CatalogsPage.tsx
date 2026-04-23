import type { RefObject } from 'react';
import { Eye, FileSpreadsheet, Loader2, RefreshCw, Upload } from 'lucide-react';

import type {
  FileBrowserPriceFile,
  SupplierCatalog,
  SupplierCatalogImportPreview,
  SupplierCatalogSummary,
} from '../../types';

type CatalogsPageProps = {
  activeProjectName: string;
  hasActiveProject: boolean;
  catalogs: SupplierCatalogSummary[];
  loadingCatalogs: boolean;
  selectedCatalog: SupplierCatalog | null;
  selectedCatalogId: string;
  loadingCatalogDetail: boolean;
  importMode: boolean;
  importSupplierName: string;
  importReference: string;
  importPriority: string;
  importNotes: string;
  priceFiles: FileBrowserPriceFile[];
  selectedPriceFilePath: string;
  loadingPriceFiles: boolean;
  priceFilesError: string;
  importPreview: SupplierCatalogImportPreview | null;
  importMapping: Record<string, string>;
  previewingImport: boolean;
  committingImport: boolean;
  onRefresh: () => void;
  onOpenCatalog: (catalogId: string) => void;
  onStartImport: () => void;
  onCancelImport: () => void;
  onImportSupplierNameChange: (value: string) => void;
  onImportReferenceChange: (value: string) => void;
  onImportPriorityChange: (value: string) => void;
  onImportNotesChange: (value: string) => void;
  onRefreshPriceFiles: () => void;
  onImportPriceFilePathChange: (value: string) => void;
  onImportLocalFileSelected: () => void;
  onPreviewImport: () => void;
  onCommitImport: () => void;
  onImportMappingChange: (field: string, value: string) => void;
  importFileRef: RefObject<HTMLInputElement | null>;
};

const mappingLabels: Record<string, string> = {
  supplier_sku: 'Артикул поставщика',
  manufacturer: 'Бренд / производитель',
  manufacturer_sku: 'Артикул производителя',
  name_raw: 'Наименование',
  unit_price: 'Цена',
  currency: 'Валюта',
  unit: 'Единица',
  min_qty: 'Мин. партия',
  category: 'Категория',
  source_url: 'Ссылка',
  in_stock: 'Наличие',
  valid_at: 'Дата цены',
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function CatalogsPage(props: CatalogsPageProps) {
  return (
    <main className="catalogs-shell">
      <section className="catalogs-sidebar">
        <div className="catalogs-sidebar__head">
          <div>
            <div className="panel-kicker">Каталоги</div>
            <h1>Прайсы поставщиков</h1>
            <p>Импортируйте и обновляйте ценовую базу отдельно от текущего PDF.</p>
          </div>
          <div className="row">
            <button className="btn btn-secondary" onClick={props.onRefresh} disabled={!props.hasActiveProject || props.loadingCatalogs}>
              <RefreshCw size={16} />
              Обновить
            </button>
            <button className="btn btn-primary" onClick={props.onStartImport} disabled={!props.hasActiveProject}>
              <Upload size={16} />
              Импортировать
            </button>
          </div>
        </div>

        <div className="detail-box">
          <div className="detail-box__head">
            <strong>Активный проект</strong>
            <span className="badge badge-gray">{props.catalogs.length}</span>
          </div>
          <p>{props.activeProjectName || 'Проект не выбран'}</p>
          <small>{props.hasActiveProject ? 'Каталоги привязаны к выбранному проекту.' : 'Сначала выберите проект.'}</small>
        </div>

        <div className="catalogs-list">
          {props.loadingCatalogs ? (
            <div className="empty-state compact">
              <Loader2 className="spin" size={20} />
              <p>Загружаем каталоги.</p>
            </div>
          ) : !props.catalogs.length ? (
            <div className="empty-state compact">
              <FileSpreadsheet size={24} />
              <p>Каталогов пока нет. Загрузите первый CSV/XLS/XLSX прайс поставщика.</p>
            </div>
          ) : (
            props.catalogs.map((catalog) => (
              <button
                key={catalog.catalog_id}
                type="button"
                className={`catalog-card ${props.selectedCatalogId === catalog.catalog_id ? 'active' : ''}`}
                onClick={() => props.onOpenCatalog(catalog.catalog_id)}
              >
                <div className="catalog-card__head">
                  <strong>{catalog.supplier_name}</strong>
                  <span>{catalog.item_count} строк</span>
                </div>
                <small>{catalog.reference || 'Источник не указан'}</small>
                <small>Цен: {catalog.price_count}</small>
                <small>Обновлён: {formatDate(catalog.updated_at)}</small>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="catalogs-main">
        {props.importMode ? (
          <section className="workflow-panel">
            <div className="result-head">
              <div>
                <div className="panel-kicker">Импорт</div>
                <h1>Загрузите каталог поставщика</h1>
                <p className="lead">Для MVP достаточно CSV/XLS/XLSX, где одна строка соответствует одной позиции прайса.</p>
              </div>
              <div className="row">
                <button className="btn btn-secondary" onClick={props.onCancelImport}>
                  Отмена
                </button>
              </div>
            </div>

            <div className="stack">
              <div className="grid-two">
                <label className="field">
                  <span>Поставщик</span>
                  <input value={props.importSupplierName} onChange={(event) => props.onImportSupplierNameChange(event.target.value)} placeholder="EKF" />
                </label>
                <label className="field">
                  <span>Файл / reference</span>
                  <input value={props.importReference} onChange={(event) => props.onImportReferenceChange(event.target.value)} placeholder="ekf-april.xlsx" />
                </label>
                <label className="field">
                  <span>Приоритет</span>
                  <input value={props.importPriority} onChange={(event) => props.onImportPriorityChange(event.target.value)} inputMode="numeric" />
                </label>
                <label className="field">
                  <span>Файл</span>
                  <input ref={props.importFileRef} type="file" accept=".csv,.xls,.xlsx,.xlsm" onChange={() => props.onImportLocalFileSelected()} />
                </label>
                <label className="field" style={{ gridColumn: '1 / -1' }}>
                  <span>Заметка</span>
                  <input value={props.importNotes} onChange={(event) => props.onImportNotesChange(event.target.value)} placeholder="Прайс апреля 2026" />
                </label>
              </div>

              <div className="inbox-import">
                <label className="field">
                  <span>FileBrowser / prices</span>
                  <select
                    value={props.selectedPriceFilePath}
                    onChange={(event) => props.onImportPriceFilePathChange(event.target.value)}
                    disabled={props.loadingPriceFiles || !props.priceFiles.length}
                  >
                    {props.priceFiles.length ? (
                      <>
                        <option value="">Не выбрано</option>
                        {props.priceFiles.map((file) => (
                          <option key={file.path} value={file.path}>
                            {file.path}{file.supported_for_catalog_import ? '' : ' (только reference)'}
                          </option>
                        ))}
                      </>
                    ) : (
                      <option value="">Файлов в prices не найдено</option>
                    )}
                  </select>
                </label>
                <button className="btn btn-secondary" onClick={props.onRefreshPriceFiles} disabled={props.loadingPriceFiles}>
                  <RefreshCw size={16} />
                  Обновить папку
                </button>
                <div className="field-note">
                  Выберите либо локальный CSV/XLS/XLSX, либо файл из FileBrowser. PDF в `prices/` пока не нормализуется в каталог.
                </div>
                {props.priceFilesError ? <p className="field-note error">Папка prices недоступна: {props.priceFilesError}</p> : null}
              </div>

              <div className="row">
                <button className="btn btn-secondary" onClick={props.onPreviewImport} disabled={props.previewingImport || props.committingImport}>
                  {props.previewingImport ? <Loader2 className="spin" size={16} /> : <Eye size={16} />}
                  Просмотр и mapping
                </button>
                <button className="btn btn-primary" onClick={props.onCommitImport} disabled={!props.importPreview || props.committingImport}>
                  {props.committingImport ? <Loader2 className="spin" size={16} /> : <Upload size={16} />}
                  Импортировать
                </button>
              </div>

              {props.importPreview ? (
                <>
                  <div className="analysis-summary-row">
                    <article className="analysis-summary-card">
                      <span>Колонки</span>
                      <strong>{props.importPreview.headers.length}</strong>
                    </article>
                    <article className="analysis-summary-card">
                      <span>Строки</span>
                      <strong>{props.importPreview.row_count}</strong>
                    </article>
                    <article className="analysis-summary-card">
                      <span>Готово к импорту</span>
                      <strong>{props.importPreview.import_ready_row_count}</strong>
                    </article>
                    <article className="analysis-summary-card">
                      <span>Будет пропущено</span>
                      <strong>{props.importPreview.skipped_row_count}</strong>
                    </article>
                    <article className="analysis-summary-card">
                      <span>Preview</span>
                      <strong>{props.importPreview.sample_rows.length}</strong>
                    </article>
                  </div>

                  <div className="grid-two">
                    {Object.entries(mappingLabels).map(([field, label]) => (
                      <label key={field} className="field">
                        <span>{label}</span>
                        <select
                          value={props.importMapping[field] ?? ''}
                          onChange={(event) => props.onImportMappingChange(field, event.target.value)}
                        >
                          <option value="">Не выбрано</option>
                          {props.importPreview.headers.map((header) => (
                            <option key={`${field}-${header}`} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>

                  <div className="data-table-wrap">
                    <table className="data-table data-table--result">
                      <thead>
                        <tr>
                          {props.importPreview.headers.map((header) => (
                            <th key={header}>{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {props.importPreview.sample_rows.map((row, index) => (
                          <tr key={`preview-${index}`}>
                            {props.importPreview.headers.map((header) => (
                              <td key={`${index}-${header}`}>{row[header] || '—'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>
          </section>
        ) : props.loadingCatalogDetail ? (
          <section className="workflow-panel">
            <div className="empty-state compact">
              <Loader2 className="spin" size={24} />
              <p>Загружаем каталог.</p>
            </div>
          </section>
        ) : props.selectedCatalog ? (
          <section className="workflow-panel">
            <div className="result-head">
              <div>
                <div className="panel-kicker">Каталог</div>
                <h1>{props.selectedCatalog.supplier_name}</h1>
                <p className="lead">{props.selectedCatalog.reference || 'Источник не указан'}</p>
              </div>
            </div>

            <div className="metric-row compact-metrics">
              <article className="metric-card">
                <span>Позиции</span>
                <strong>{props.selectedCatalog.items.length}</strong>
                <p>Нормализованные строки</p>
              </article>
              <article className="metric-card">
                <span>Цены</span>
                <strong>{props.selectedCatalog.prices.length}</strong>
                <p>Снимки стоимости</p>
              </article>
              <article className="metric-card">
                <span>Обновлён</span>
                <strong>{formatDate(props.selectedCatalog.updated_at)}</strong>
                <p>Последний импорт</p>
              </article>
            </div>

            <div className="data-table-wrap">
              <table className="data-table data-table--result">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Название</th>
                    <th>Бренд</th>
                    <th>Категория</th>
                    <th>Ед.</th>
                    <th>Цена</th>
                  </tr>
                </thead>
                <tbody>
                  {props.selectedCatalog.items.map((item) => {
                    const price = props.selectedCatalog?.prices.find((entry) => entry.item_id === item.item_id) ?? null;
                    return (
                      <tr key={item.item_id}>
                        <td className="mono">{item.supplier_sku || '—'}</td>
                        <td>{item.name_raw}</td>
                        <td>{item.manufacturer || '—'}</td>
                        <td>{item.category || '—'}</td>
                        <td>{item.unit || '—'}</td>
                        <td>{price ? `${price.unit_price} ${price.currency}` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="workflow-panel">
            <div className="empty-state compact">
              <FileSpreadsheet size={24} />
              <p>Выберите каталог слева или начните новый импорт.</p>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
