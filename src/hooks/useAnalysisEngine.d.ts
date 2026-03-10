import { AnalysisResult } from '../types/analysis';
export declare const useAnalysisEngine: () => {
    isReady: boolean;
    analyzeFile: (file: File) => Promise<void>;
    result: AnalysisResult;
    isAnalyzing: boolean;
};
//# sourceMappingURL=useAnalysisEngine.d.ts.map