import { AnalysisResult } from '../types/analysis';
import { DetectedStandard } from './standards';
export declare const calculateFileHash: (buffer: ArrayBuffer) => Promise<string>;
export declare const generateReport: (file: File, analysis: AnalysisResult | null, standard: DetectedStandard | null) => Promise<void>;
//# sourceMappingURL=export.d.ts.map