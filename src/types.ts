export type WorkflowStep = 'upload' | 'config' | 'analysis' | 'result';
export type AnalysisMode = 'ai' | 'basic';

export interface BOMItem {
  id: string;
  name: string;
  article?: string;
  manufacturer: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
}

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
