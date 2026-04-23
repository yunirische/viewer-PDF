import type { DetailRailProps } from './types';

export function ResultRail(props: DetailRailProps) {
  return (
    <section>
      <div className="panel-title">Сводка расчета</div>
      <div className="grid-two">
        <div className="mini-stat">
          <span>Состав</span>
          <strong>{props.bom?.total_items ?? 0}</strong>
        </div>
        <div className="mini-stat">
          <span>Оборудование</span>
          <strong>{props.equipmentTotal ?? '—'}</strong>
        </div>
        <div className="mini-stat">
          <span>Итого</span>
          <strong>{props.totalCost ?? '—'}</strong>
        </div>
        <div className="mini-stat">
          <span>Экспорт</span>
          <strong>{props.bom ? 'Готов' : 'Позже'}</strong>
        </div>
      </div>
      <p className="hint">Итоговый список и расчет уже не требуют просмотра PDF. Здесь достаточно проверить состав, цены и выгрузку.</p>
    </section>
  );
}
