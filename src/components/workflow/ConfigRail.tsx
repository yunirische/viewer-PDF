import type { DetailRailProps } from './types';

export function ConfigRail(props: DetailRailProps) {
  return (
    <section>
      <div className="panel-title">Подготовка</div>
      <div className="detail-box">
        <p className="hint">
          Перед запуском укажите страницы, при необходимости сузьте область поиска и отдельно задайте узкий фокус для расчета.
        </p>
        <div className="grid-two">
          <div className="mini-stat">
            <span>Режим</span>
            <strong>{props.defaultModeLabel}</strong>
          </div>
          {props.selection?.selection_id ? (
            <div className="mini-stat">
              <span>Выборка</span>
              <strong>{props.selection.selection_id.slice(0, 8)}</strong>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
