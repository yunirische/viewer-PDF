import type {
  ArtifactDetail,
  ArtifactSummary,
  BOM,
  Estimate,
  Entity,
  Job,
  PriceCatalog,
  PriceCatalogSummary,
  PriceSource,
  PreviewRun,
  ProjectMeta,
  ProjectSummary,
  SelectionRecord,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  return (await response.text()) as T;
}

async function requestBlob(path: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return await response.blob();
}

export const api = {
  health: () => request<{ status: string }>('/health'),
  projects: {
    list: () => request<ProjectSummary[]>('/projects'),
    get: (projectId: string) => request<ProjectMeta>(`/projects/${encodeURIComponent(projectId)}`),
    create: (name: string, scope: string) =>
      request<ProjectSummary>(`/projects?${new URLSearchParams({ name, scope }).toString()}`, { method: 'POST' }),
    updateScope: (projectId: string, scope: string) =>
      request<{ project_id: string; scope: string }>(
        `/projects/${encodeURIComponent(projectId)}/scope?${new URLSearchParams({ scope }).toString()}`,
        { method: 'PUT' },
      ),
    upload: (projectId: string, file: File, sourceChannel: string) => {
      const form = new FormData();
      form.append('file', file);
      return request<{ document_id: string; job_id: string }>(
        `/projects/${encodeURIComponent(projectId)}/upload?${new URLSearchParams({ source_channel: sourceChannel }).toString()}`,
        { method: 'POST', body: form },
      );
    },
    runExtract: (projectId: string) =>
      request<{ entities_count: number; relations_count: number; type_distribution: Record<string, number>; scope: string; job_id: string | null }>(
        `/projects/${encodeURIComponent(projectId)}/extract`,
        { method: 'POST' },
      ),
  },
  documents: {
    fileUrl: (projectId: string, documentId: string) =>
      `${API_BASE}/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(documentId)}/file`,
  },
  jobs: {
    list: (projectId: string) => request<Job[]>(`/projects/${encodeURIComponent(projectId)}/jobs`),
    get: (projectId: string, jobId: string) =>
      request<Job>(`/projects/${encodeURIComponent(projectId)}/jobs/${encodeURIComponent(jobId)}`),
  },
  preview: {
    run: (projectId: string, payload: {
      query: string;
      target_hint: string;
      notes: string;
      scope: string | null;
      page_from: number | null;
      page_to: number | null;
      max_candidates: number;
    }) =>
      request<PreviewRun>(`/projects/${encodeURIComponent(projectId)}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    latest: (projectId: string) => request<PreviewRun>(`/projects/${encodeURIComponent(projectId)}/preview`),
    saveSelection: (projectId: string, payload: {
      preview_id: string;
      selected_entity_ids: string[];
      scope: string | null;
      notes: string;
    }) =>
      request<SelectionRecord>(`/projects/${encodeURIComponent(projectId)}/selection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    latestSelection: (projectId: string) => request<SelectionRecord>(`/projects/${encodeURIComponent(projectId)}/selection`),
  },
  entities: {
    list: (projectId: string) => request<Entity[]>(`/projects/${encodeURIComponent(projectId)}/entities`),
    update: (projectId: string, entityId: string, payload: Partial<Pick<Entity, 'designation' | 'name' | 'params' | 'qty'>>) =>
      request<Entity>(`/projects/${encodeURIComponent(projectId)}/entities/${encodeURIComponent(entityId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
  },
  priceSources: {
    list: (projectId: string) => request<PriceSource[]>(`/projects/${encodeURIComponent(projectId)}/price-sources`),
    listCatalogs: (projectId: string) => request<PriceCatalog[]>(`/projects/${encodeURIComponent(projectId)}/price-sources/catalogs`),
    create: (projectId: string, payload: {
      name: string;
      source_type: string;
      reference: string;
      priority: number;
      notes: string;
    }) =>
      request<PriceSource>(`/projects/${encodeURIComponent(projectId)}/price-sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    createCatalog: (projectId: string, payload: {
      name: string;
      reference: string;
      priority: number;
      notes: string;
      entries: Array<{
        entity_type: string;
        unit_price: number;
        currency: string;
        designation_contains: string[];
        name_contains: string[];
        param_contains: Record<string, string>;
        notes: string;
      }>;
    }) =>
      request<PriceCatalogSummary>(`/projects/${encodeURIComponent(projectId)}/price-sources/catalogs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
  },
  artifacts: {
    list: (projectId: string) => request<ArtifactSummary[]>(`/projects/${encodeURIComponent(projectId)}/artifacts`),
    get: (projectId: string, artifactName: string) =>
      request<ArtifactDetail>(`/projects/${encodeURIComponent(projectId)}/artifacts/${encodeURIComponent(artifactName)}`),
  },
  bom: {
    build: (projectId: string) => request<BOM>(`/projects/${encodeURIComponent(projectId)}/bom`, { method: 'POST' }),
    get: (projectId: string) => request<BOM>(`/projects/${encodeURIComponent(projectId)}/bom`),
  },
  estimate: {
    build: (projectId: string, payload?: {
      assembly_multiplier: number;
      price_overrides: Record<string, number>;
      notes: string;
    }) =>
      request<Estimate>(`/projects/${encodeURIComponent(projectId)}/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload ?? {
          assembly_multiplier: 2,
          price_overrides: {},
          notes: '',
        }),
      }),
    get: (projectId: string) => request<Estimate>(`/projects/${encodeURIComponent(projectId)}/estimate`),
  },
  export: {
    download: async (projectId: string, format: 'xlsx' | 'csv' | 'json') => {
      const blob = await requestBlob(`/projects/${encodeURIComponent(projectId)}/export?${new URLSearchParams({ format }).toString()}`);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `${projectId}_bom.${format}`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    },
  },
};
