import type {
  ArtifactDetail,
  ArtifactSummary,
  BOM,
  ClarificationItem,
  Estimate,
  Entity,
  ExtractionJobStart,
  ExtractionMode,
  ExtractResult,
  FileBrowserInboxFile,
  FileBrowserPriceFile,
  Job,
  PriceCatalog,
  PriceCatalogSummary,
  SupplierCatalog,
  SupplierCatalogImportPreview,
  SupplierCatalogSummary,
  PriceSource,
  PreviewRun,
  ProjectMeta,
  ProjectSummary,
  SelectionRecord,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
const GET_CACHE_TTL_MS = 10_000;

type CachedGetEntry<T> = {
  expiresAt: number;
  promise: Promise<T>;
};

const getRequestCache = new Map<string, CachedGetEntry<unknown>>();

function clearCachedGet(prefix: string): void {
  for (const key of getRequestCache.keys()) {
    if (key === prefix || key.startsWith(`${prefix}:`)) {
      getRequestCache.delete(key);
    }
  }
}

function withQuery(path: string, params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

async function errorMessage(response: Response): Promise<string> {
  const fallback = `${response.status} ${response.statusText}`.trim();
  const contentType = response.headers.get('content-type') ?? '';

  try {
    if (contentType.includes('application/json')) {
      const body = await response.json();
      if (typeof body?.detail === 'string') return body.detail;
      if (Array.isArray(body?.detail)) {
        return body.detail
          .map((item: { msg?: string } | string) => (typeof item === 'string' ? item : item.msg ?? String(item)))
          .join('; ');
      }
      return JSON.stringify(body);
    }

    const text = await response.text();
    return text || fallback;
  } catch {
    return fallback;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, init);
  } catch (error) {
    throw new Error(`Сеть недоступна или API не ответил: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!response.ok) {
    throw new Error(await errorMessage(response));
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
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`);
  } catch (error) {
    throw new Error(`Сеть недоступна или API не ответил: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }
  return await response.blob();
}

function cachedGet<T>(cacheKey: string, loader: () => Promise<T>, force = false): Promise<T> {
  const now = Date.now();
  const cached = getRequestCache.get(cacheKey) as CachedGetEntry<T> | undefined;
  if (!force && cached && cached.expiresAt > now) {
    return cached.promise;
  }

  const promise = loader().catch((error) => {
    const current = getRequestCache.get(cacheKey);
    if (current?.promise === promise) {
      getRequestCache.delete(cacheKey);
    }
    throw error;
  });

  getRequestCache.set(cacheKey, {
    expiresAt: now + GET_CACHE_TTL_MS,
    promise,
  });

  return promise;
}

export const api = {
  health: () => request<{ status: string }>('/health'),
  projects: {
    list: (force = false) => cachedGet('projects:list', () => request<ProjectSummary[]>('/projects'), force),
    get: (projectId: string) => request<ProjectMeta>(`/projects/${encodeURIComponent(projectId)}`),
    create: async (name: string, scope: string) => {
      const created = await request<ProjectSummary>(withQuery('/projects', { name, scope }), { method: 'POST' });
      clearCachedGet('projects');
      return created;
    },
    delete: async (projectId: string) => {
      await request<void>(`/projects/${encodeURIComponent(projectId)}`, { method: 'DELETE' });
      clearCachedGet('projects');
    },
    updateScope: (projectId: string, scope: string) =>
      request<{ project_id: string; scope: string }>(
        withQuery(`/projects/${encodeURIComponent(projectId)}/scope`, { scope }),
        { method: 'PUT' },
      ),
    updateInstructions: (
      projectId: string,
      payload: {
        instructions?: string;
        extraction_instructions?: string;
        analysis_instructions?: string;
      },
    ) =>
      request<{
        project_id: string;
        agent_instructions: string;
        extraction_instructions: string;
        analysis_instructions: string;
      }>(
        `/projects/${encodeURIComponent(projectId)}/instructions`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      ),
    upload: (projectId: string, file: File, sourceChannel: string) => {
      const form = new FormData();
      form.append('file', file);
      return request<{ document_id: string; job_id: string }>(
        withQuery(`/projects/${encodeURIComponent(projectId)}/upload`, { source_channel: sourceChannel }),
        { method: 'POST', body: form },
      );
    },
    runExtract: (projectId: string, pageRange?: { page_from: number | null; page_to: number | null }) =>
      request<ExtractResult>(
        withQuery(`/projects/${encodeURIComponent(projectId)}/extract`, {
          page_from: pageRange?.page_from,
          page_to: pageRange?.page_to,
        }),
        { method: 'POST' },
      ),
    startExtractJob: (
      projectId: string,
      payload: {
        page_from: number | null;
        page_to: number | null;
        mode: ExtractionMode;
      },
    ) =>
      request<ExtractionJobStart>(
        withQuery(`/projects/${encodeURIComponent(projectId)}/extract/jobs`, {
          page_from: payload.page_from,
          page_to: payload.page_to,
          mode: payload.mode,
        }),
        { method: 'POST' },
      ),
    getExtractJob: (projectId: string, jobId: string) =>
      request<Job>(`/projects/${encodeURIComponent(projectId)}/extract/jobs/${encodeURIComponent(jobId)}`),
  },
  filebrowser: {
    inbox: (force = false) => cachedGet('filebrowser:inbox', () => request<FileBrowserInboxFile[]>('/filebrowser/inbox'), force),
    prices: (force = false) => cachedGet('filebrowser:prices', () => request<FileBrowserPriceFile[]>('/filebrowser/prices'), force),
    importToProject: (projectId: string, path: string) =>
      request<{ document_id: string; job_id: string; filename: string; source_channel: string }>(
        withQuery(`/filebrowser/projects/${encodeURIComponent(projectId)}/import`, { path }),
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
    list: (projectId: string, documentId?: string) =>
      request<Entity[]>(withQuery(`/projects/${encodeURIComponent(projectId)}/entities`, { document_id: documentId })),
    create: (
      projectId: string,
      payload: Pick<Entity, 'entity_type' | 'designation' | 'name' | 'params' | 'qty' | 'review_status'>,
      documentId?: string,
    ) =>
      request<Entity>(withQuery(`/projects/${encodeURIComponent(projectId)}/entities`, { document_id: documentId }), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    update: (
      projectId: string,
      entityId: string,
      payload: Partial<Pick<Entity, 'designation' | 'name' | 'params' | 'qty' | 'review_status'>>,
      documentId?: string,
    ) =>
      request<Entity>(withQuery(`/projects/${encodeURIComponent(projectId)}/entities/${encodeURIComponent(entityId)}`, { document_id: documentId }), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    bulkReview: (
      projectId: string,
      payload: {
        entity_ids: string[];
        review_status: string;
      },
      documentId?: string,
    ) =>
      request<{
        updated_count: number;
        entities: Entity[];
      }>(withQuery(`/projects/${encodeURIComponent(projectId)}/entities/review-bulk`, { document_id: documentId }), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
  },
  clarifications: {
    list: (projectId: string, documentId: string) =>
      request<ClarificationItem[]>(
        withQuery(`/projects/${encodeURIComponent(projectId)}/clarifications`, { document_id: documentId }),
      ),
    answer: (
      projectId: string,
      clarificationId: string,
      payload: {
        selected_option: string;
        answer_payload?: Record<string, unknown>;
      },
      documentId: string,
    ) =>
      request<ClarificationItem>(
        withQuery(
          `/projects/${encodeURIComponent(projectId)}/clarifications/${encodeURIComponent(clarificationId)}/answer`,
          { document_id: documentId },
        ),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      ),
    apply: (
      projectId: string,
      payload: {
        document_id: string;
        job_id?: string;
      },
    ) =>
      request<{
        document_id: string;
        job_id: string | null;
        applied_count: number;
        entities_count: number;
        clarifications_count: number;
      }>(
        withQuery(`/projects/${encodeURIComponent(projectId)}/clarifications/apply`, {
          document_id: payload.document_id,
          job_id: payload.job_id,
        }),
        { method: 'POST' },
      ),
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
    listSupplierCatalogs: (projectId: string) =>
      request<SupplierCatalogSummary[]>(`/projects/${encodeURIComponent(projectId)}/supplier-catalogs`),
    getSupplierCatalog: (projectId: string, catalogId: string) =>
      request<SupplierCatalog>(`/projects/${encodeURIComponent(projectId)}/supplier-catalogs/${encodeURIComponent(catalogId)}`),
    createSupplierCatalog: (projectId: string, payload: {
      supplier_name: string;
      reference: string;
      priority: number;
      notes: string;
      items: Array<{
        supplier_sku: string;
        manufacturer: string;
        manufacturer_sku: string;
        name_raw: string;
        name_normalized: string;
        category: string;
        unit: string;
        attributes: Record<string, string>;
        source_url: string;
        is_active?: boolean;
      }>;
      prices: Array<{
        item_ref: string;
        unit_price: number;
        currency?: string;
        min_qty?: number;
        in_stock?: boolean | null;
        valid_at?: string;
      }>;
    }) =>
      request<SupplierCatalogSummary>(`/projects/${encodeURIComponent(projectId)}/supplier-catalogs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    previewSupplierCatalogImport: async (projectId: string, file: File) => {
      const form = new FormData();
      form.append('file', file);
      return request<SupplierCatalogImportPreview>(`/projects/${encodeURIComponent(projectId)}/supplier-catalog-imports/preview`, {
        method: 'POST',
        body: form,
      });
    },
    previewSupplierCatalogImportFromFileBrowser: (projectId: string, path: string) =>
      request<SupplierCatalogImportPreview>(`/projects/${encodeURIComponent(projectId)}/supplier-catalog-imports/preview-from-filebrowser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      }),
    commitSupplierCatalogImport: async (
      projectId: string,
      payload: {
        supplier_name: string;
        reference: string;
        priority: number;
        notes: string;
        mapping_json: string;
      },
      file: File,
    ) => {
      const form = new FormData();
      form.append('supplier_name', payload.supplier_name);
      form.append('reference', payload.reference);
      form.append('priority', String(payload.priority));
      form.append('notes', payload.notes);
      form.append('mapping_json', payload.mapping_json);
      form.append('file', file);
      return request<SupplierCatalogSummary>(`/projects/${encodeURIComponent(projectId)}/supplier-catalog-imports/commit`, {
        method: 'POST',
        body: form,
      });
    },
    commitSupplierCatalogImportFromFileBrowser: (
      projectId: string,
      payload: {
        supplier_name: string;
        path: string;
        mapping: Record<string, string>;
        reference: string;
        priority: number;
        notes: string;
      },
    ) =>
      request<SupplierCatalogSummary>(`/projects/${encodeURIComponent(projectId)}/supplier-catalog-imports/commit-from-filebrowser`, {
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
    build: (projectId: string, documentId?: string) =>
      request<BOM>(withQuery(`/projects/${encodeURIComponent(projectId)}/bom`, { document_id: documentId }), { method: 'POST' }),
    get: (projectId: string, documentId?: string) =>
      request<BOM>(withQuery(`/projects/${encodeURIComponent(projectId)}/bom`, { document_id: documentId })),
  },
  estimate: {
    build: (projectId: string, payload?: {
      assembly_multiplier: number;
      price_overrides: Record<string, number>;
      notes: string;
    }, documentId?: string) =>
      request<Estimate>(withQuery(`/projects/${encodeURIComponent(projectId)}/estimate`, { document_id: documentId }), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload ?? {
          assembly_multiplier: 2,
          price_overrides: {},
          notes: '',
        }),
      }),
    get: (projectId: string, documentId?: string) =>
      request<Estimate>(withQuery(`/projects/${encodeURIComponent(projectId)}/estimate`, { document_id: documentId })),
  },
  export: {
    download: async (projectId: string, format: 'xlsx' | 'csv' | 'json', documentId?: string) => {
      const blob = await requestBlob(withQuery(`/projects/${encodeURIComponent(projectId)}/export`, { format, document_id: documentId }));
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = documentId ? `${projectId}_${documentId}_bom.${format}` : `${projectId}_bom.${format}`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    },
  },
};
