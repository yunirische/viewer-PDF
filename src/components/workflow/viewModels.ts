import type { BOM, ClarificationItem, Entity, Estimate, Job } from '../../types';
import type {
  ClarificationSectionProps,
  AnalysisSectionProps,
  ConfigSectionProps,
  DetailRailProps,
  ResultSectionProps,
  ReviewFilter,
  UploadSectionProps,
  WorkflowStep,
  ExtractionIssue,
} from './types';

type WorkflowActionPaneViewModelArgs = {
  currentStep: WorkflowStep;
  upload: Omit<UploadSectionProps, 'currentStep'>;
  config: Omit<ConfigSectionProps, 'currentStep'>;
  clarification: Omit<ClarificationSectionProps, 'currentStep'>;
  analysis: Omit<AnalysisSectionProps, 'currentStep'>;
  result: Omit<ResultSectionProps, 'currentStep'>;
};

type WorkflowDetailRailViewModelArgs = Omit<DetailRailProps, 'currentStep'> & {
  currentStep: WorkflowStep;
};

export type WorkflowDerivedState = {
  selectedDocumentExtractJob: Job | null;
  activeOrLatestExtractJob: Job | null;
  latestProjectReviewJob: Job | null;
  hasSelectedDocumentReviewContext: boolean;
  reviewContextMismatch: boolean;
  clarificationRequired: boolean;
  clarifications: ClarificationItem[];
  openClarificationsCount: number;
  reviewEntities: Entity[];
  selectedEntity: Entity | null;
  canWork: boolean;
  canExtract: boolean;
  canBuildBom: boolean;
  canBuildEstimate: boolean;
  canExport: boolean;
  draftCount: number;
  reviewedCount: number;
  rejectedCount: number;
  visibleEntities: Entity[];
  nextDraftEntity: Entity | null;
  currentStep: WorkflowStep;
  extractionIssue: ExtractionIssue;
  processingMessage: string;
  extractionProgress: number;
  equipmentTotal: number | null;
  totalCost: number | null;
  bomPreviewItems: BOM['items'];
  hasBom: boolean;
  estimateNotes: string[];
  activePriceOverrides: number;
  priceSourcesCount: number;
};

export function deriveWorkflowState(args: {
  activeProjectId: string;
  selectedDocumentId: string;
  workflowStep: WorkflowStep;
  documents: Array<{ document_id: string }>;
  jobs: Job[];
  entities: Entity[];
  clarifications: ClarificationItem[];
  bom: BOM | null;
  estimate: Estimate | null;
  activeExtractionJob: Job | null;
  selectedEntityId: string;
  quickQuery: string;
  reviewFilter: ReviewFilter;
  runningExtract: boolean;
  buildingBom: boolean;
  pricingEstimate: boolean;
  priceOverrides: Record<string, string>;
  projectPriceSourcesCount: number;
  summarizeJobIssue: (job: Job | null | undefined) => ExtractionIssue;
  statusLabel: (status: string | null | undefined) => string;
}) : WorkflowDerivedState {
  const selectedDocument = args.documents.find((item) => item.document_id === args.selectedDocumentId) ?? null;
  const selectedDocumentExtractJob = args.selectedDocumentId
    ? args.jobs.find(
        (job) =>
          (job.mode === 'code' || job.mode === 'agent' || job.mode === 'combined') &&
          job.document_id === args.selectedDocumentId,
      ) ?? null
    : null;
  const latestProjectReviewJob = args.jobs.find(
    (job) =>
      (job.mode === 'code' || job.mode === 'agent' || job.mode === 'combined') &&
      ['done', 'succeeded', 'needs_review', 'needs_clarification'].includes(job.status),
  ) ?? null;
  const activeOrLatestExtractJob =
    args.activeExtractionJob?.document_id === args.selectedDocumentId
      ? args.activeExtractionJob
      : selectedDocumentExtractJob;
  const hasSelectedDocumentReviewContext = Boolean(
    args.selectedDocumentId &&
      latestProjectReviewJob &&
      latestProjectReviewJob.document_id === args.selectedDocumentId,
  );
  const reviewContextMismatch = Boolean(
    args.selectedDocumentId &&
      selectedDocumentExtractJob &&
      latestProjectReviewJob &&
      latestProjectReviewJob.document_id !== args.selectedDocumentId,
  );
  const clarifications = hasSelectedDocumentReviewContext ? args.clarifications : [];
  const openClarifications = clarifications.filter((item) => item.status === 'open');
  const clarificationRequired = Boolean(
    args.selectedDocumentId &&
      activeOrLatestExtractJob?.document_id === args.selectedDocumentId &&
      activeOrLatestExtractJob?.status === 'needs_clarification',
  );
  const reviewEntities = hasSelectedDocumentReviewContext && !clarificationRequired ? args.entities : [];
  const selectedEntity = reviewEntities.find((item) => item.entity_id === args.selectedEntityId) ?? null;
  const canWork = Boolean(args.activeProjectId);
  const canExtract = Boolean(args.activeProjectId && selectedDocument);
  const canBuildBom = Boolean(args.activeProjectId && reviewEntities.length > 0);
  const canBuildEstimate = Boolean(args.activeProjectId && (args.bom?.total_items ?? 0) > 0);
  const canExport = canBuildEstimate;

  const draftCount = reviewEntities.filter((entity) => entity.review_status === 'draft').length;
  const reviewedCount = reviewEntities.filter((entity) => entity.review_status === 'reviewed').length;
  const rejectedCount = reviewEntities.filter((entity) => entity.review_status === 'rejected').length;
  const query = args.quickQuery.trim().toLowerCase();
  const visibleEntities = reviewEntities.filter((entity) => {
    if (args.reviewFilter !== 'all' && (entity.review_status || 'draft') !== args.reviewFilter) return false;
    if (!query) return true;
    return `${entity.entity_type} ${entity.designation} ${entity.name} ${JSON.stringify(entity.params)}`
      .toLowerCase()
      .includes(query);
  });
  let nextDraftEntity: Entity | null = null;
  if (draftCount) {
    if (!selectedEntity) {
      nextDraftEntity = reviewEntities.find((item) => item.review_status === 'draft') ?? null;
    } else {
      const selectedIndex = reviewEntities.findIndex((item) => item.entity_id === selectedEntity.entity_id);
      for (let offset = 1; offset <= reviewEntities.length; offset += 1) {
        const candidate = reviewEntities[(selectedIndex + offset) % reviewEntities.length];
        if (candidate?.review_status === 'draft') {
          nextDraftEntity = candidate;
          break;
        }
      }
    }
  }

  const currentStep: WorkflowStep = !selectedDocument
    ? 'upload'
    : clarificationRequired && !args.runningExtract
      ? 'clarification'
    : args.workflowStep === 'result' && !reviewEntities.length && !args.bom && !args.estimate
      ? 'analysis'
      : args.workflowStep;
  const rawExtractionIssue = args.summarizeJobIssue(activeOrLatestExtractJob);
  const extractionIssue = activeOrLatestExtractJob?.status === 'needs_review' ? null : rawExtractionIssue;
  const processingMessage = args.runningExtract
    ? args.activeExtractionJob?.current_stage
      ? `Статус: ${args.activeExtractionJob.current_stage}. ${args.statusLabel(args.activeExtractionJob.status)}.`
      : 'Задача поставлена в очередь. Ждем начало обработки.'
    : extractionIssue
      ? `${extractionIssue.title}. ${extractionIssue.action}`
      : clarificationRequired
        ? 'Разбор завершил черновой проход, но до ручной правки нужны ответы на уточняющие вопросы по спорным строкам.'
      : reviewContextMismatch
        ? 'Для выбранного PDF нет актуальных review-артефактов: последние завершённые project-level entities принадлежат другому документу. Перезапустите разбор для этого PDF, чтобы продолжить обработку.'
      : currentStep === 'analysis'
        ? 'Черновая спецификация готова. Проверьте позиции, исправьте спорные строки и только потом собирайте состав и считайте смету.'
        : args.buildingBom
          ? 'Формируем состав оборудования.'
          : args.pricingEstimate
            ? 'Считаем стоимость оборудования и сборки.'
            : 'Готово к запуску.';

  return {
    selectedDocumentExtractJob,
    activeOrLatestExtractJob,
    latestProjectReviewJob,
    hasSelectedDocumentReviewContext,
    reviewContextMismatch,
    clarificationRequired,
    clarifications,
    openClarificationsCount: openClarifications.length,
    reviewEntities,
    selectedEntity,
    canWork,
    canExtract,
    canBuildBom,
    canBuildEstimate,
    canExport,
    draftCount,
    reviewedCount,
    rejectedCount,
    visibleEntities,
    nextDraftEntity,
    currentStep,
    extractionIssue,
    processingMessage,
    extractionProgress: Math.round((args.activeExtractionJob?.progress ?? 0.08) * 100),
    equipmentTotal: args.estimate?.equipment_cost ?? args.bom?.total_cost ?? null,
    totalCost: args.estimate?.total_cost ?? null,
    bomPreviewItems: args.bom?.items.slice(0, 8) ?? [],
    hasBom: (args.bom?.total_items ?? 0) > 0,
    estimateNotes: args.estimate?.notes ?? [],
    activePriceOverrides: Object.values(args.priceOverrides).filter((value) => value.trim() !== '').length,
    priceSourcesCount: args.projectPriceSourcesCount,
  };
}

export function createWorkflowActionPaneViewModel(args: WorkflowActionPaneViewModelArgs): {
  upload: UploadSectionProps;
  config: ConfigSectionProps;
  clarification: ClarificationSectionProps;
  analysis: AnalysisSectionProps;
  result: ResultSectionProps;
} {
  return {
    upload: { currentStep: args.currentStep, ...args.upload },
    config: { currentStep: args.currentStep, ...args.config },
    clarification: { currentStep: args.currentStep, ...args.clarification },
    analysis: { currentStep: args.currentStep, ...args.analysis },
    result: { currentStep: args.currentStep, ...args.result },
  };
}

export function createWorkflowDetailRailViewModel(args: WorkflowDetailRailViewModelArgs): DetailRailProps {
  return args;
}
