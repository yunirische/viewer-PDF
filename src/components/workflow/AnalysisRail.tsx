import { ArrowLeft, CheckCheck, FileText, Loader2 } from 'lucide-react';

import type { DetailRailProps } from './types';
import { clarificationCandidateLabel, clarificationKindLabel, fmt } from './utils';

export function AnalysisRail(props: DetailRailProps) {
  const currentClarification = props.clarifications.find((item) => item.status === 'open') ?? null;

  if (!props.runningExtract && !props.clarificationRequired && !props.selectedEntity) {
    return null;
  }

  return (
    <>
      {props.runningExtract ? (
        <section>
          <div className="panel-title">Текущий запуск</div>
          <div className="detail-box">
            <div className="detail-box__head">
              <strong>{props.analysisModeLabel}</strong>
              <span className={`badge ${props.activeJobStatusTone}`}>{props.activeJobStatusLabel}</span>
            </div>
            <p className="hint">{props.processingMessage}</p>
          </div>
        </section>
      ) : null}

      {!props.runningExtract && props.clarificationRequired ? (
        <section>
          <div className="panel-title">Текущее уточнение</div>
          <div className="stack">
            <div className="detail-box">
              <div className="detail-box__head">
                <strong>Нужно уточнение</strong>
                <span className={`badge ${props.activeJobStatusTone}`}>{props.activeJobStatusLabel}</span>
              </div>
              <p className="hint">{props.processingMessage}</p>
              {props.openClarificationsCount ? (
                <small>Осталось вопросов: {props.openClarificationsCount}</small>
              ) : null}
            </div>

            {currentClarification ? (
              <div className="detail-box">
                <small>{clarificationKindLabel(currentClarification.kind)}</small>
                <strong>{currentClarification.question}</strong>
                <p className="hint">{currentClarification.source_snippets[0] || 'Источник не указан.'}</p>
                {clarificationCandidateLabel(currentClarification) ? (
                  <small>Кандидат: {clarificationCandidateLabel(currentClarification)}</small>
                ) : null}
                <div className="row">
                  {currentClarification.source_pages.slice(0, 4).map((page) => (
                    <button
                      key={`${currentClarification.clarification_id}-${page}`}
                      className="btn btn-secondary btn-small"
                      onClick={() => props.onRememberViewerPage(page)}
                    >
                      Стр. {page}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="detail-box">
                <strong>Все ответы сохранены</strong>
                <p className="hint">Теперь можно применить уточнения в основном рабочем блоке и перейти к обычной проверке позиций.</p>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {!props.runningExtract && !props.clarificationRequired ? (
        <section>
          <div className="panel-title">Детали позиции</div>
          {props.selectedEntity ? (
            <div className="stack">
              <div>
                <div className="detail-box__head">
                  <h3>{props.selectedEntity.name || props.selectedEntity.designation || 'Выбранная позиция'}</h3>
                  <button className="btn btn-secondary btn-small" onClick={props.onCloseEntity}>
                    <ArrowLeft size={14} />
                    К списку
                  </button>
                </div>
                <p className="muted mono">#{props.selectedEntity.designation || props.selectedEntity.entity_id}</p>
              </div>
              <div className="grid-two">
                <label className="field">
                  <span>Тип</span>
                  <input value={props.entityForm.entity_type} disabled />
                </label>
                <label className="field">
                  <span>Статус</span>
                  <select
                    value={props.entityForm.review_status}
                    onChange={(event) => props.onEntityFormFieldChange('review_status', event.target.value)}
                  >
                    <option value="draft">Черновик</option>
                    <option value="reviewed">Проверено</option>
                    <option value="rejected">Отклонено</option>
                  </select>
                </label>
                <label className="field">
                  <span>Обозначение</span>
                  <input
                    value={props.entityForm.designation}
                    onChange={(event) => props.onEntityFormFieldChange('designation', event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Кол-во</span>
                  <input
                    value={props.entityForm.qty}
                    onChange={(event) => props.onEntityFormFieldChange('qty', event.target.value)}
                    inputMode="numeric"
                  />
                </label>
                <label className="field" style={{ gridColumn: '1 / -1' }}>
                  <span>Название</span>
                  <input
                    value={props.entityForm.name}
                    onChange={(event) => props.onEntityFormFieldChange('name', event.target.value)}
                  />
                </label>
              </div>
              <div className="row">
                <button className="btn btn-primary" onClick={props.onSaveEntity} disabled={props.savingEntity}>
                  {props.savingEntity ? <Loader2 className="spin" size={16} /> : <CheckCheck size={16} />}
                  Сохранить
                </button>
                <button className="btn btn-secondary" onClick={() => props.onSetEntityReviewStatus('reviewed')} disabled={props.savingEntity}>
                  Проверено
                </button>
                <button className="btn btn-secondary" onClick={() => props.onSetEntityReviewStatus('draft')} disabled={props.savingEntity}>
                  Вернуть в черновик
                </button>
                <button className="btn btn-secondary" onClick={() => props.onSetEntityReviewStatus('rejected')} disabled={props.savingEntity}>
                  Отклонить
                </button>
                <button className="btn btn-secondary" onClick={() => props.onOpenNextEntity(props.nextDraftEntity)} disabled={!props.nextDraftEntity || props.savingEntity}>
                  Следующий черновик
                </button>
              </div>
              <div className="param-list">
                {Object.entries(props.selectedEntity.params).slice(0, 6).map(([key, value]) => (
                  <div key={key} className="param-row">
                    <span>{key}</span>
                    <strong>{fmt(value)}</strong>
                  </div>
                ))}
              </div>
              <div className="detail-box">
                <div className="detail-box__head">
                  <strong>Источник</strong>
                  <span className="badge badge-gray">{props.selectedEntity.sources.length}</span>
                </div>
                <p className="hint">{props.selectedEntity.sources[0]?.raw_text || 'Нет исходного текста.'}</p>
                <div className="row">
                  {props.selectedEntity.sources.slice(0, 4).map((source) => (
                    <button
                      key={source.raw_id}
                      className="btn btn-secondary btn-small"
                      onClick={() => props.onRememberViewerPage(source.page)}
                    >
                      Стр. {source.page}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state compact">
              <FileText size={24} />
              <p>Выберите позицию для проверки и исправления.</p>
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
