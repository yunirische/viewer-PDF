import { ArrowRight, HelpCircle, Loader2 } from 'lucide-react';

import type { ClarificationSectionProps } from './types';
import {
  clarificationCandidateLabel,
  clarificationKindLabel,
  clarificationOptionLabel,
} from './utils';

export function StepClarification(props: ClarificationSectionProps) {
  const currentClarification = props.clarifications.find((item) => item.status === 'open') ?? null;
  const answeredClarifications = props.clarifications.filter((item) => item.status === 'answered');
  const pendingClarifications = props.clarifications.filter((item) => item.status !== 'applied');
  const currentClarificationIndex = currentClarification
    ? pendingClarifications.findIndex((item) => item.clarification_id === currentClarification.clarification_id) + 1
    : pendingClarifications.length;
  const sourceSnippet = (currentClarification?.source_snippets[0] || '').trim();

  return (
    <section className="workflow-panel">
      <div className="result-head">
        <div>
          <div className="panel-kicker">03 / Уточнение</div>
          <h1>Ответьте на спорные строки перед разбором</h1>
          <p className="lead">{props.processingMessage}</p>
        </div>
      </div>

      <div className="job-alert tone-warn">
        <div className="job-alert__head">
          <strong>Нужно уточнение</strong>
          <span className={`badge ${props.activeJobStatusTone}`}>{props.activeJobStatusLabel}</span>
        </div>
        <p>Этот этап нужен только когда агент не может безопасно решить, включать ли строку и как её трактовать.</p>
      </div>

      {currentClarification ? (
        <article className="detail-box">
          <div className="detail-box__head">
            <strong>Вопрос {currentClarificationIndex} из {pendingClarifications.length}</strong>
            <small>{clarificationKindLabel(currentClarification.kind)}</small>
          </div>
          <strong>{currentClarification.question}</strong>
          {sourceSnippet ? <p>{sourceSnippet}</p> : null}
          <div className="grid-two">
            <div className="mini-stat">
              <span>Страницы</span>
              <strong>{currentClarification.source_pages.length ? currentClarification.source_pages.join(', ') : '—'}</strong>
            </div>
            <div className="mini-stat">
              <span>Кандидат</span>
              <strong>{clarificationCandidateLabel(currentClarification) || '—'}</strong>
            </div>
          </div>
          <div className="row">
            {currentClarification.options.map((option) => (
              <button
                key={option.option_id}
                className={`btn btn-secondary ${currentClarification.selected_option === option.option_id ? 'active' : ''}`}
                onClick={() => props.onAnswerClarification(currentClarification.clarification_id, option.option_id)}
                disabled={props.answeringClarificationId === currentClarification.clarification_id}
              >
                {clarificationOptionLabel(option)}
              </button>
            ))}
          </div>
          {answeredClarifications.length ? (
            <small>Уже отвечено: {answeredClarifications.length}</small>
          ) : null}
        </article>
      ) : (
        <article className="detail-box">
          <div className="detail-box__head">
            <strong>Все уточнения сохранены</strong>
            <small>{props.openClarificationsCount ? `Осталось открытых: ${props.openClarificationsCount}` : 'Готово к применению'}</small>
          </div>
          <p>Примените ответы, после этого откроется обычная ручная проверка позиций.</p>
          <div className="row">
            <button
              className="btn btn-primary"
              onClick={props.onApplyClarifications}
              disabled={props.applyingClarifications}
            >
              {props.applyingClarifications ? <Loader2 className="spin" size={16} /> : <ArrowRight size={16} />}
              Применить уточнения
            </button>
          </div>
        </article>
      )}

      {!props.clarificationRequired ? (
        <div className="empty-state compact">
          <HelpCircle size={24} />
          <p>Для этого документа сейчас нет активных уточнений. Можно перейти к обычной ручной проверке.</p>
          <div className="row">
            <button className="btn btn-primary" onClick={props.onOpenAnalysis}>
              Перейти к обработке
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
