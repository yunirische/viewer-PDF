import { useEffect } from 'react';
import { ArrowDownToLine, CheckCheck, FileText, Loader2 } from 'lucide-react';

import type { ResultSectionProps } from './types';
import { badgeForType, reviewStatusBadge, reviewStatusLabel } from './utils';

export function StepResult(props: ResultSectionProps) {
  useEffect(() => {
    if (props.currentStep !== 'result') return;
    if (props.hasBom || props.buildingBom || !props.canBuildBom) return;
    props.onBuildBom();
  }, [props.buildingBom, props.canBuildBom, props.currentStep, props.hasBom, props.onBuildBom]);

  return (
    <section className="workflow-panel">
      <div className="result-head">
        <div>
          <div className="panel-kicker">04 / Результат</div>
          <h1>Итоговый список, смета и экспорт</h1>
          <p className="lead">Одинаковые подтвержденные позиции объединяются в одну строку. Неподтвержденные и отклоненные позиции сюда не попадают.</p>
        </div>
        <div className="row">
          <button className="btn btn-primary" onClick={props.onBuildEstimate} disabled={!props.canBuildEstimate || props.pricingEstimate}>
            {props.pricingEstimate ? <Loader2 className="spin" size={16} /> : <CheckCheck size={16} />}
            Рассчитать
          </button>
        </div>
      </div>

      <div className="metric-row compact-metrics">
        <article className="metric-card">
          <span>Исходные позиции</span>
          <strong>{props.reviewEntitiesCount}</strong>
          <p>После ручной проверки</p>
        </article>
        <article className="metric-card">
          <span>Строки в итоге</span>
          <strong>{props.bom?.total_items ?? 0}</strong>
          <p>После объединения дублей</p>
        </article>
        <article className="metric-card">
          <span>Оборудование</span>
          <strong>{props.equipmentTotal ?? '—'}</strong>
          <p>До сборки</p>
        </article>
        <article className="metric-card">
          <span>Итого</span>
          <strong>{props.totalCost ?? '—'}</strong>
          <p>С учетом сборки</p>
        </article>
      </div>

      <div className="stack">
        {!props.hasBom ? (
          <div className="empty-state compact">
            <FileText size={24} />
            <p>{props.buildingBom ? 'Собираем итоговый список из подтвержденных позиций.' : 'Итоговый список появится здесь автоматически после сборки.'}</p>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table data-table--result">
              <thead>
                <tr>
                  <th>Обозначение</th>
                  <th>Название</th>
                  <th>Тип</th>
                  <th>Кол-во</th>
                  <th>Статус</th>
                  <th>Источник цены</th>
                  <th>Цена</th>
                </tr>
              </thead>
              <tbody>
                {(props.bom?.items ?? []).map((item, index) => {
                  const overrideKey = item.designation || item.entity_ids[0] || item.name || `row-${index}`;
                  return (
                    <tr key={`${item.designation}-${item.name}-${index}`}>
                      <td>
                        <div className="stack stack-tight">
                          <span className="mono strong">{item.designation || '—'}</span>
                          {item.entity_ids.length > 1 ? <small>из {item.entity_ids.length} исходных позиций</small> : null}
                        </div>
                      </td>
                      <td>
                        <div className="stack stack-tight">
                          <span>{item.name || 'Без названия'}</span>
                          {item.entity_ids.length > 1 ? <small>объединённая строка</small> : null}
                        </div>
                      </td>
                      <td><span className={badgeForType(item.entity_type)}>{item.entity_type}</span></td>
                      <td className="mono">{item.qty}</td>
                      <td><span className={reviewStatusBadge(item.review_status)}>{reviewStatusLabel(item.review_status)}</span></td>
                      <td>
                        <div className="price-source-cell">
                          <strong>{item.price_source_name || 'Источник не найден'}</strong>
                          <small>{item.price_source_id || 'manual / none'}</small>
                        </div>
                      </td>
                      <td>
                        <div className="price-override-row">
                          <input
                            value={props.priceOverrides[overrideKey] ?? ''}
                            onChange={(event) => props.onPriceOverrideChange(overrideKey, event.target.value)}
                            inputMode="decimal"
                            placeholder={item.unit_price !== null && item.unit_price !== undefined ? String(item.unit_price) : 'Цена за единицу'}
                          />
                          <small>{item.unit_price !== null && item.unit_price !== undefined ? `из источника: ${item.unit_price}` : 'цена не найдена'}</small>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="detail-box result-controls-box">
          <div className="detail-box__head">
            <strong>Расчет</strong>
          </div>
          <div className="grid-two">
            <label className="field">
              <span>Коэффициент сборки</span>
              <input
                value={props.assemblyMultiplier}
                onChange={(event) => props.onAssemblyMultiplierChange(event.target.value)}
                inputMode="decimal"
                placeholder="2"
              />
            </label>
            <div className="mini-stat">
              <span>Каталоги</span>
              <strong>{props.priceSourcesCount}</strong>
            </div>
          </div>
          <div className="row">
            <div className="mini-stat result-mini-stat">
              <span>Ручные overrides</span>
              <strong>{props.activePriceOverrides}</strong>
            </div>
            <button className="btn btn-primary" onClick={props.onBuildEstimate} disabled={!props.canBuildEstimate || props.pricingEstimate}>
              {props.pricingEstimate ? <Loader2 className="spin" size={16} /> : <CheckCheck size={16} />}
              Пересчитать смету
            </button>
          </div>
          {props.estimateNotes.length ? (
            <div className="stack compact-notes">
              {props.estimateNotes.slice(0, 3).map((note, index) => (
                <p key={`${note}-${index}`} className="hint">{note}</p>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="download-row" id="export">
        <button className="btn btn-primary" onClick={() => props.onExport('xlsx')} disabled={!props.canExport}>
          <ArrowDownToLine size={16} />
          XLSX
        </button>
        <button className="btn btn-secondary" onClick={() => props.onExport('csv')} disabled={!props.canExport}>
          CSV
        </button>
        <button className="btn btn-secondary" onClick={() => props.onExport('json')} disabled={!props.canExport}>
          JSON
        </button>
      </div>
    </section>
  );
}
