/**
 * reportBuilder.ts
 * Executive Intelligence Report Generator
 *
 * Aggregates WASM analysis output into a professionally formatted
 * Markdown report suitable for IR teams, SOCs, and executive briefings.
 */
import { AnalysisResult } from '../types/analysis';
import { DetectedStandard } from './standards';
export interface ReportParams {
    fileName: string;
    fileSize: number;
    analysisTimestamp: string;
    result: AnalysisResult;
    standard: DetectedStandard | null;
}
export declare function generateIntelReport(params: ReportParams, fileData?: Uint8Array): string;
/**
 * Triggers a browser download of the report as a .md file.
 */
export declare function downloadReport(markdown: string, fileName: string): void;
//# sourceMappingURL=reportBuilder.d.ts.map