import { Cpu, Loader2 } from 'lucide-react';

import type { ConfigSectionProps, Scope } from './types';

export function StepConfig(props: ConfigSectionProps) {
  return (
    <section className="workflow-panel">
      <div className="panel-kicker">02 / Настройка</div>
      <h1>Уточните задачу перед разбором</h1>
      <p className="lead">Укажите страницы, затем отдельно задайте широкие правила извлечения и узкий фокус для следующего расчета. Если ничего не сохранять вручную, эти поля всё равно будут применены при запуске разбора.</p>

      <div className="config-grid">
        <label className="field config-scope-field">
          <span>Что искать</span>
          <select value={props.scope} onChange={(event) => props.onUpdateScope(event.target.value as Scope)}>
            {props.scopeOptions.map((item) => (
              <option key={item} value={item}>
                {props.scopeLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <div className="page-range-fields">
          <label className="field">
            <span>Страницы с</span>
            <input
              value={props.pageFrom}
              onChange={(event) => props.onPageFromChange(event.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="47"
              disabled={!props.canWork}
            />
          </label>
          <label className="field">
            <span>по</span>
            <input
              value={props.pageTo}
              onChange={(event) => props.onPageToChange(event.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="71"
              disabled={!props.canWork}
            />
          </label>
          <p className="field-note">Текущий диапазон: {props.pageRangeLabel}. Оставьте пустым для всего PDF.</p>
        </div>
      </div>

      <div className="mode-selector" aria-label="Режим разбора">
        {props.extractionModeOptions.map((option) => (
          <label
            key={option.mode}
            className={`mode-option ${props.extractionMode === option.mode ? 'active' : ''} ${!option.enabled ? 'disabled' : ''}`}
          >
            <input
              type="radio"
              name="extraction-mode"
              value={option.mode}
              checked={props.extractionMode === option.mode}
              disabled={!option.enabled || props.runningExtract}
              onChange={() => props.onExtractionModeChange(option.mode)}
            />
            <span>
              <strong>{option.title}</strong>
              <small>{option.text}</small>
            </span>
          </label>
        ))}
      </div>

      {props.scope === 'custom' ? (
        <label className="field custom-scope-field">
          <span>Своя область поиска</span>
          <input
            value={props.customScopeText}
            onChange={(event) => props.onCustomScopeTextChange(event.target.value)}
            placeholder="Например: только вводные панели и связанные аппараты"
            disabled={!props.canWork}
          />
          <p className="field-note">Это ограничивает область широкого извлечения по выбранным страницам.</p>
        </label>
      ) : null}

      <div className="agent-instructions">
        <label className="field">
          <span>Инструкции для извлечения</span>
          <textarea
            value={props.extractionInstructions}
            onChange={(event) => props.onExtractionInstructionsChange(event.target.value)}
            placeholder="Например: спецификация начинается со страницы 71. Собери все позиции по выбранным страницам и сохрани обозначение, наименование, количество и страницу источника. Не сужай результат до одной панели без явного требования."
            disabled={!props.canWork}
          />
          <p className="field-note">Эти инструкции управляют широким черновым извлечением по выбранным страницам.</p>
        </label>
        <label className="field">
          <span>Инструкции для анализа и расчета</span>
          <textarea
            value={props.analysisInstructions}
            onChange={(event) => props.onAnalysisInstructionsChange(event.target.value)}
            placeholder="Например: отдельно сфокусируйся на ВП1 5ВРУ, подбери комплектующие для шкафа и используй сборку х2 от стоимости оборудования."
            disabled={!props.canWork}
          />
          <p className="field-note">Эти инструкции не должны сокращать черновую спецификацию. Они нужны для следующего этапа: обработки, BOM и сметы.</p>
        </label>
        <div className="row">
          <button className="btn btn-secondary" onClick={props.onSaveInstructions} disabled={!props.canWork || props.savingInstructions}>
            {props.savingInstructions ? <Loader2 className="spin" size={16} /> : null}
            Сохранить в проект без запуска
          </button>
          <button className="btn btn-primary" onClick={props.onExtract} disabled={!props.canExtract || props.runningExtract}>
            {props.runningExtract ? <Loader2 className="spin" size={16} /> : <Cpu size={16} />}
            Запустить разбор
          </button>
        </div>
      </div>
    </section>
  );
}
