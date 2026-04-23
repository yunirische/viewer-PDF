import { StepAnalysis } from './workflow/StepAnalysis';
import { StepClarification } from './workflow/StepClarification';
import { StepConfig } from './workflow/StepConfig';
import { StepResult } from './workflow/StepResult';
import { StepUpload } from './workflow/StepUpload';
import { AnalysisRail } from './workflow/AnalysisRail';
import { ConfigRail } from './workflow/ConfigRail';
import { ResultRail } from './workflow/ResultRail';
import type { ClarificationSectionProps, DetailRailProps, AnalysisSectionProps, ConfigSectionProps, ResultSectionProps, UploadSectionProps } from './workflow/types';

export type {
  DetailRailProps,
  ClarificationSectionProps,
  AnalysisSectionProps,
  ConfigSectionProps,
  ResultSectionProps,
  UploadSectionProps,
} from './workflow/types';

export function WorkflowActionPane(props: {
  upload: UploadSectionProps;
  config: ConfigSectionProps;
  clarification: ClarificationSectionProps;
  analysis: AnalysisSectionProps;
  result: ResultSectionProps;
}) {
  const { upload, config, clarification, analysis, result } = props;

  return (
    <section className="action-pane">
      <div className="action-scroll">
        {upload.currentStep === 'upload' ? <StepUpload {...upload} /> : null}
        {config.currentStep === 'config' ? <StepConfig {...config} /> : null}
        {clarification.currentStep === 'clarification' ? <StepClarification {...clarification} /> : null}
        {analysis.currentStep === 'analysis' ? <StepAnalysis {...analysis} /> : null}
        {result.currentStep === 'result' ? <StepResult {...result} /> : null}
      </div>
    </section>
  );
}

export function WorkflowDetailRail(props: DetailRailProps) {
  return (
    <aside className="detail-rail detail-rail--inline">
      {props.currentStep === 'config' ? <ConfigRail {...props} /> : null}
      {props.currentStep === 'clarification' || props.currentStep === 'analysis' ? <AnalysisRail {...props} /> : null}
      {props.currentStep === 'result' ? <ResultRail {...props} /> : null}
    </aside>
  );
}

export function WorkflowWorkspace(props: {
  upload: UploadSectionProps;
  config: ConfigSectionProps;
  clarification: ClarificationSectionProps;
  analysis: AnalysisSectionProps;
  result: ResultSectionProps;
  detailRail: DetailRailProps;
}) {
  return (
    <section className="workflow-sideflow">
      <WorkflowActionPane
        upload={props.upload}
        config={props.config}
        clarification={props.clarification}
        analysis={props.analysis}
        result={props.result}
      />
      <WorkflowDetailRail {...props.detailRail} />
    </section>
  );
}
