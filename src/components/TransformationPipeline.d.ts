import React from 'react';
import { AnalysisResult } from '../types/analysis';
import { DetectedStandard } from '../utils/standards';
interface Props {
    selectedBytes: Uint8Array | null;
    fileData?: Uint8Array | null;
    fileObj?: File | null;
    analysisResult?: AnalysisResult | null;
    detectedStandard?: DetectedStandard | null;
}
declare const TransformationPipeline: React.FC<Props>;
export default TransformationPipeline;
//# sourceMappingURL=TransformationPipeline.d.ts.map