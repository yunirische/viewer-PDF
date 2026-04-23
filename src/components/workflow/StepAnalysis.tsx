import { BookOpenText, CheckCheck, Loader2, Plus, Search } from 'lucide-react';

import type { AnalysisSectionProps, ReviewFilter } from './types';
import {
  badgeForType,
  buildReviewFilterItems,
  clarificationCandidateLabel,
  clarificationKindLabel,
  clarificationOptionLabel,
  percent,
  reviewStatusBadge,
  reviewStatusLabel,
} from './utils';

export function StepAnalysis(props: AnalysisSectionProps) {
  const filterItems = buildReviewFilterItems(props);
  const currentClarification = props.clarifications.find((item) => item.status === 'open') ?? null;
  const answeredClarifications = props.clarifications.filter((item) => item.status === 'answered');
  const totalClarifications = props.clarifications.filter((item) => item.status !== 'applied').length;
  const currentClarificationIndex = currentClarification
    ? props.clarifications.findIndex((item) => item.clarification_id === currentClarification.clarification_id) + 1
    : totalClarifications;
  const sourceSnippet = (currentClarification?.source_snippets[0] || '').trim();
  const compactSourceSnippet = sourceSnippet.length > 220 ? `${sourceSnippet.slice(0, 217)}...` : sourceSnippet;

  return (
    <section className="workflow-panel">
      <div className="result-head">
        <div>
          <div className="panel-kicker">03 / Обработка</div>
          <h1>{props.runningExtract ? 'Идет инженерный разбор' : 'Проверьте и подтвердите позиции'}</h1>
          <p className="lead">{props.processingMessage}</p>
        </div>
      </div>

      {props.runningExtract ? (
        <div className="analysis-box">
          <Loader2 className="spin" size={28} />
          <div>
            <h1>Идет инженерный разбор</h1>
            <p>{props.processingMessage}</p>
            <div className="progress-bar"><span style={{ width: `${props.extractionProgress}%` }} /></div>
            <small>Задача выполняется в фоне. Можно дождаться статуса без длинного HTTP-запроса.</small>
          </div>
        </div>
      ) : null}

      {!props.runningExtract && props.extractionIssue ? (
        <div className={`job-alert ${props.extractionIssue.tone}`}>
          <div className="job-alert__head">
            <strong>{props.extractionIssue.title}</strong>
            <span className={`badge ${props.activeJobStatusTone}`}>{props.activeJobStatusLabel}</span>
          </div>
          <p>{props.extractionIssue.detail}</p>
          <small>{props.extractionIssue.action}</small>
        </div>
      ) : null}

      {!props.runningExtract && props.clarificationRequired ? (
        <div className="job-alert tone-warn">
          <div className="job-alert__head">
            <strong>Нужно уточнение перед ручной проверкой</strong>
            <span className={`badge ${props.activeJobStatusTone}`}>{props.activeJobStatusLabel}</span>
          </div>
          {currentClarification ? (
            <>
              <p>Сейчас нужен один короткий ответ. После этого откроется следующий вопрос или станет доступно применение уточнений.</p>
              <article className="detail-box">
                <small>Вопрос {currentClarificationIndex} из {totalClarifications}</small>
                <small>{clarificationKindLabel(currentClarification.kind)}</small>
                <strong>{currentClarification.question}</strong>
                {compactSourceSnippet ? <p>{compactSourceSnippet}</p> : null}
                <small>Страницы: {currentClarification.source_pages.length ? currentClarification.source_pages.join(', ') : '—'}</small>
                {clarificationCandidateLabel(currentClarification) ? (
                  <small>Кандидат: {clarificationCandidateLabel(currentClarification)}</small>
                ) : null}
                <div className="row">
                  {currentClarification.options.map((option) => (
                    <button
                      key={option.option_id}
                      className={`btn btn-secondary btn-small ${currentClarification.selected_option === option.option_id ? 'active' : ''}`}
                      onClick={() => props.onAnswerClarification(currentClarification.clarification_id, option.option_id)}
                      disabled={props.answeringClarificationId === currentClarification.clarification_id}
                    >
                      {clarificationOptionLabel(option)}
                    </button>
                  ))}
                </div>
                {answeredClarifications.length ? (
                  <small>Уже сохранено ответов: {answeredClarifications.length}</small>
                ) : null}
              </article>
            </>
          ) : (
            <>
              <p>Все уточняющие вопросы уже отвечены. Теперь можно применить ответы и перейти к обычной ручной проверке позиций.</p>
              <div className="row">
                <button
                  className="btn btn-primary"
                  onClick={props.onApplyClarifications}
                  disabled={props.applyingClarifications}
                >
                  {props.applyingClarifications ? <Loader2 className="spin" size={16} /> : null}
                  Применить уточнения
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {!props.clarificationRequired ? (
        <div className="analysis-summary-row">
          <article className="analysis-summary-card">
            <span>Позиции</span>
            <strong>{props.reviewEntities.length}</strong>
          </article>
          <article className="analysis-summary-card">
            <span>Черновик</span>
            <strong>{props.draftCount}</strong>
          </article>
          <article className="analysis-summary-card">
            <span>Проверено</span>
            <strong>{props.reviewedCount}</strong>
          </article>
          <article className="analysis-summary-card">
            <span>Отклонено</span>
            <strong>{props.rejectedCount}</strong>
          </article>
        </div>
      ) : null}

      {!props.runningExtract && !props.clarificationRequired ? (
        <>
          <div className="row">
            <button className="btn btn-secondary" onClick={() => props.onOpenNextEntity(props.nextDraftEntity)} disabled={!props.nextDraftEntity}>
              Следующий черновик
            </button>
            <button className="btn btn-secondary" onClick={props.onApproveVisible} disabled={props.approvingVisible || !props.visibleEntities.length}>
              {props.approvingVisible ? <Loader2 className="spin" size={16} /> : <CheckCheck size={16} />}
              Подтвердить видимые
            </button>
            {props.canOpenResult ? (
              <button className="btn btn-primary" onClick={props.onOpenResult}>
                Перейти к результату
              </button>
            ) : null}
          </div>

          <label className="field search-field">
            <span>Фильтр позиций</span>
            <div className="input-with-icon">
              <Search size={16} />
              <input
                value={props.quickQuery}
                onChange={(event) => props.onQuickQueryChange(event.target.value)}
                placeholder="QF, кабель, щит, автомат..."
              />
            </div>
          </label>

          <div className="review-toolbar">
            <div className="review-filter-group" aria-label="Фильтр по статусу проверки">
              {filterItems.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`review-filter-chip ${props.reviewFilter === item.value ? 'active' : ''}`}
                  onClick={() => props.onReviewFilterChange(item.value as ReviewFilter)}
                >
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </button>
              ))}
            </div>
            <div className="review-toolbar__meta">
              <span>Показано</span>
              <strong>{props.visibleEntities.length}</strong>
            </div>
          </div>

          <details className="detail-box detail-box--collapsible">
            <summary className="detail-box__summary">
              <strong>Добавить строку вручную</strong>
            </summary>
            <div className="grid-two">
              <label className="field">
                <span>Тип</span>
                <select
                  value={props.manualEntityForm.entity_type}
                  onChange={(event) => props.onManualEntityFieldChange('entity_type', event.target.value)}
                >
                  <option value="load">load</option>
                  <option value="circuit_breaker">circuit_breaker</option>
                  <option value="cable">cable</option>
                  <option value="socket">socket</option>
                  <option value="switch">switch</option>
                  <option value="contactor">contactor</option>
                  <option value="relay">relay</option>
                  <option value="meter">meter</option>
                  <option value="transformer">transformer</option>
                  <option value="panel">panel</option>
                </select>
              </label>
              <label className="field">
                <span>Кол-во</span>
                <input
                  value={props.manualEntityForm.qty}
                  onChange={(event) => props.onManualEntityFieldChange('qty', event.target.value)}
                  inputMode="numeric"
                />
              </label>
              <label className="field">
                <span>Обозначение</span>
                <input
                  value={props.manualEntityForm.designation}
                  onChange={(event) => props.onManualEntityFieldChange('designation', event.target.value)}
                  placeholder="QF1"
                />
              </label>
              <label className="field">
                <span>Название</span>
                <input
                  value={props.manualEntityForm.name}
                  onChange={(event) => props.onManualEntityFieldChange('name', event.target.value)}
                  placeholder="Ручная позиция"
                />
              </label>
            </div>
            <div className="row">
              <button className="btn btn-secondary" onClick={props.onCreateEntity} disabled={props.creatingEntity}>
                {props.creatingEntity ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}
                Добавить строку
              </button>
            </div>
          </details>

          {!props.clarificationRequired && !props.reviewEntities.length ? (
            <div className="empty-state compact">
              <BookOpenText size={24} />
              <h3>Для выбранного PDF ещё нет контекста проверки</h3>
              <p>Запустите разбор для этого документа. В `Обработка` показываются только актуальные project-level артефакты, относящиеся к выбранному PDF; исторические результаты других документов здесь больше не подставляются.</p>
            </div>
          ) : !props.clarificationRequired && props.draftCount === 0 ? (
            <div className="job-alert tone-success">
              <div className="job-alert__head">
                <strong>Все позиции обработаны</strong>
                <span className="badge tone-success">Готово</span>
              </div>
              <p>Черновиков больше нет. Можно переходить к итоговому списку и расчету.</p>
              <div className="row">
                <button className="btn btn-primary" onClick={props.onOpenResult}>
                  Открыть результат
                </button>
              </div>
            </div>
          ) : !props.clarificationRequired ? (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Тип</th>
                    <th>Обозначение</th>
                    <th>Название</th>
                    <th>Кол-во</th>
                    <th>Статус</th>
                    <th>Стр.</th>
                    <th>Conf.</th>
                  </tr>
                </thead>
                <tbody>
                  {props.visibleEntities.map((entity) => (
                    <tr
                      key={entity.entity_id}
                      className={props.selectedEntity?.entity_id === entity.entity_id ? 'selected' : ''}
                      onClick={() => props.onOpenEntity(entity)}
                    >
                      <td><span className={badgeForType(entity.entity_type)}>{entity.entity_type}</span></td>
                      <td className="mono strong">{entity.designation || entity.entity_id}</td>
                      <td>{entity.name || 'Без названия'}</td>
                      <td className="mono">{entity.qty}</td>
                      <td><span className={reviewStatusBadge(entity.review_status)}>{reviewStatusLabel(entity.review_status)}</span></td>
                      <td className="mono">{entity.sources[0]?.page ?? '—'}</td>
                      <td className="mono">{percent(entity.confidence)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
