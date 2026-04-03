import { TlvNode } from '../types/analysis';
export interface DetectedStandard {
    name: string;
    description: string;
    category: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    color: string;
}
export declare const detectStandard: (nodes: TlvNode[] | undefined, rawBytes: Uint8Array | null, entropyMap?: number[], detectedProtocol?: string, protocolConfidence?: "HIGH" | "MEDIUM" | "LOW") => DetectedStandard | null;
//# sourceMappingURL=standards.d.ts.map