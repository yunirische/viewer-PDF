import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';

import { api } from '../../services/api';
import type { BOM, ClarificationItem, Entity, Estimate, FileBrowserInboxFile, Job, ProjectMeta, ProjectSummary, SelectionRecord } from '../../types';
import type { Scope, WorkflowSession } from './types';

type UseWorkflowDataArgs = {
  activeProjectId: string;
  jobs: Job[];
  workflow: WorkflowSession;
  setWorkflow: Dispatch<SetStateAction<WorkflowSession>>;
  setProjects: Dispatch<SetStateAction<ProjectSummary[]>>;
  setProject: Dispatch<SetStateAction<ProjectMeta | null>>;
  setJobs: Dispatch<SetStateAction<Job[]>>;
  setEntities: Dispatch<SetStateAction<Entity[]>>;
  setClarifications: Dispatch<SetStateAction<ClarificationItem[]>>;
  setInboxFiles: Dispatch<SetStateAction<FileBrowserInboxFile[]>>;
  setSelection: Dispatch<SetStateAction<SelectionRecord | null>>;
  setBom: Dispatch<SetStateAction<BOM | null>>;
  setEstimate: Dispatch<SetStateAction<Estimate | null>>;
  setExtractionInstructions: Dispatch<SetStateAction<string>>;
  setAnalysisInstructions: Dispatch<SetStateAction<string>>;
  setCustomScopeText: Dispatch<SetStateAction<string>>;
  setScope: Dispatch<SetStateAction<Scope>>;
  setViewerPage: Dispatch<SetStateAction<number | null>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setLoadingInbox: Dispatch<SetStateAction<boolean>>;
  setInboxError: Dispatch<SetStateAction<string>>;
  setSelectedInboxPath: Dispatch<SetStateAction<string>>;
  setActiveExtractionJob: Dispatch<SetStateAction<Job | null>>;
  setRunningExtract: Dispatch<SetStateAction<boolean>>;
  createWorkflowSession: (projectId?: string) => WorkflowSession;
  sortJobsNewestFirst: (items: Job[]) => Job[];
  summarizeJobIssue: (job: Job | null | undefined) => { title: string; detail: string; action: string; tone: string } | null;
  statusLabel: (status: string | null | undefined) => string;
  rememberViewerPage: (page: number | null) => void;
};

function splitExtractionInstructions(value: string): {
  extractionInstructions: string;
  customScopeText: string;
} {
  const match = value.match(/\n\nСвоя область поиска:\s*([\s\S]*)$/u);
  if (!match) {
    return {
      extractionInstructions: value,
      customScopeText: '',
    };
  }
  return {
    extractionInstructions: value.slice(0, match.index).trim(),
    customScopeText: (match[1] || '').trim(),
  };
}

export function useWorkflowData(args: UseWorkflowDataArgs) {
  const {
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
    rememberViewerPage,
  } = args;
  const projectLoadRequestRef = useRef(0);
  const inboxLoadRequestRef = useRef(0);
  const entityLoadRequestRef = useRef(0);
  const resultLoadRequestRef = useRef(0);
  const activeProjectIdRef = useRef(activeProjectId);
  const initializedRef = useRef(false);
  const loadProjectRef = useRef<((initialId?: string, force?: boolean) => Promise<void>) | null>(null);
  const loadInboxFilesRef = useRef<((force?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  const loadProject = useCallback(async (projectId: string) => {
    const requestId = projectLoadRequestRef.current + 1;
    projectLoadRequestRef.current = requestId;
    setWorkflow((current) => ({
      ...createWorkflowSession(projectId),
      extractionMode: current.extractionMode,
    }));
    setProject(null);
    setJobs([]);
    setEntities([]);
    setClarifications([]);
    setSelection(null);
    setBom(null);
    setEstimate(null);
    setExtractionInstructions('');
    setAnalysisInstructions('');
    setViewerPage(null);
    setActiveExtractionJob(null);
    setRunningExtract(false);
    try {
      const [meta, jobList] = await Promise.all([
        api.projects.get(projectId),
        api.jobs.list(projectId),
      ]);
      if (projectLoadRequestRef.current !== requestId) return;
      const sortedJobList = sortJobsNewestFirst(jobList);

      setProject(meta);
      setJobs(sortedJobList);
      setEntities([]);
      setClarifications([]);
      setScope(meta.scope as Scope);
      const persistedExtractionInstructions = meta.extraction_instructions ?? meta.agent_instructions ?? '';
      const normalizedInstructions = splitExtractionInstructions(persistedExtractionInstructions);
      setExtractionInstructions(normalizedInstructions.extractionInstructions);
      setAnalysisInstructions(meta.analysis_instructions ?? '');
      setCustomScopeText(normalizedInstructions.customScopeText);
      const nextDocumentId = meta.documents.at(-1)?.document_id ?? meta.documents[0]?.document_id ?? '';
      setWorkflow((current) => ({
        ...current,
        projectId,
        documentId: nextDocumentId,
        step: nextDocumentId ? 'config' : 'upload',
        activeJobId: '',
        selectedEntityId: '',
        reviewFilter: 'all',
        quickQuery: '',
        pageFrom: '',
        pageTo: '',
      }));
      const storedPage = nextDocumentId
        ? Number(sessionStorage.getItem(`pdf_spec.viewer_page.${projectId}.${nextDocumentId}`))
        : 0;
      setViewerPage(Number.isInteger(storedPage) && storedPage > 0 ? storedPage : null);
      setSelection(meta.selection_records.at(-1) ?? null);
      setBom(null);
      setEstimate(null);
    } catch (error) {
      if (projectLoadRequestRef.current !== requestId) return;
      toast.error(`Не удалось загрузить проект: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [
    createWorkflowSession,
    setWorkflow,
    setProject,
    setJobs,
    setEntities,
    setSelection,
    setBom,
    setEstimate,
    setExtractionInstructions,
    setAnalysisInstructions,
    setCustomScopeText,
    setViewerPage,
    setActiveExtractionJob,
    setRunningExtract,
    sortJobsNewestFirst,
    setScope,
  ]);

  const loadInboxFiles = useCallback(async (force = false) => {
    const requestId = inboxLoadRequestRef.current + 1;
    inboxLoadRequestRef.current = requestId;
    setLoadingInbox(true);
    setInboxError('');
    try {
      const files = await api.filebrowser.inbox(force);
      if (inboxLoadRequestRef.current !== requestId) return;
      setInboxFiles(files);
      setSelectedInboxPath((current) => {
        if (current && files.some((item) => item.path === current)) return current;
        return files[0]?.path ?? '';
      });
    } catch (error) {
      if (inboxLoadRequestRef.current !== requestId) return;
      setInboxFiles([]);
      setSelectedInboxPath('');
      setInboxError(error instanceof Error ? error.message : String(error));
    } finally {
      if (inboxLoadRequestRef.current === requestId) {
        setLoadingInbox(false);
      }
    }
  }, [setInboxError, setInboxFiles, setLoadingInbox, setSelectedInboxPath]);

  const loadProjects = useCallback(async (initialId?: string, force = false) => {
    setLoading(true);
    try {
      const list = await api.projects.list(force);
      setProjects(list);
      const nextId = initialId !== undefined
        ? initialId
        : (activeProjectIdRef.current || list[0]?.project_id || '');
      if (nextId) await loadProject(nextId);
    } catch (error) {
      toast.error(`Не удалось загрузить проекты: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [loadProject, setLoading, setProjects]);

  useEffect(() => {
    loadProjectRef.current = loadProjects;
    loadInboxFilesRef.current = loadInboxFiles;
  }, [loadInboxFiles, loadProjects]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    loadProjectRef.current?.().catch(() => undefined);
    loadInboxFilesRef.current?.().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!activeProjectId || !workflow.documentId) {
      setEntities([]);
      setClarifications([]);
      setBom(null);
      setEstimate(null);
      return;
    }

    const requestId = entityLoadRequestRef.current + 1;
    entityLoadRequestRef.current = requestId;

    async function loadDocumentEntities() {
      try {
        const [entities, clarifications] = await Promise.all([
          api.entities.list(activeProjectId, workflow.documentId),
          api.clarifications.list(activeProjectId, workflow.documentId),
        ]);
        if (entityLoadRequestRef.current !== requestId) return;
        setEntities(entities);
        setClarifications(clarifications);
      } catch (error) {
        if (entityLoadRequestRef.current !== requestId) return;
        setEntities([]);
        setClarifications([]);
        toast.error(`Не удалось загрузить данные разбора для документа: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    loadDocumentEntities().catch(() => undefined);
  }, [activeProjectId, workflow.documentId, setEntities, setBom, setEstimate]);

  useEffect(() => {
    if (!activeProjectId || !workflow.documentId) {
      setBom(null);
      setEstimate(null);
      return;
    }

    const hasDocumentResultContext = jobs.some(
      (job) =>
        job.document_id === workflow.documentId &&
        (job.mode === 'code' || job.mode === 'agent' || job.mode === 'combined') &&
        ['done', 'succeeded', 'needs_review', 'needs_clarification'].includes(job.status),
    );

    if (!hasDocumentResultContext) {
      setBom(null);
      setEstimate(null);
      return;
    }

    const requestId = resultLoadRequestRef.current + 1;
    resultLoadRequestRef.current = requestId;
    setBom(null);
    setEstimate(null);

    async function loadDocumentResultArtifacts() {
      const [bomResult, estimateResult] = await Promise.allSettled([
        api.bom.get(activeProjectId, workflow.documentId),
        api.estimate.get(activeProjectId, workflow.documentId),
      ]);

      if (resultLoadRequestRef.current !== requestId) return;

      if (bomResult.status === 'fulfilled') {
        setBom(bomResult.value);
      } else {
        const message = bomResult.reason instanceof Error ? bomResult.reason.message : String(bomResult.reason);
        if (!message.includes('BOM not built yet') && !message.includes('404')) {
          toast.error(`Не удалось загрузить BOM документа: ${message}`);
        }
      }

      if (estimateResult.status === 'fulfilled') {
        setEstimate(estimateResult.value);
      } else {
        const message = estimateResult.reason instanceof Error ? estimateResult.reason.message : String(estimateResult.reason);
        if (!message.includes('Estimate not calculated yet') && !message.includes('404')) {
          toast.error(`Не удалось загрузить estimate документа: ${message}`);
        }
      }
    }

    loadDocumentResultArtifacts().catch(() => undefined);
  }, [activeProjectId, jobs, workflow.documentId, setBom, setEstimate]);

  useEffect(() => {
    if (!activeProjectId || !workflow.activeJobId) return;

    let cancelled = false;
    let timer: number | undefined;
    const terminalStatuses = new Set(['succeeded', 'done', 'needs_review', 'needs_clarification', 'failed', 'cancelled']);

    async function pollExtractionJob() {
      try {
        const job = await api.projects.getExtractJob(activeProjectId, workflow.activeJobId);
        if (cancelled) return;

        setActiveExtractionJob(job);
        setJobs((current) => [job, ...current.filter((item) => item.job_id !== job.job_id)]);

        if (terminalStatuses.has(job.status)) {
          setRunningExtract(false);
          setWorkflow((current) => ({
            ...current,
            activeJobId: '',
            step: job.status === 'needs_clarification' ? 'clarification' : 'analysis',
          }));

          if (job.status === 'failed') {
            const issue = summarizeJobIssue(job);
            toast.error(issue ? `${issue.title}: ${issue.action}` : `Разбор не выполнился: ${job.error || job.steps.at(-1)?.note || 'ошибка обработки'}`);
            return;
          }

          if (job.status === 'cancelled') {
            const issue = summarizeJobIssue(job);
            toast.message(issue ? `${issue.title}: ${issue.action}` : 'Разбор был остановлен');
            return;
          }

          if (job.status === 'needs_review') {
            const issue = summarizeJobIssue(job);
            toast.warning(issue ? `${issue.title}: ${issue.action}` : 'Разбор требует ручной проверки');
            await loadProject(activeProjectId);
            return;
          }

          if (job.status === 'needs_clarification') {
            toast.warning('Разбор требует уточнения спорных строк перед ручной проверкой');
            await loadProject(activeProjectId);
            return;
          }

          toast.success('Разбор PDF завершен');
          await loadProject(activeProjectId);
          setWorkflow((current) => ({
            ...current,
            step: 'analysis',
          }));
          const firstPage = Array.isArray(job.result?.pages_processed) ? job.result.pages_processed[0] : null;
          if (typeof firstPage === 'number') {
            rememberViewerPage(firstPage);
          }
          return;
        }

        timer = window.setTimeout(pollExtractionJob, 1500);
      } catch (error) {
        if (cancelled) return;
        setRunningExtract(false);
        setWorkflow((current) => ({
          ...current,
          activeJobId: '',
        }));
        toast.error(`Не удалось получить статус разбора: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    timer = window.setTimeout(pollExtractionJob, 500);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [
    activeProjectId,
    workflow.activeJobId,
    loadProject,
    rememberViewerPage,
    setActiveExtractionJob,
    setJobs,
    setRunningExtract,
    setWorkflow,
    summarizeJobIssue,
  ]);

  return {
    loadProject,
    loadInboxFiles,
    loadProjects,
  };
}
