import type { RefObject } from 'react';

import type { BOM, ClarificationItem, Entity, Estimate, ExtractionMode, FileBrowserInboxFile, SelectionRecord } from '../../types';

export type Scope = 'all_electrical' | 'panel_only' | 'supply_only' | 'custom';
export type WorkflowStep = 'upload' | 'config' | 'clarification' | 'analysis' | 'result';
export type ReviewFilter = 'all' | 'draft' | 'reviewed' | 'rejected';
export type WorkflowSession = {
  projectId: string;
  documentId: string;
  step: WorkflowStep;
  activeJobId: string;
  extractionMode: ExtractionMode;
  pageFrom: string;
  pageTo: string;
  selectedEntityId: string;
  reviewFilter: ReviewFilter;
  quickQuery: string;
};

export type EntityFormState = {
  entity_type: string;
  designation: string;
  name: string;
  qty: string;
  review_status: string;
};

export type ManualEntityFormState = {
  entity_type: string;
  designation: string;
  name: string;
  qty: string;
};

export type ExtractionIssue = {
  title: string;
  detail: string;
  action: string;
  tone: string;
} | null;

export type UploadSectionProps = {
  currentStep: WorkflowStep;
  canWork: boolean;
  creatingProject: boolean;
  newProjectName: string;
  onProjectNameChange: (value: string) => void;
  onCreateProject: () => void;
  fileRef: RefObject<HTMLInputElement | null>;
  uploading: boolean;
  onUpload: () => void;
  inboxFiles: FileBrowserInboxFile[];
  selectedInboxPath: string;
  onInboxPathChange: (value: string) => void;
  loadingInbox: boolean;
  onRefreshInbox: () => void;
  importingInbox: boolean;
  onImportInbox: () => void;
  inboxError: string;
};

export type ConfigSectionProps = {
  currentStep: WorkflowStep;
  scope: Scope;
  scopeOptions: Scope[];
  scopeLabel: (scope: string) => string;
  onUpdateScope: (scope: Scope) => void;
  pageFrom: string;
  pageTo: string;
  onPageFromChange: (value: string) => void;
  onPageToChange: (value: string) => void;
  pageRangeLabel: string;
  canWork: boolean;
  extractionModeOptions: Array<{
    mode: ExtractionMode;
    title: string;
    text: string;
    enabled: boolean;
  }>;
  extractionMode: ExtractionMode;
  onExtractionModeChange: (mode: ExtractionMode) => void;
  runningExtract: boolean;
  customScopeText: string;
  onCustomScopeTextChange: (value: string) => void;
  extractionInstructions: string;
  onExtractionInstructionsChange: (value: string) => void;
  analysisInstructions: string;
  onAnalysisInstructionsChange: (value: string) => void;
  savingInstructions: boolean;
  onSaveInstructions: () => void;
  canExtract: boolean;
  onExtract: () => void;
};

export type AnalysisSectionProps = {
  currentStep: WorkflowStep;
  runningExtract: boolean;
  processingMessage: string;
  extractionProgress: number;
  extractionIssue: ExtractionIssue;
  activeJobStatus: string | null | undefined;
  activeJobStatusLabel: string;
  activeJobStatusTone: string;
  clarificationRequired: boolean;
  openClarificationsCount: number;
  clarifications: ClarificationItem[];
  answeringClarificationId: string;
  applyingClarifications: boolean;
  onAnswerClarification: (clarificationId: string, optionId: string) => void;
  onApplyClarifications: () => void;
  reviewEntities: Entity[];
  draftCount: number;
  reviewedCount: number;
  rejectedCount: number;
  canOpenResult: boolean;
  onOpenResult: () => void;
  onApproveVisible: () => void;
  approvingVisible: boolean;
  nextDraftEntity: Entity | null;
  onOpenNextEntity: (entity: Entity | null) => void;
  quickQuery: string;
  onQuickQueryChange: (value: string) => void;
  reviewFilter: ReviewFilter;
  onReviewFilterChange: (value: ReviewFilter) => void;
  visibleEntities: Entity[];
  manualEntityForm: ManualEntityFormState;
  onManualEntityFieldChange: (field: 'entity_type' | 'designation' | 'name' | 'qty', value: string) => void;
  creatingEntity: boolean;
  onCreateEntity: () => void;
  selectedEntity: Entity | null;
  onOpenEntity: (entity: Entity) => void;
};

export type ClarificationSectionProps = {
  currentStep: WorkflowStep;
  activeJobStatus: string | null | undefined;
  activeJobStatusLabel: string;
  activeJobStatusTone: string;
  processingMessage: string;
  clarificationRequired: boolean;
  openClarificationsCount: number;
  clarifications: ClarificationItem[];
  answeringClarificationId: string;
  applyingClarifications: boolean;
  onAnswerClarification: (clarificationId: string, optionId: string) => void;
  onApplyClarifications: () => void;
  onOpenAnalysis: () => void;
};

export type ResultSectionProps = {
  currentStep: WorkflowStep;
  canBuildBom: boolean;
  buildingBom: boolean;
  onBuildBom: () => void;
  canBuildEstimate: boolean;
  pricingEstimate: boolean;
  onBuildEstimate: () => void;
  hasBom: boolean;
  bom: BOM | null;
  estimate: Estimate | null;
  reviewEntitiesCount: number;
  equipmentTotal: number | null;
  totalCost: number | null;
  analysisInstructions: string;
  bomPreviewItems: BOM['items'];
  assemblyMultiplier: string;
  onAssemblyMultiplierChange: (value: string) => void;
  priceSourcesCount: number;
  activePriceOverrides: number;
  priceOverrides: Record<string, string>;
  onPriceOverrideChange: (key: string, value: string) => void;
  estimateNotes: string[];
  canExport: boolean;
  onExport: (format: 'xlsx' | 'csv' | 'json') => void;
};

export type DetailRailProps = {
  currentStep: WorkflowStep;
  extractionInstructions: string;
  analysisInstructions: string;
  selection: SelectionRecord | null;
  defaultModeLabel: string;
  runningExtract: boolean;
  analysisModeLabel: string;
  analysisPagesLabel: string;
  draftCount: number;
  reviewedCount: number;
  activeJobStatus: string | null | undefined;
  activeJobStatusLabel: string;
  activeJobStatusTone: string;
  extractionIssue: ExtractionIssue;
  processingMessage: string;
  clarificationRequired: boolean;
  openClarificationsCount: number;
  clarifications: ClarificationItem[];
  selectedEntity: Entity | null;
  entityForm: EntityFormState;
  onEntityFormFieldChange: (field: 'designation' | 'name' | 'qty' | 'review_status', value: string) => void;
  savingEntity: boolean;
  onSaveEntity: () => void;
  onSetEntityReviewStatus: (status: 'draft' | 'reviewed' | 'rejected') => void;
  nextDraftEntity: Entity | null;
  onOpenNextEntity: (entity: Entity | null) => void;
  onCloseEntity: () => void;
  onRememberViewerPage: (page: number | null) => void;
  bom: BOM | null;
  equipmentTotal: number | null;
  totalCost: number | null;
  statusLabel: (status: string | null | undefined) => string;
};
