export type ProjectSummary = {
  project_id: string;
  name: string;
  created: string;
  scope: string;
  documents_count: number;
  jobs_count: number;
  price_sources_count: number;
  latest_job_status?: string | null;
  latest_job_updated_at?: string | null;
};

export type DocumentRecord = {
  document_id: string;
  filename: string;
  source_channel: 'web' | 'telegram' | 'folder';
  uploaded_at: string;
  job_ids: string[];
};

export type JobStep = {
  status: string;
  at: string;
  note: string;
};

export type Job = {
  job_id: string;
  project_id: string;
  document_id: string;
  scope: string;
  source_channel: 'web' | 'telegram' | 'folder';
  status: string;
  created_at: string;
  updated_at: string;
  steps: JobStep[];
};

export type SourceEvidence = {
  raw_id: string;
  page: number;
  bbox: [number, number, number, number] | null;
  raw_text: string;
  source_type: string;
  extractor: string;
};

export type Entity = {
  entity_id: string;
  entity_type: string;
  designation: string;
  name: string;
  params: Record<string, unknown>;
  qty: number;
  confidence: number;
  sources: SourceEvidence[];
  flags: string[];
};

export type PreviewCandidate = {
  entity_id: string;
  entity_type: string;
  designation: string;
  name: string;
  page: number | null;
  bbox: [number, number, number, number] | null;
  score: number;
  confidence: number;
  sources_count: number;
  flags: string[];
  reasons: string[];
};

export type PreviewRun = {
  preview_id: string;
  project_id: string;
  query: string;
  target_hint: string;
  notes?: string;
  scope: string;
  page_from: number | null;
  page_to: number | null;
  created_at: string;
  candidates: PreviewCandidate[];
};

export type SelectionRecord = {
  selection_id: string;
  project_id: string;
  preview_id: string;
  selected_entity_ids: string[];
  scope: string;
  notes: string;
  created_at: string;
};

export type PriceSource = {
  source_id: string;
  name: string;
  source_type: string;
  reference: string;
  priority: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  notes: string;
};

export type PriceCatalogEntry = {
  entity_type: string;
  unit_price: number;
  currency: string;
  designation_contains: string[];
  name_contains: string[];
  param_contains: Record<string, string>;
  notes: string;
};

export type PriceCatalog = {
  source_id: string;
  source_name: string;
  source_type: string;
  source_priority: number;
  reference: string;
  created_at: string;
  updated_at: string;
  entries: PriceCatalogEntry[];
  entry_count?: number;
};

export type PriceCatalogSummary = Omit<PriceCatalog, 'entries'> & {
  entry_count: number;
};

export type ArtifactSummary = {
  artifact_name: string;
  exists: boolean;
};

export type ArtifactDetail = {
  project_id: string;
  artifact_name: string;
  data: unknown;
};

export type ProjectMeta = {
  project_id: string;
  name: string;
  created: string;
  scope: string;
  documents: DocumentRecord[];
  jobs: Job[];
  price_sources: PriceSource[];
  preview_runs: PreviewRun[];
  selection_records: SelectionRecord[];
};

export type BOMItem = {
  entity_type: string;
  designation: string;
  name: string;
  params: Record<string, unknown>;
  qty: number;
  unit: string;
  entity_ids: string[];
  source_type: string;
  origin: string;
  review_status: string;
  confidence: number;
  // UI helper fields (not in original API but used in editing)
  id: string; 
  article?: string;
  manufacturer?: string;
  price: number;
  total: number;
};

export type BOM = {
  items: BOMItem[];
  total_items: number;
  total_cost: number | null;
};

export type Estimate = {
  equipment_cost: number;
  assembly_cost: number;
  total_cost: number;
  pricing_model: string;
  confidence: number;
  notes: string[];
};

export type EstimateRequest = {
  assembly_multiplier: number;
  price_overrides: Record<string, number>;
  notes: string;
};

export type WorkflowStep = 'upload' | 'config' | 'analysis' | 'result';
export type AnalysisMode = 'ai' | 'basic';

export interface ProjectState {
  id: string;
  name: string;
  currentStep: WorkflowStep;
  analysisMode: AnalysisMode;
  pdfFile: File | null;
  pagesRange: string;
  instructions: string;
  status: 'idle' | 'processing' | 'error' | 'success';
  statusMessage: string;
  error?: string;
  results?: BOMItem[];
}
