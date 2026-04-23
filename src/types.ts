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

export type ExtractResult = {
  entities_count: number;
  clarifications_count: number;
  relations_count: number;
  type_distribution: Record<string, number>;
  scope: string;
  job_id: string | null;
  page_from: number | null;
  page_to: number | null;
  pages_processed: number[];
};

export type ExtractionMode = 'code' | 'agent' | 'combined';

export type ExtractionJobStart = {
  job_id: string;
  status: string;
  mode: ExtractionMode;
  page_from: number | null;
  page_to: number | null;
};

export type DocumentRecord = {
  document_id: string;
  filename: string;
  source_channel: 'web' | 'telegram' | 'folder';
  uploaded_at: string;
  job_ids: string[];
};

export type FileBrowserInboxFile = {
  path: string;
  filename: string;
  size: number;
  modified_at: number;
};

export type FileBrowserPriceFile = {
  path: string;
  filename: string;
  size: number;
  modified_at: number;
  extension: string;
  supported_for_catalog_import: boolean;
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
  mode: ExtractionMode;
  page_from: number | null;
  page_to: number | null;
  progress: number;
  current_stage: string;
  error: string;
  result: Partial<ExtractResult>;
  artifact_refs: string[];
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
  review_status: string;
  confidence: number;
  sources: SourceEvidence[];
  flags: string[];
};

export type ClarificationOption = {
  option_id: string;
  label: string;
  value: string;
  help_text: string;
};

export type ClarificationCandidateEntity = {
  entity_type: string | null;
  designation: string;
  name: string;
  qty: number;
  params: Record<string, unknown>;
  confidence: number;
  flags: string[];
};

export type ClarificationItem = {
  clarification_id: string;
  document_id: string;
  job_id: string;
  kind: string;
  status: string;
  question: string;
  options: ClarificationOption[];
  selected_option: string;
  answer_payload: Record<string, unknown>;
  source_pages: number[];
  source_snippets: string[];
  candidate_entity: ClarificationCandidateEntity | null;
  created_at: string;
  resolved_at: string | null;
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

export type SupplierCatalogItem = {
  item_id: string;
  supplier_sku: string;
  manufacturer: string;
  manufacturer_sku: string;
  name_raw: string;
  name_normalized: string;
  category: string;
  unit: string;
  attributes: Record<string, string>;
  source_url: string;
  is_active: boolean;
  updated_at: string;
};

export type SupplierCatalogPrice = {
  price_id: string;
  item_id: string;
  unit_price: number;
  currency: string;
  min_qty: number;
  in_stock: boolean | null;
  valid_at: string;
  updated_at: string;
};

export type SupplierCatalog = {
  catalog_id: string;
  source_id: string;
  supplier_name: string;
  reference: string;
  created_at: string;
  updated_at: string;
  items: SupplierCatalogItem[];
  prices: SupplierCatalogPrice[];
};

export type SupplierCatalogSummary = {
  catalog_id: string;
  source_id: string;
  supplier_name: string;
  reference: string;
  item_count: number;
  price_count: number;
  created_at: string;
  updated_at: string;
};

export type SupplierCatalogImportPreview = {
  filename: string;
  headers: string[];
  row_count: number;
  import_ready_row_count: number;
  skipped_row_count: number;
  sample_rows: Record<string, string>[];
  suggested_mapping: Record<string, string>;
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
  agent_instructions: string;
  extraction_instructions: string;
  analysis_instructions: string;
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
  unit_price?: number | null;
  line_cost?: number | null;
  price_source_id?: string;
  price_source_name?: string;
  price_override?: number | null;
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
