import type { ClarificationItem, ClarificationOption, Entity } from '../../types';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function badgeForType(entityType: string): string {
  if (entityType.includes('panel')) return 'badge badge-blue';
  if (entityType.includes('cable')) return 'badge badge-teal';
  if (entityType.includes('relay') || entityType.includes('contactor')) return 'badge badge-violet';
  if (entityType.includes('load')) return 'badge badge-amber';
  return 'badge badge-gray';
}

export function percent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value * 100)}%`;
}

export function reviewStatusLabel(status: string | null | undefined): string {
  const labels: Record<string, string> = {
    draft: 'Черновик',
    reviewed: 'Проверено',
    rejected: 'Отклонено',
  };
  return labels[status || 'draft'] ?? (status || 'Черновик');
}

export function reviewStatusBadge(status: string | null | undefined): string {
  if (status === 'reviewed') return 'badge badge-green';
  if (status === 'rejected') return 'badge badge-red';
  return 'badge badge-amber';
}

export function fmt(value: unknown, fallback = '—'): string {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

export function buildReviewFilterItems(props: {
  reviewEntities: Entity[];
  draftCount: number;
  reviewedCount: number;
  rejectedCount: number;
}) {
  return [
    { value: 'all', label: 'Все', count: props.reviewEntities.length },
    { value: 'draft', label: 'Черновик', count: props.draftCount },
    { value: 'reviewed', label: 'Проверено', count: props.reviewedCount },
    { value: 'rejected', label: 'Отклонено', count: props.rejectedCount },
  ] as const;
}

export function clarificationKindLabel(kind: string | null | undefined): string {
  const labels: Record<string, string> = {
    include_row: 'Включение строки',
    entity_type: 'Тип позиции',
    parent_group: 'Привязка к группе',
    quantity: 'Количество',
    normalize_label: 'Название и обозначение',
  };
  return labels[kind || ''] ?? 'Уточнение';
}

export function clarificationOptionLabel(option: ClarificationOption): string {
  const normalized = (option.value || option.option_id || '').trim().toLowerCase();
  const labels: Record<string, string> = {
    include: 'Включить',
    exclude: 'Не включать',
    panel: 'Панель',
    circuit_breaker: 'Выключатель',
    cable: 'Кабель',
    socket: 'Розетка',
    switch: 'Выключатель нагрузки',
    contactor: 'Контактор',
    relay: 'Реле',
    meter: 'Счётчик',
    transformer: 'Трансформатор',
    load: 'Нагрузка',
  };
  if (labels[normalized]) return labels[normalized];
  if (option.label?.trim()) return option.label.trim();
  if (/^\d+$/.test(normalized)) return normalized;
  return normalized || 'Выбрать';
}

export function clarificationCandidateLabel(item: ClarificationItem): string {
  const candidate = item.candidate_entity;
  if (!candidate) return '';
  const parts = [candidate.designation?.trim(), candidate.name?.trim()].filter(Boolean);
  if (!parts.length) return '';
  return parts.join(' ');
}
