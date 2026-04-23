import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  GripVertical,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from './components/EmptyState';
import { CatalogsPage } from './components/catalogs/CatalogsPage';
import { PdfSourceViewer } from './components/PdfSourceViewer';
import { WorkflowWorkspace } from './components/WorkflowView';
import type { Scope, WorkflowSession, WorkflowStep } from './components/workflow/types';
import { createWorkflowActionPaneViewModel, createWorkflowDetailRailViewModel, deriveWorkflowState } from './components/workflow/viewModels';
import { useWorkflowActions } from './components/workflow/useWorkflowActions';
import { useWorkflowData } from './components/workflow/useWorkflowData';
import { api } from './services/api';
import type {
  BOM,
  ClarificationItem,
  Entity,
  Estimate,
  ExtractionMode,
  FileBrowserInboxFile,
  FileBrowserPriceFile,
  Job,
  ProjectMeta,
  ProjectSummary,
  SelectionRecord,
  SupplierCatalog,
  SupplierCatalogImportPreview,
  SupplierCatalogSummary,
} from './types';

const scopeOptions: Scope[] = ['all_electrical', 'panel_only', 'supply_only', 'custom'];
const workflowSteps: Array<{ step: WorkflowStep; label: string }> = [
  { step: 'upload', label: 'Загрузка' },
  { step: 'config', label: 'Настройка' },
  { step: 'clarification', label: 'Уточнение' },
  { step: 'analysis', label: 'Обработка' },
  { step: 'result', label: 'Результат' },
];
const extractionModeOptions: Array<{
  mode: ExtractionMode;
  title: string;
  text: string;
  enabled: boolean;
}> = [
  {
    mode: 'code',
    title: 'Код',
    text: 'Базовый локальный разбор: строит кандидатов и источники, но для сложных PDF это запасной режим.',
    enabled: true,
  },
  {
    mode: 'agent',
    title: 'Агент',
    text: 'Агент читает выбранные страницы напрямую. Подходит для точечных проверок без подготовленного контекста.',
    enabled: true,
  },
  {
    mode: 'combined',
    title: 'Код + агент',
    text: 'Основной режим: широкий черновой проход, затем проверка позиций и отдельный узкий анализ.',
    enabled: true,
  },
];

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function scopeLabel(scope: string): string {
  const labels: Record<string, string> = {
    all_electrical: 'Все электрические разделы',
    panel_only: 'Щиты и панели',
    supply_only: 'Ввод и питание',
    custom: 'По описанию ниже',
  };
  return labels[scope] ?? scope.replaceAll('_', ' ');
}

function statusLabel(status: string | null | undefined): string {
  const labels: Record<string, string> = {
    done: 'Готово',
    succeeded: 'Готово',
    failed: 'Ошибка',
    running: 'В работе',
    processing: 'В работе',
    pending: 'Ожидает',
    queued: 'В очереди',
    uploaded: 'Загружено',
    cancelled: 'Отменено',
    idle: 'Не запускалось',
    priced: 'Смета готова',
    needs_review: 'Нужна проверка',
    needs_clarification: 'Нужно уточнение',
  };
  return labels[status || 'idle'] ?? (status || 'Не запускалось');
}

function statusTone(status: string | null | undefined): string {
  if (status === 'done' || status === 'succeeded' || status === 'priced') return 'tone-success';
  if (status === 'failed') return 'tone-danger';
  if (status === 'needs_review' || status === 'needs_clarification') return 'tone-warn';
  if (status === 'running' || status === 'processing' || status === 'pending' || status === 'queued') return 'tone-info';
  return 'tone-muted';
}

function summarizeJobIssue(job: Job | null | undefined): { title: string; detail: string; action: string; tone: string } | null {
  if (!job) return null;

  if (job.status === 'cancelled') {
    return {
      title: 'Разбор остановлен',
      detail: job.steps.at(-1)?.note || 'Задача была отменена до завершения обработки.',
      action: 'Проверьте диапазон страниц и режим, затем запустите разбор заново.',
      tone: 'tone-muted',
    };
  }

  if (job.status !== 'failed' && job.status !== 'needs_review' && job.status !== 'needs_clarification') return null;

  const raw = `${job.error || ''} ${job.steps.at(-1)?.note || ''} ${job.current_stage || ''}`.toLowerCase();
  if (raw.includes('429') || raw.includes('rate') || raw.includes('quota') || raw.includes('limit')) {
    return {
      title: 'Лимит агента или провайдера',
      detail: job.error || 'Внешний агент вернул ограничение по частоте или квоте.',
      action: 'Повторите позже или временно переключитесь на `Код` / `Код + агент` с более узким диапазоном страниц.',
      tone: 'tone-warn',
    };
  }
  if (raw.includes('timeout') || raw.includes('timed out') || raw.includes('deadline')) {
    return {
      title: 'Разбор не уложился во время ожидания',
      detail: job.error || 'Фоновая задача зависла или внешний сервис слишком долго отвечал.',
      action: 'Сузьте диапазон страниц и повторите запуск. Для тяжёлых страниц лучше идти меньшими пачками.',
      tone: 'tone-warn',
    };
  }
  if (raw.includes('pair') || raw.includes('device') || raw.includes('token') || raw.includes('gateway') || raw.includes('provider') || raw.includes('model') || raw.includes('auth')) {
    return {
      title: 'Проблема доступа к агенту',
      detail: job.error || 'Agent/Gateway не принял запрос.',
      action: 'Проверьте доступность OpenClaw/provider или временно используйте локальный режим `Код`.',
      tone: 'tone-danger',
    };
  }
  if (raw.includes('json') || raw.includes('schema') || raw.includes('parse') || raw.includes('validation')) {
    return {
      title: 'Ответ агента требует ручной проверки',
      detail: job.error || 'Структурированный ответ оказался неполным или не прошёл валидацию.',
      action: 'Перезапустите разбор на меньшем диапазоне страниц или перейдите на локальный режим для baseline-результата.',
      tone: 'tone-warn',
    };
  }

  return {
    title: job.status === 'needs_clarification'
      ? 'Разбор требует уточнения'
      : job.status === 'needs_review'
        ? 'Разбор требует внимания'
        : 'Разбор завершился ошибкой',
    detail: job.error || job.steps.at(-1)?.note || 'Фоновая задача не завершилась штатно.',
    action: job.status === 'needs_clarification'
      ? 'Сначала ответьте на уточняющие вопросы по спорным строкам, затем продолжайте обычную ручную проверку.'
      : 'Проверьте режим, диапазон страниц и повторите запуск. Если ошибка повторяется, используйте более узкий диапазон или другой режим.',
    tone: job.status === 'needs_review' || job.status === 'needs_clarification' ? 'tone-warn' : 'tone-danger',
  };
}

function extractionModeLabel(mode: ExtractionMode | string | null | undefined): string {
  if (mode === 'combined') return 'Код + агент';
  if (mode === 'agent') return 'Агент';
  if (mode === 'code') return 'Код';
  return mode || '—';
}

function pageRangeText(pageFrom: number | null | undefined, pageTo: number | null | undefined): string {
  if (pageFrom && pageTo) return `${pageFrom}-${pageTo}`;
  if (pageFrom) return `c ${pageFrom}`;
  if (pageTo) return `до ${pageTo}`;
  return 'весь PDF';
}

function reviewStatusLabel(status: string | null | undefined): string {
  const labels: Record<string, string> = {
    draft: 'Черновик',
    reviewed: 'Проверено',
    rejected: 'Отклонено',
  };
  return labels[status || 'draft'] ?? (status || 'Черновик');
}

function sortJobsNewestFirst(items: Job[]): Job[] {
  return [...items].sort((left, right) => {
    const leftTime = Date.parse(left.updated_at || left.created_at || '');
    const rightTime = Date.parse(right.updated_at || right.created_at || '');
    return rightTime - leftTime;
  });
}

function createWorkflowSession(projectId = ''): WorkflowSession {
  return {
    projectId,
    documentId: '',
    step: 'upload',
    activeJobId: '',
    extractionMode: 'combined',
    pageFrom: '',
    pageTo: '',
    selectedEntityId: '',
    reviewFilter: 'all',
    quickQuery: '',
  };
}

type AppMode = 'workflow' | 'catalogs';

function StepIndicator({
  current,
  step,
  label,
  disabled,
  onClick,
}: {
  current: WorkflowStep;
  step: WorkflowStep;
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const currentIndex = workflowSteps.findIndex((item) => item.step === current);
  const stepIndex = workflowSteps.findIndex((item) => item.step === step);
  const active = current === step;
  const complete = stepIndex < currentIndex;

  return (
    <button
      type="button"
      className={`workflow-step ${active ? 'active' : ''} ${complete ? 'complete' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span>{String(stepIndex + 1).padStart(2, '0')}</span>
      <strong>{label}</strong>
      {complete ? <CheckCircle2 size={14} /> : null}
    </button>
  );
}

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>('workflow');
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [project, setProject] = useState<ProjectMeta | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [clarifications, setClarifications] = useState<ClarificationItem[]>([]);
  const [inboxFiles, setInboxFiles] = useState<FileBrowserInboxFile[]>([]);
  const [selection, setSelection] = useState<SelectionRecord | null>(null);
  const [bom, setBom] = useState<BOM | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowSession>(() => createWorkflowSession());
  const [viewerPage, setViewerPage] = useState<number | null>(null);
  const [scope, setScope] = useState<Scope>('all_electrical');
  const [loading, setLoading] = useState(true);
  const [creatingProject, setCreatingProject] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [importingInbox, setImportingInbox] = useState(false);
  const [inboxError, setInboxError] = useState('');
  const [runningExtract, setRunningExtract] = useState(false);
  const [activeExtractionJob, setActiveExtractionJob] = useState<Job | null>(null);
  const [buildingBom, setBuildingBom] = useState(false);
  const [pricingEstimate, setPricingEstimate] = useState(false);
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedInboxPath, setSelectedInboxPath] = useState('');
  const [extractionInstructions, setExtractionInstructions] = useState('');
  const [analysisInstructions, setAnalysisInstructions] = useState('');
  const [customScopeText, setCustomScopeText] = useState('');
  const [assemblyMultiplier, setAssemblyMultiplier] = useState('2');
  const [priceOverrides, setPriceOverrides] = useState<Record<string, string>>({});
  const [splitPosition, setSplitPosition] = useState(40);
  const [isResizing, setIsResizing] = useState(false);
  const [savingEntity, setSavingEntity] = useState(false);
  const [creatingEntity, setCreatingEntity] = useState(false);
  const [approvingVisible, setApprovingVisible] = useState(false);
  const [answeringClarificationId, setAnsweringClarificationId] = useState('');
  const [applyingClarifications, setApplyingClarifications] = useState(false);
  const [supplierCatalogs, setSupplierCatalogs] = useState<SupplierCatalogSummary[]>([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState('');
  const [selectedSupplierCatalog, setSelectedSupplierCatalog] = useState<SupplierCatalog | null>(null);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [loadingCatalogDetail, setLoadingCatalogDetail] = useState(false);
  const [catalogImportMode, setCatalogImportMode] = useState(false);
  const [previewingCatalogImport, setPreviewingCatalogImport] = useState(false);
  const [committingCatalogImport, setCommittingCatalogImport] = useState(false);
  const [catalogImportPreview, setCatalogImportPreview] = useState<SupplierCatalogImportPreview | null>(null);
  const [catalogImportMapping, setCatalogImportMapping] = useState<Record<string, string>>({});
  const [catalogImportSupplierName, setCatalogImportSupplierName] = useState('');
  const [catalogImportReference, setCatalogImportReference] = useState('');
  const [catalogImportPriority, setCatalogImportPriority] = useState('100');
  const [catalogImportNotes, setCatalogImportNotes] = useState('');
  const [priceFiles, setPriceFiles] = useState<FileBrowserPriceFile[]>([]);
  const [selectedPriceFilePath, setSelectedPriceFilePath] = useState('');
  const [loadingPriceFiles, setLoadingPriceFiles] = useState(false);
  const [priceFilesError, setPriceFilesError] = useState('');
  const [entityForm, setEntityForm] = useState({
    entity_type: 'load',
    designation: '',
    name: '',
    qty: '1',
    review_status: 'draft',
  });
  const [manualEntityForm, setManualEntityForm] = useState({
    entity_type: 'load',
    designation: '',
    name: '',
    qty: '1',
  });

  const fileRef = useRef<HTMLInputElement | null>(null);
  const catalogImportFileRef = useRef<HTMLInputElement | null>(null);
  const activeProjectId = workflow.projectId;
  const selectedDocumentId = workflow.documentId;
  const selectedEntityId = workflow.selectedEntityId;
  const extractionMode = workflow.extractionMode;
  const pageFrom = workflow.pageFrom;
  const pageTo = workflow.pageTo;
  const reviewFilter = workflow.reviewFilter;
  const quickQuery = workflow.quickQuery;

  const activeProject = useMemo(
    () => projects.find((item) => item.project_id === activeProjectId) ?? null,
    [projects, activeProjectId],
  );

  const documents = project?.documents ?? [];
  const selectedDocument = useMemo(
    () => documents.find((item) => item.document_id === selectedDocumentId) ?? documents.at(-1) ?? documents[0] ?? null,
    [documents, selectedDocumentId],
  );
  const derivedWorkflow = useMemo(
    () =>
      deriveWorkflowState({
        activeProjectId,
        selectedDocumentId,
        workflowStep: workflow.step,
        documents,
        jobs,
        entities,
        clarifications,
        bom,
        estimate,
        activeExtractionJob,
        selectedEntityId,
        quickQuery,
        reviewFilter,
        runningExtract,
        buildingBom,
        pricingEstimate,
        priceOverrides,
        projectPriceSourcesCount: project?.price_sources.length ?? 0,
        summarizeJobIssue,
        statusLabel,
      }),
    [
      activeExtractionJob,
      activeProjectId,
      bom,
      buildingBom,
      documents,
      entities,
      clarifications,
      estimate,
      jobs,
      priceOverrides,
      pricingEstimate,
      project?.price_sources.length,
      quickQuery,
      reviewFilter,
      runningExtract,
      selectedDocumentId,
      selectedEntityId,
      workflow.step,
    ],
  );
  const {
    activeOrLatestExtractJob,
    latestProjectReviewJob,
    clarificationRequired,
    clarifications: analysisClarifications,
    openClarificationsCount,
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
    extractionProgress,
    equipmentTotal,
    totalCost,
    bomPreviewItems,
    hasBom,
    estimateNotes,
    activePriceOverrides,
    priceSourcesCount,
  } = derivedWorkflow;

  const viewerUrl = useMemo(() => {
    if (!activeProjectId || !selectedDocument) return '';
    return new URL(
      api.documents.fileUrl(activeProjectId, selectedDocument.document_id),
      window.location.origin,
    ).toString();
  }, [activeProjectId, selectedDocument]);

  const selectedDocumentPageKey = useMemo(() => {
    if (!activeProjectId || !selectedDocument) return '';
    return `pdf_spec.viewer_page.${activeProjectId}.${selectedDocument.document_id}`;
  }, [activeProjectId, selectedDocument]);

  const rememberViewerPage = useCallback((nextPage: number | null) => {
    setViewerPage(nextPage);
    if (nextPage && selectedDocumentPageKey) {
      sessionStorage.setItem(selectedDocumentPageKey, String(nextPage));
    }
  }, [selectedDocumentPageKey]);

  const { loadProject, loadInboxFiles, loadProjects } = useWorkflowData({
    activeProjectId,
    jobs,
    workflow,
    setWorkflow,
    setProjects,
    setProject,
    setJobs,
    setEntities,
    setClarifications,
    setInboxFiles,
    setSelection,
    setBom,
    setEstimate,
    setExtractionInstructions,
    setAnalysisInstructions,
    setCustomScopeText,
    setScope,
    setViewerPage,
    setLoading,
    setLoadingInbox,
    setInboxError,
    setSelectedInboxPath,
    setActiveExtractionJob,
    setRunningExtract,
    createWorkflowSession,
    sortJobsNewestFirst,
    summarizeJobIssue,
    statusLabel,
    rememberViewerPage,
  });

  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((event: MouseEvent) => {
    if (!isResizing) return;
    const next = (event.clientX / window.innerWidth) * 100;
    if (next >= 28 && next <= 68) {
      setSplitPosition(next);
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  useEffect(() => {
    if (!selectedEntity) {
      setEntityForm({
        entity_type: 'load',
        designation: '',
        name: '',
        qty: '1',
        review_status: 'draft',
      });
      return;
    }
    setEntityForm({
      entity_type: selectedEntity.entity_type || 'load',
      designation: selectedEntity.designation || '',
      name: selectedEntity.name || '',
      qty: String(selectedEntity.qty || 1),
      review_status: selectedEntity.review_status || 'draft',
    });
  }, [selectedEntity]);

  useEffect(() => {
    const nextOverrides: Record<string, string> = {};
    for (const item of bom?.items ?? []) {
      const key = item.designation || item.entity_ids[0] || item.name;
      if (!key) continue;
      if (item.price_override !== null && item.price_override !== undefined) {
        nextOverrides[key] = String(item.price_override);
      }
    }
    setPriceOverrides(nextOverrides);
  }, [bom]);

  const resetCatalogImportState = useCallback(() => {
    setCatalogImportMode(false);
    setCatalogImportPreview(null);
    setCatalogImportMapping({});
    setCatalogImportSupplierName('');
    setCatalogImportReference('');
    setCatalogImportPriority('100');
    setCatalogImportNotes('');
    setSelectedPriceFilePath('');
    if (catalogImportFileRef.current) {
      catalogImportFileRef.current.value = '';
    }
  }, []);

  const resetCatalogImportPreview = useCallback(() => {
    setCatalogImportPreview(null);
    setCatalogImportMapping({});
  }, []);

  const loadPriceFiles = useCallback(async (force = false) => {
    setLoadingPriceFiles(true);
    setPriceFilesError('');
    try {
      const files = await api.filebrowser.prices(force);
      setPriceFiles(files);
      setSelectedPriceFilePath((current) => (
        current && files.some((file) => file.path === current) ? current : ''
      ));
    } catch (error) {
      setPriceFiles([]);
      setSelectedPriceFilePath('');
      setPriceFilesError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingPriceFiles(false);
    }
  }, []);

  const loadSupplierCatalogs = useCallback(async (focusCatalogId?: string) => {
    if (!activeProjectId) {
      setSupplierCatalogs([]);
      setSelectedCatalogId('');
      setSelectedSupplierCatalog(null);
      return;
    }

    setLoadingCatalogs(true);
    try {
      const list = await api.priceSources.listSupplierCatalogs(activeProjectId);
      setSupplierCatalogs(list);

      const nextSelectedId = focusCatalogId
        ?? (list.some((item) => item.catalog_id === selectedCatalogId) ? selectedCatalogId : list[0]?.catalog_id ?? '');
      setSelectedCatalogId(nextSelectedId);

      if (!nextSelectedId) {
        setSelectedSupplierCatalog(null);
      }
    } catch (error) {
      toast.error(`Не удалось загрузить каталоги: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoadingCatalogs(false);
    }
  }, [activeProjectId, selectedCatalogId]);

  const loadSupplierCatalogDetail = useCallback(async (catalogId: string) => {
    if (!activeProjectId || !catalogId) {
      setSelectedSupplierCatalog(null);
      return;
    }

    setSelectedCatalogId(catalogId);
    setLoadingCatalogDetail(true);
    try {
      const catalog = await api.priceSources.getSupplierCatalog(activeProjectId, catalogId);
      setSelectedSupplierCatalog(catalog);
    } catch (error) {
      toast.error(`Не удалось открыть каталог: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoadingCatalogDetail(false);
    }
  }, [activeProjectId]);

  const handlePreviewSupplierCatalogImport = useCallback(async () => {
    if (!activeProjectId) {
      toast.error('Сначала выберите проект.');
      return;
    }

    const selectedPriceFile = priceFiles.find((item) => item.path === selectedPriceFilePath) ?? null;
    const file = catalogImportFileRef.current?.files?.[0];
    if (!file && !selectedPriceFile) {
      toast.error('Выберите CSV/XLS/XLSX файл с компьютера или из FileBrowser/prices.');
      return;
    }
    if (selectedPriceFile && !selectedPriceFile.supported_for_catalog_import) {
      toast.error('PDF-прайс пока нельзя импортировать как каталог. Нужен CSV/XLS/XLSX/XLSM.');
      return;
    }

    setPreviewingCatalogImport(true);
    try {
      const preview = selectedPriceFile
        ? await api.priceSources.previewSupplierCatalogImportFromFileBrowser(activeProjectId, selectedPriceFile.path)
        : await api.priceSources.previewSupplierCatalogImport(activeProjectId, file as File);
      setCatalogImportPreview(preview);
      setCatalogImportMapping(preview.suggested_mapping ?? {});
      if (!catalogImportReference.trim()) {
        setCatalogImportReference(selectedPriceFile?.path || preview.filename);
      }
    } catch (error) {
      toast.error(`Не удалось прочитать каталог: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setPreviewingCatalogImport(false);
    }
  }, [activeProjectId, catalogImportReference, priceFiles, selectedPriceFilePath]);

  const handleCommitSupplierCatalogImport = useCallback(async () => {
    if (!activeProjectId) {
      toast.error('Сначала выберите проект.');
      return;
    }
    const selectedPriceFile = priceFiles.find((item) => item.path === selectedPriceFilePath) ?? null;
    const file = catalogImportFileRef.current?.files?.[0];
    if (!file && !selectedPriceFile) {
      toast.error('Выберите CSV/XLS/XLSX файл с компьютера или из FileBrowser/prices.');
      return;
    }
    if (selectedPriceFile && !selectedPriceFile.supported_for_catalog_import) {
      toast.error('PDF-прайс пока нельзя импортировать как каталог. Нужен CSV/XLS/XLSX/XLSM.');
      return;
    }
    if (!catalogImportPreview) {
      toast.error('Сначала откройте preview и проверьте mapping.');
      return;
    }
    if (!catalogImportSupplierName.trim()) {
      toast.error('Укажите поставщика.');
      return;
    }

    setCommittingCatalogImport(true);
    try {
      const created = selectedPriceFile
        ? await api.priceSources.commitSupplierCatalogImportFromFileBrowser(
            activeProjectId,
            {
              supplier_name: catalogImportSupplierName.trim(),
              path: selectedPriceFile.path,
              reference: catalogImportReference.trim(),
              priority: Number(catalogImportPriority) || 100,
              notes: catalogImportNotes.trim(),
              mapping: catalogImportMapping,
            },
          )
        : await api.priceSources.commitSupplierCatalogImport(
            activeProjectId,
            {
              supplier_name: catalogImportSupplierName.trim(),
              reference: catalogImportReference.trim(),
              priority: Number(catalogImportPriority) || 100,
              notes: catalogImportNotes.trim(),
              mapping_json: JSON.stringify(catalogImportMapping),
            },
            file as File,
          );
      await loadSupplierCatalogs(created.catalog_id);
      await loadSupplierCatalogDetail(created.catalog_id);
      resetCatalogImportState();
      toast.success('Каталог импортирован');
    } catch (error) {
      toast.error(`Не удалось импортировать каталог: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCommittingCatalogImport(false);
    }
  }, [
    activeProjectId,
    catalogImportMapping,
    catalogImportNotes,
    catalogImportPreview,
    catalogImportPriority,
    catalogImportReference,
    catalogImportSupplierName,
    loadSupplierCatalogDetail,
    loadSupplierCatalogs,
    priceFiles,
    resetCatalogImportState,
    selectedPriceFilePath,
  ]);

  useEffect(() => {
    setSupplierCatalogs([]);
    setSelectedCatalogId('');
    setSelectedSupplierCatalog(null);
    setPriceFiles([]);
    setPriceFilesError('');
    resetCatalogImportState();
  }, [activeProjectId, resetCatalogImportState]);

  useEffect(() => {
    if (appMode !== 'catalogs' || !activeProjectId) return;
    void loadSupplierCatalogs();
    void loadPriceFiles();
  }, [activeProjectId, appMode, loadPriceFiles, loadSupplierCatalogs]);

  useEffect(() => {
    if (appMode !== 'catalogs' || !activeProjectId || catalogImportMode || !selectedCatalogId) return;
    void loadSupplierCatalogDetail(selectedCatalogId);
  }, [activeProjectId, appMode, catalogImportMode, loadSupplierCatalogDetail, selectedCatalogId]);

  const {
    handleCreateProject,
    handleUpload,
    handleImportInbox,
    handleUpdateScope,
    handleSaveInstructions,
    handleExtract,
    handleBuildBom,
    handleBuildEstimate,
    handleExport,
    handleSetEntityReviewStatus,
    handleSaveEntity,
    handleCreateEntity,
    handleApproveVisible,
    handleAnswerClarification,
    handleApplyClarifications,
    openEntity,
    openNextEntity,
    selectDocument,
  } = useWorkflowActions({
    activeProjectId,
    selectedDocumentId,
    canExtract,
    canBuildBom,
    canBuildEstimate,
    canExport,
    extractionMode,
    pageFrom,
    pageTo,
    scope,
    customScopeText,
    extractionInstructions,
    analysisInstructions,
    assemblyMultiplier,
    priceOverrides,
    newProjectName,
    selectedInboxPath,
    selectedEntity,
    clarifications: analysisClarifications,
    activeJobStatus: activeOrLatestExtractJob?.status,
    activeJobId: activeOrLatestExtractJob?.job_id ?? '',
    reviewEntities,
    entityForm,
    manualEntityForm,
    fileRef,
    setWorkflow,
    setCreatingProject,
    setUploading,
    setImportingInbox,
    setSavingInstructions,
    setRunningExtract,
    setActiveExtractionJob,
    setBuildingBom,
    setPricingEstimate,
    setSavingEntity,
    setCreatingEntity,
    setApprovingVisible,
    setNewProjectName,
    setProject,
    setScope,
    setExtractionInstructions,
    setAnalysisInstructions,
    setEntities,
    setClarifications,
    setEntityForm,
    setManualEntityForm,
    setBom,
    setEstimate,
    setAnsweringClarificationId,
    setApplyingClarifications,
    loadProjects,
    loadProject,
    loadInboxFiles,
    rememberViewerPage,
    reviewStatusLabel,
  });

  const handleEmptyStateUpload = useCallback((file: File) => {
    void handleUpload(file);
  }, [handleUpload]);

  const handleNewDocument = useCallback(() => {
    setWorkflow((current) => ({
      ...current,
      step: 'upload',
    }));
    fileRef.current?.click();
  }, [fileRef]);

  const sourceEvidence = useMemo(
    () => (workflow.step === 'analysis' && selectedEntity ? selectedEntity.sources : []),
    [selectedEntity, workflow.step],
  );

  const pageRangeLabel = pageFrom || pageTo ? `${pageFrom || '1'}-${pageTo || 'конец'}` : 'весь PDF';
  const actionPaneProps = createWorkflowActionPaneViewModel({
    currentStep,
    upload: {
      canWork,
      creatingProject,
      newProjectName,
      onProjectNameChange: setNewProjectName,
      onCreateProject: handleCreateProject,
      fileRef,
      uploading,
      onUpload: handleUpload,
      inboxFiles,
      selectedInboxPath,
      onInboxPathChange: setSelectedInboxPath,
      loadingInbox,
      onRefreshInbox: loadInboxFiles,
      importingInbox,
      onImportInbox: handleImportInbox,
      inboxError,
    },
    config: {
      scope,
      scopeOptions,
      scopeLabel,
      onUpdateScope: handleUpdateScope,
      pageFrom,
      pageTo,
      onPageFromChange: (value) =>
        setWorkflow((current) => ({
          ...current,
          pageFrom: value,
        })),
      onPageToChange: (value) =>
        setWorkflow((current) => ({
          ...current,
          pageTo: value,
        })),
      pageRangeLabel,
      canWork,
      extractionModeOptions,
      extractionMode,
      onExtractionModeChange: (mode) =>
        setWorkflow((current) => ({
          ...current,
          extractionMode: mode,
        })),
      runningExtract,
      customScopeText,
      onCustomScopeTextChange: setCustomScopeText,
      extractionInstructions,
      onExtractionInstructionsChange: setExtractionInstructions,
      analysisInstructions,
      onAnalysisInstructionsChange: setAnalysisInstructions,
      savingInstructions,
      onSaveInstructions: handleSaveInstructions,
      canExtract,
      onExtract: handleExtract,
    },
    clarification: {
      activeJobStatus: activeOrLatestExtractJob?.status,
      activeJobStatusLabel: statusLabel(activeOrLatestExtractJob?.status),
      activeJobStatusTone: statusTone(activeOrLatestExtractJob?.status),
      processingMessage,
      clarificationRequired,
      openClarificationsCount,
      clarifications: analysisClarifications,
      answeringClarificationId,
      applyingClarifications,
      onAnswerClarification: handleAnswerClarification,
      onApplyClarifications: handleApplyClarifications,
      onOpenAnalysis: () =>
        setWorkflow((current) => ({
          ...current,
          step: 'analysis',
        })),
    },
    analysis: {
      runningExtract,
      processingMessage,
      extractionProgress,
      extractionIssue,
      activeJobStatus: activeOrLatestExtractJob?.status,
      activeJobStatusLabel: statusLabel(activeOrLatestExtractJob?.status),
      activeJobStatusTone: statusTone(activeOrLatestExtractJob?.status),
      clarificationRequired,
      openClarificationsCount,
      clarifications: analysisClarifications,
      answeringClarificationId,
      applyingClarifications,
      onAnswerClarification: handleAnswerClarification,
      onApplyClarifications: handleApplyClarifications,
      reviewEntities,
      draftCount,
      reviewedCount,
      rejectedCount,
      canOpenResult: reviewEntities.length > 0 && draftCount === 0,
      onOpenResult: () => {
        if (!hasBom && canBuildBom) {
          void handleBuildBom();
          return;
        }
        setWorkflow((current) => ({
          ...current,
          step: 'result',
          selectedEntityId: '',
        }));
      },
      onApproveVisible: handleApproveVisible,
      approvingVisible,
      nextDraftEntity,
      onOpenNextEntity: openNextEntity,
      quickQuery,
      onQuickQueryChange: (value) =>
        setWorkflow((current) => ({
          ...current,
          quickQuery: value,
        })),
      reviewFilter,
      onReviewFilterChange: (value) =>
        setWorkflow((current) => ({
          ...current,
          reviewFilter: value,
        })),
      visibleEntities,
      manualEntityForm,
      onManualEntityFieldChange: (field, value) =>
        setManualEntityForm((current) => ({
          ...current,
          [field]: value,
        })),
      creatingEntity,
      onCreateEntity: handleCreateEntity,
      selectedEntity,
      onOpenEntity: openEntity,
    },
    result: {
      canBuildBom,
      buildingBom,
      onBuildBom: handleBuildBom,
      canBuildEstimate,
      pricingEstimate,
      onBuildEstimate: handleBuildEstimate,
      hasBom,
      bom,
      estimate,
      reviewEntitiesCount: reviewEntities.length,
      equipmentTotal,
      totalCost,
      analysisInstructions,
      bomPreviewItems,
      assemblyMultiplier,
      onAssemblyMultiplierChange: setAssemblyMultiplier,
      priceSourcesCount,
      activePriceOverrides,
      priceOverrides,
      onPriceOverrideChange: (key, value) =>
        setPriceOverrides((current) => ({
          ...current,
          [key]: value,
        })),
      estimateNotes,
      canExport,
      onExport: handleExport,
    },
  });
  const detailRailProps = createWorkflowDetailRailViewModel({
    currentStep,
    extractionInstructions,
    analysisInstructions,
    selection,
    defaultModeLabel: extractionModeLabel(extractionMode),
    runningExtract,
    analysisModeLabel: extractionModeLabel(
      (reviewEntities.length ? activeOrLatestExtractJob : latestProjectReviewJob)?.mode ?? extractionMode,
    ),
    analysisPagesLabel: pageRangeText(
      (reviewEntities.length ? activeOrLatestExtractJob : latestProjectReviewJob)?.page_from,
      (reviewEntities.length ? activeOrLatestExtractJob : latestProjectReviewJob)?.page_to,
    ),
    draftCount,
    reviewedCount,
    activeJobStatus: activeOrLatestExtractJob?.status,
    activeJobStatusLabel: statusLabel(activeOrLatestExtractJob?.status),
    activeJobStatusTone: statusTone(activeOrLatestExtractJob?.status),
    extractionIssue,
    processingMessage,
    clarificationRequired,
    openClarificationsCount,
    clarifications: analysisClarifications,
    selectedEntity,
    entityForm,
    onEntityFormFieldChange: (field, value) =>
      setEntityForm((current) => ({
        ...current,
        [field]: value,
      })),
    savingEntity,
    onSaveEntity: handleSaveEntity,
    onSetEntityReviewStatus: handleSetEntityReviewStatus,
    nextDraftEntity,
    onOpenNextEntity: openNextEntity,
    onCloseEntity: () =>
      setWorkflow((current) => ({
        ...current,
        selectedEntityId: '',
      })),
    onRememberViewerPage: rememberViewerPage,
    bom,
    equipmentTotal,
    totalCost,
    statusLabel,
  });

  const handleDeleteProject = useCallback(async () => {
    if (!activeProject) return;
    const confirmed = window.confirm(`Удалить проект "${activeProject.name}" со всеми PDF и результатами?`);
    if (!confirmed) return;

    setLoading(true);
    try {
      await api.projects.delete(activeProject.project_id);
      setWorkflow(createWorkflowSession());
      setProject(null);
      setJobs([]);
      setEntities([]);
      setClarifications([]);
      setSelection(null);
      setBom(null);
      setEstimate(null);
      setViewerPage(null);
      await loadProjects('', true);
      toast.success('Проект удалён');
    } catch (error) {
      toast.error(`Не удалось удалить проект: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [activeProject, loadProjects]);

  return (
    <div className={`workspace-shell ${isResizing ? 'is-resizing' : ''}`}>
      <header className="workspace-header">
        <div className="workspace-brand">
          <div className="brand-mark">P</div>
          <div>
            <strong>PDF Спецификатор</strong>
            <span>{project?.name ?? activeProject?.name ?? 'Проект не выбран'}</span>
          </div>
        </div>

        <div className="workspace-modes" role="tablist" aria-label="Раздел приложения">
          <button
            type="button"
            className={`workspace-mode ${appMode === 'workflow' ? 'active' : ''}`}
            onClick={() => setAppMode('workflow')}
          >
            Спецификация
          </button>
          <button
            type="button"
            className={`workspace-mode ${appMode === 'catalogs' ? 'active' : ''}`}
            onClick={() => setAppMode('catalogs')}
            disabled={!activeProjectId}
          >
            Каталоги
          </button>
        </div>

        {appMode === 'workflow' ? (
          <nav className="workflow-steps" aria-label="Этапы работы">
            {workflowSteps.map((item) => (
              <StepIndicator
                key={item.step}
                current={currentStep}
                step={item.step}
                label={item.label}
                disabled={
                  (item.step === 'config' && !selectedDocument) ||
                  (item.step === 'clarification' && !analysisClarifications.length) ||
                  (item.step === 'analysis' && !selectedDocument) ||
                  (item.step === 'result' && !reviewEntities.length && !bom && !estimate)
                }
                onClick={() =>
                  setWorkflow((current) => ({
                    ...current,
                    step: item.step,
                  }))
                }
              />
            ))}
          </nav>
        ) : (
          <div className="workspace-section-label">
            <strong>Каталоги поставщиков</strong>
            <span>Импорт прайсов, preview и нормализация</span>
          </div>
        )}

        <div className="header-actions">
          <label className="project-switcher">
            <span>Проект</span>
            <select
              value={activeProjectId}
              onChange={(event) => loadProject(event.target.value)}
              disabled={loading || !projects.length}
            >
              {projects.length ? (
                projects.map((item) => (
                  <option key={item.project_id} value={item.project_id}>
                    {item.name}
                  </option>
                ))
              ) : (
                <option value="">Нет проектов</option>
              )}
            </select>
          </label>
          <button className="btn btn-secondary" onClick={() => loadProjects(activeProjectId, true)} disabled={loading}>
            <RefreshCw size={16} />
            Обновить
          </button>
          <button className="btn btn-danger" onClick={handleDeleteProject} disabled={loading || !activeProject}>
            <Trash2 size={16} />
            Удалить
          </button>
        </div>
      </header>

      {appMode === 'workflow' ? (
        <main className="split-workspace">
          <section className="pdf-pane" style={{ width: `${splitPosition}%` }}>
            <div className="pdf-pane__bar">
              <div>
                <span>Документ</span>
                <strong>{selectedDocument?.filename ?? 'PDF не загружен'}</strong>
              </div>
              {documents.length > 1 ? (
                <select value={selectedDocumentId} onChange={(event) => selectDocument(event.target.value)}>
                  {documents.map((document) => (
                    <option key={document.document_id} value={document.document_id}>
                      {document.filename}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            {selectedDocument ? (
              <PdfSourceViewer
                pdfUrl={viewerUrl}
                fileName={selectedDocument.filename}
                page={viewerPage}
                sources={sourceEvidence}
                onPageChange={rememberViewerPage}
                onNewDocument={handleNewDocument}
              />
            ) : (
              <div className="pdf-empty">
                <EmptyState
                  disabled={!activeProjectId}
                  uploading={uploading}
                  onFileSelected={handleEmptyStateUpload}
                />
              </div>
            )}
          </section>

          <div
            className="split-resizer group relative w-1 hover:w-1.5 transition-all bg-slate-200 hover:bg-blue-400 cursor-col-resize"
            onMouseDown={startResizing}
            role="separator"
            aria-orientation="vertical"
            aria-label="Изменить ширину просмотра PDF"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-sm">
              <GripVertical size={12} className="text-slate-400" />
            </div>
          </div>

          <WorkflowWorkspace
            upload={actionPaneProps.upload}
            config={actionPaneProps.config}
            clarification={actionPaneProps.clarification}
            analysis={actionPaneProps.analysis}
            result={actionPaneProps.result}
            detailRail={detailRailProps}
          />
        </main>
      ) : (
        <CatalogsPage
          activeProjectName={project?.name ?? activeProject?.name ?? ''}
          hasActiveProject={Boolean(activeProjectId)}
          catalogs={supplierCatalogs}
          loadingCatalogs={loadingCatalogs}
          selectedCatalog={selectedSupplierCatalog}
          selectedCatalogId={selectedCatalogId}
          loadingCatalogDetail={loadingCatalogDetail}
          importMode={catalogImportMode}
          importSupplierName={catalogImportSupplierName}
          importReference={catalogImportReference}
          importPriority={catalogImportPriority}
          importNotes={catalogImportNotes}
          priceFiles={priceFiles}
          selectedPriceFilePath={selectedPriceFilePath}
          loadingPriceFiles={loadingPriceFiles}
          priceFilesError={priceFilesError}
          importPreview={catalogImportPreview}
          importMapping={catalogImportMapping}
          previewingImport={previewingCatalogImport}
          committingImport={committingCatalogImport}
          onRefresh={() => void loadSupplierCatalogs()}
          onOpenCatalog={(catalogId) => {
            setCatalogImportMode(false);
            void loadSupplierCatalogDetail(catalogId);
          }}
          onStartImport={() => {
            setCatalogImportMode(true);
            setSelectedSupplierCatalog(null);
            setSelectedCatalogId('');
          }}
          onCancelImport={resetCatalogImportState}
          onImportSupplierNameChange={setCatalogImportSupplierName}
          onImportReferenceChange={setCatalogImportReference}
          onImportPriorityChange={setCatalogImportPriority}
          onImportNotesChange={setCatalogImportNotes}
          onRefreshPriceFiles={() => void loadPriceFiles(true)}
          onImportPriceFilePathChange={(value) => {
            setSelectedPriceFilePath(value);
            resetCatalogImportPreview();
            if (value && catalogImportFileRef.current) {
              catalogImportFileRef.current.value = '';
            }
          }}
          onImportLocalFileSelected={() => {
            if (selectedPriceFilePath) {
              setSelectedPriceFilePath('');
            }
            resetCatalogImportPreview();
          }}
          onPreviewImport={() => void handlePreviewSupplierCatalogImport()}
          onCommitImport={() => void handleCommitSupplierCatalogImport()}
          onImportMappingChange={(field, value) =>
            setCatalogImportMapping((current) => ({
              ...current,
              [field]: value,
            }))
          }
          importFileRef={catalogImportFileRef}
        />
      )}
    </div>
  );
}
