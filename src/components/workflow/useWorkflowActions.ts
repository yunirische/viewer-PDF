import type { Dispatch, RefObject, SetStateAction } from 'react';
import { toast } from 'sonner';

import { api } from '../../services/api';
import type { BOM, ClarificationItem, Entity, Estimate, ExtractionMode, Job, ProjectMeta } from '../../types';
import type { EntityFormState, ManualEntityFormState, Scope, WorkflowSession } from './types';

type UseWorkflowActionsArgs = {
  activeProjectId: string;
  selectedDocumentId: string;
  canExtract: boolean;
  canBuildBom: boolean;
  canBuildEstimate: boolean;
  canExport: boolean;
  extractionMode: ExtractionMode;
  pageFrom: string;
  pageTo: string;
  scope: Scope;
  customScopeText: string;
  extractionInstructions: string;
  analysisInstructions: string;
  assemblyMultiplier: string;
  priceOverrides: Record<string, string>;
  newProjectName: string;
  selectedInboxPath: string;
  selectedEntity: Entity | null;
  clarifications: ClarificationItem[];
  activeJobStatus: string | null | undefined;
  activeJobId: string;
  reviewEntities: Entity[];
  entityForm: EntityFormState;
  manualEntityForm: ManualEntityFormState;
  fileRef: RefObject<HTMLInputElement | null>;
  setWorkflow: Dispatch<SetStateAction<WorkflowSession>>;
  setCreatingProject: Dispatch<SetStateAction<boolean>>;
  setUploading: Dispatch<SetStateAction<boolean>>;
  setImportingInbox: Dispatch<SetStateAction<boolean>>;
  setSavingInstructions: Dispatch<SetStateAction<boolean>>;
  setRunningExtract: Dispatch<SetStateAction<boolean>>;
  setActiveExtractionJob: Dispatch<SetStateAction<Job | null>>;
  setBuildingBom: Dispatch<SetStateAction<boolean>>;
  setPricingEstimate: Dispatch<SetStateAction<boolean>>;
  setSavingEntity: Dispatch<SetStateAction<boolean>>;
  setCreatingEntity: Dispatch<SetStateAction<boolean>>;
  setApprovingVisible: Dispatch<SetStateAction<boolean>>;
  setNewProjectName: Dispatch<SetStateAction<string>>;
  setProject: Dispatch<SetStateAction<ProjectMeta | null>>;
  setScope: Dispatch<SetStateAction<Scope>>;
  setExtractionInstructions: Dispatch<SetStateAction<string>>;
  setAnalysisInstructions: Dispatch<SetStateAction<string>>;
  setEntities: Dispatch<SetStateAction<Entity[]>>;
  setClarifications: Dispatch<SetStateAction<ClarificationItem[]>>;
  setEntityForm: Dispatch<SetStateAction<EntityFormState>>;
  setManualEntityForm: Dispatch<SetStateAction<ManualEntityFormState>>;
  setBom: Dispatch<SetStateAction<BOM | null>>;
  setEstimate: Dispatch<SetStateAction<Estimate | null>>;
  setAnsweringClarificationId: Dispatch<SetStateAction<string>>;
  setApplyingClarifications: Dispatch<SetStateAction<boolean>>;
  loadProjects: (initialId?: string, force?: boolean) => Promise<void>;
  loadProject: (projectId: string) => Promise<void>;
  loadInboxFiles: (force?: boolean) => Promise<void>;
  rememberViewerPage: (page: number | null) => void;
  reviewStatusLabel: (status: string | null | undefined) => string;
};

export function useWorkflowActions(args: UseWorkflowActionsArgs) {
  async function persistInstructions(showToast: boolean): Promise<boolean> {
    if (!args.activeProjectId) {
      if (showToast) toast.error('Сначала выберите или создайте проект');
      return false;
    }
    args.setSavingInstructions(true);
    try {
      const baseInstructions = args.extractionInstructions.replace(/\n\nСвоя область поиска:[\s\S]*$/u, '').trim();
      const extractionInstructionsPayload = args.scope === 'custom' && args.customScopeText.trim()
        ? `${baseInstructions}\n\nСвоя область поиска: ${args.customScopeText.trim()}`.trim()
        : args.extractionInstructions;
      const saved = await api.projects.updateInstructions(args.activeProjectId, {
        extraction_instructions: extractionInstructionsPayload,
        analysis_instructions: args.analysisInstructions,
      });
      const normalizedSavedInstructions = saved.extraction_instructions.replace(/\n\nСвоя область поиска:[\s\S]*$/u, '').trim();
      args.setExtractionInstructions(normalizedSavedInstructions);
      args.setAnalysisInstructions(saved.analysis_instructions);
      args.setProject((current: any) => current ? {
        ...current,
        agent_instructions: saved.agent_instructions,
        extraction_instructions: saved.extraction_instructions,
        analysis_instructions: saved.analysis_instructions,
      } : current);
      if (showToast) toast.success('Настройки сохранены в проект');
      return true;
    } catch (error) {
      toast.error(`Не удалось сохранить инструкции: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    } finally {
      args.setSavingInstructions(false);
    }
  }

  function openEntity(entity: Entity) {
    args.setWorkflow((current) => ({
      ...current,
      selectedEntityId: entity.entity_id,
      step: 'analysis',
    }));
    args.rememberViewerPage(entity.sources[0]?.page ?? null);
  }

  function openNextEntity(entity: Entity | null) {
    if (!entity) {
      toast.message('Непроверенных позиций больше нет');
      return;
    }
    openEntity(entity);
  }

  function selectDocument(documentId: string) {
    args.setWorkflow((current) => ({
      ...current,
      documentId,
      step: 'config',
      activeJobId: '',
      selectedEntityId: '',
      reviewFilter: 'all',
      quickQuery: '',
      pageFrom: '',
      pageTo: '',
    }));
    args.setActiveExtractionJob(null);
    args.setRunningExtract(false);
    const storedPage = Number(sessionStorage.getItem(`pdf_spec.viewer_page.${args.activeProjectId}.${documentId}`));
    args.rememberViewerPage(Number.isInteger(storedPage) && storedPage > 0 ? storedPage : 1);
  }

  async function handleCreateProject() {
    if (!args.newProjectName.trim()) {
      toast.error('Введите имя проекта');
      return;
    }
    args.setCreatingProject(true);
    try {
      const created = await api.projects.create(args.newProjectName.trim(), args.scope);
      args.setNewProjectName('');
      toast.success('Проект создан');
      await args.loadProjects(created.project_id, true);
      await args.loadInboxFiles(true);
    } catch (error) {
      toast.error(`Не удалось создать проект: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      args.setCreatingProject(false);
    }
  }

  async function handleUpload(fileOverride?: File) {
    if (!args.activeProjectId) {
      toast.error('Сначала выберите или создайте проект');
      return;
    }
    const file = fileOverride ?? args.fileRef.current?.files?.[0];
    if (!file) {
      toast.error('Выберите PDF файл');
      return;
    }
    args.setUploading(true);
    try {
      await api.projects.upload(args.activeProjectId, file, 'web');
      toast.success('Документ загружен');
      if (args.fileRef.current) args.fileRef.current.value = '';
      await args.loadProject(args.activeProjectId);
    } catch (error) {
      toast.error(`Не удалось загрузить PDF: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      args.setUploading(false);
    }
  }

  async function handleImportInbox() {
    if (!args.activeProjectId) {
      toast.error('Сначала выберите или создайте проект');
      return;
    }
    if (!args.selectedInboxPath) {
      toast.error('В FileBrowser inbox нет PDF');
      return;
    }
    args.setImportingInbox(true);
    try {
      await api.filebrowser.importToProject(args.activeProjectId, args.selectedInboxPath);
      toast.success('PDF прикреплен из FileBrowser');
      await args.loadProject(args.activeProjectId);
      await args.loadInboxFiles(true);
    } catch (error) {
      toast.error(`Не удалось прикрепить PDF: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      args.setImportingInbox(false);
    }
  }

  async function handleUpdateScope(nextScope: Scope) {
    args.setScope(nextScope);
    if (!args.activeProjectId) return;
    try {
      await api.projects.updateScope(args.activeProjectId, nextScope);
      args.setProject((current: any) => current ? { ...current, scope: nextScope } : current);
    } catch (error) {
      toast.error(`Не удалось обновить область: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function handleSaveInstructions() {
    if (!args.activeProjectId) {
      toast.error('Сначала выберите или создайте проект');
      return;
    }
    await persistInstructions(true);
  }

  async function handleExtract() {
    if (!args.canExtract) {
      toast.error('Сначала загрузите PDF');
      return;
    }
    const parsedPageFrom = args.pageFrom.trim() ? Number(args.pageFrom) : null;
    const parsedPageTo = args.pageTo.trim() ? Number(args.pageTo) : null;
    if (
      (parsedPageFrom !== null && (!Number.isInteger(parsedPageFrom) || parsedPageFrom < 1)) ||
      (parsedPageTo !== null && (!Number.isInteger(parsedPageTo) || parsedPageTo < 1))
    ) {
      toast.error('Укажите страницы целыми числами от 1');
      return;
    }
    if (parsedPageFrom !== null && parsedPageTo !== null && parsedPageFrom > parsedPageTo) {
      toast.error('Начальная страница не может быть больше конечной');
      return;
    }
    const instructionsSaved = await persistInstructions(false);
    if (!instructionsSaved) return;
    args.setRunningExtract(true);
    args.setActiveExtractionJob(null);
    args.setWorkflow((current) => ({ ...current, step: 'analysis' }));
    try {
      const result = await api.projects.startExtractJob(args.activeProjectId, {
        page_from: parsedPageFrom,
        page_to: parsedPageTo,
        mode: args.extractionMode,
      });
      args.setWorkflow((current) => ({ ...current, activeJobId: result.job_id, step: 'analysis' }));
      toast.success('Разбор поставлен в очередь');
    } catch (error) {
      args.setRunningExtract(false);
      toast.error(`Разбор не выполнился: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function handleBuildBom() {
    if (!args.canBuildBom) {
      toast.error('Сначала разберите PDF и проверьте найденные позиции');
      return;
    }
    args.setBuildingBom(true);
    try {
      const result = await api.bom.build(args.activeProjectId, args.selectedDocumentId || undefined);
      args.setBom(result);
      args.setWorkflow((current) => ({ ...current, step: 'result' }));
      toast.success('Спецификация собрана');
    } catch (error) {
      toast.error(`Не удалось собрать спецификацию: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      args.setBuildingBom(false);
    }
  }

  async function handleBuildEstimate() {
    if (!args.canBuildEstimate) {
      toast.error('Сначала соберите BOM');
      return;
    }
    const parsedAssemblyMultiplier = Number(args.assemblyMultiplier);
    if (!Number.isFinite(parsedAssemblyMultiplier) || parsedAssemblyMultiplier <= 0) {
      toast.error('Коэффициент сборки должен быть числом больше 0');
      return;
    }
    const normalizedOverrides = Object.entries(args.priceOverrides).reduce<Record<string, number>>((acc, [key, value]) => {
      const trimmedKey = key.trim();
      const trimmedValue = value.trim();
      if (!trimmedKey || !trimmedValue) return acc;
      const parsed = Number(trimmedValue);
      if (!Number.isFinite(parsed) || parsed < 0) return acc;
      acc[trimmedKey] = parsed;
      return acc;
    }, {});
    args.setPricingEstimate(true);
    try {
      const result = await api.estimate.build(args.activeProjectId, {
        assembly_multiplier: parsedAssemblyMultiplier,
        price_overrides: normalizedOverrides,
        notes: args.analysisInstructions,
      }, args.selectedDocumentId || undefined);
      args.setEstimate(result);
      args.setBom(await api.bom.get(args.activeProjectId, args.selectedDocumentId || undefined));
      args.setWorkflow((current) => ({ ...current, step: 'result' }));
      toast.success('Расчет готов');
    } catch (error) {
      toast.error(`Не удалось посчитать: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      args.setPricingEstimate(false);
    }
  }

  async function handleExport(format: 'xlsx' | 'csv' | 'json') {
    if (!args.canExport) {
      toast.error('Сначала соберите BOM');
      return;
    }
    try {
      await api.export.download(args.activeProjectId, format, args.selectedDocumentId || undefined);
      toast.success(`Файл ${format} скачан`);
    } catch (error) {
      toast.error(`Не удалось скачать файл: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function handleSetEntityReviewStatus(nextStatus: 'draft' | 'reviewed' | 'rejected') {
    if (!args.activeProjectId || !args.selectedEntity) return;
    args.setSavingEntity(true);
    try {
      const updated = await api.entities.update(args.activeProjectId, args.selectedEntity.entity_id, {
        review_status: nextStatus,
      }, args.selectedDocumentId || undefined);
      args.setEntities((current) => current.map((item) => (item.entity_id === updated.entity_id ? updated : item)));
      args.setEntityForm((current) => ({ ...current, review_status: updated.review_status || nextStatus }));
      if (nextStatus !== 'draft') {
        const nextDraft = args.reviewEntities.find(
          (item) => item.entity_id !== updated.entity_id && item.review_status === 'draft',
        ) ?? null;
        if (nextDraft) {
          openEntity(nextDraft);
        } else {
          args.setWorkflow((current) => ({
            ...current,
            selectedEntityId: '',
            step: 'result',
          }));
        }
      }
      toast.success(`Статус обновлён: ${args.reviewStatusLabel(updated.review_status || nextStatus)}`);
    } catch (error) {
      toast.error(`Не удалось обновить статус: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      args.setSavingEntity(false);
    }
  }

  async function handleSaveEntity() {
    if (!args.activeProjectId || !args.selectedEntity) return;
    const qty = Number(args.entityForm.qty);
    if (!Number.isInteger(qty) || qty < 1) {
      toast.error('Количество должно быть целым числом от 1');
      return;
    }
    args.setSavingEntity(true);
    try {
      const updated = await api.entities.update(args.activeProjectId, args.selectedEntity.entity_id, {
        designation: args.entityForm.designation.trim(),
        name: args.entityForm.name.trim(),
        qty,
        review_status: args.entityForm.review_status,
      }, args.selectedDocumentId || undefined);
      args.setEntities((current) => current.map((item) => (item.entity_id === updated.entity_id ? updated : item)));
      if ((updated.review_status === 'reviewed' || updated.review_status === 'rejected')) {
        const nextDraft = args.reviewEntities.find(
          (item) => item.entity_id !== updated.entity_id && item.review_status === 'draft',
        ) ?? null;
        if (!nextDraft) {
          args.setWorkflow((current) => ({
            ...current,
            selectedEntityId: '',
            step: 'result',
          }));
        }
      }
      toast.success('Позиция обновлена');
    } catch (error) {
      toast.error(`Не удалось сохранить позицию: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      args.setSavingEntity(false);
    }
  }

  async function handleCreateEntity() {
    if (!args.activeProjectId) {
      toast.error('Сначала выберите проект');
      return;
    }
    if (!args.manualEntityForm.name.trim() && !args.manualEntityForm.designation.trim()) {
      toast.error('Заполните название или обозначение');
      return;
    }
    const qty = Number(args.manualEntityForm.qty);
    if (!Number.isInteger(qty) || qty < 1) {
      toast.error('Количество должно быть целым числом от 1');
      return;
    }
    args.setCreatingEntity(true);
    try {
      const created = await api.entities.create(args.activeProjectId, {
        entity_type: args.manualEntityForm.entity_type,
        designation: args.manualEntityForm.designation.trim(),
        name: args.manualEntityForm.name.trim(),
        qty,
        params: {},
        review_status: 'reviewed',
      }, args.selectedDocumentId || undefined);
      args.setEntities((current) => [created, ...current]);
      args.setWorkflow((current) => ({
        ...current,
        selectedEntityId: created.entity_id,
        step: 'analysis',
      }));
      args.setManualEntityForm((current) => ({
        entity_type: current.entity_type,
        designation: '',
        name: '',
        qty: '1',
      }));
      toast.success('Ручная строка добавлена');
    } catch (error) {
      toast.error(`Не удалось добавить строку: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      args.setCreatingEntity(false);
    }
  }

  async function handleAnswerClarification(clarificationId: string, optionId: string) {
    if (!args.activeProjectId || !args.selectedDocumentId) return;
    args.setAnsweringClarificationId(clarificationId);
    try {
      const updated = await api.clarifications.answer(
        args.activeProjectId,
        clarificationId,
        { selected_option: optionId },
        args.selectedDocumentId,
      );
      args.setClarifications((current) =>
        current.map((item) => (item.clarification_id === updated.clarification_id ? updated : item)),
      );
    } catch (error) {
      toast.error(`Не удалось сохранить ответ: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      args.setAnsweringClarificationId('');
    }
  }

  async function handleApplyClarifications() {
    if (!args.activeProjectId || !args.selectedDocumentId) return;
    const unresolved = args.clarifications.filter((item) => item.status === 'open');
    if (unresolved.length) {
      toast.error('Сначала ответьте на все открытые уточняющие вопросы');
      return;
    }
    args.setApplyingClarifications(true);
    try {
      const payload = await api.clarifications.apply(args.activeProjectId, {
        document_id: args.selectedDocumentId,
        job_id: args.activeJobStatus === 'needs_clarification' ? args.activeJobId || undefined : undefined,
      });
      await args.loadProject(args.activeProjectId);
      args.setWorkflow((current) => ({
        ...current,
        step: 'analysis',
      }));
      toast.success(
        payload.applied_count > 0
          ? `Уточнения применены: добавлено ${payload.applied_count} поз.`
          : 'Уточнения применены',
      );
    } catch (error) {
      toast.error(`Не удалось применить уточнения: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      args.setApplyingClarifications(false);
    }
  }

  async function handleApproveVisible() {
    if (!args.activeProjectId || !args.selectedDocumentId) return;
    const targetIds = args.reviewEntities
      .filter((item) => item.review_status === 'draft')
      .map((item) => item.entity_id);
    if (!targetIds.length) {
      toast.message('Черновиков для подтверждения не осталось');
      args.setWorkflow((current) => ({ ...current, step: 'result', selectedEntityId: '' }));
      return;
    }
    args.setApprovingVisible(true);
    try {
      const payload = await api.entities.bulkReview(
        args.activeProjectId,
        {
          entity_ids: targetIds,
          review_status: 'reviewed',
        },
        args.selectedDocumentId || undefined,
      );
      const updatedById = new Map(payload.entities.map((item) => [item.entity_id, item]));
      args.setEntities((current) => current.map((item) => updatedById.get(item.entity_id) ?? item));
      args.setWorkflow((current) => ({
        ...current,
        selectedEntityId: '',
        step: 'result',
      }));
      toast.success(`Подтверждено позиций: ${payload.updated_count}`);
    } catch (error) {
      toast.error(`Не удалось подтвердить позиции: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      args.setApprovingVisible(false);
    }
  }

  return {
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
  };
}
