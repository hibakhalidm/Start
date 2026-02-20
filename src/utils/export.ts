import { AnalysisResult } from '../types/analysis';
import { DetectedStandard } from './standards';

export const calculateFileHash = async (buffer: ArrayBuffer): Promise<string> => {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
};

export const generateReport = async (file: File, analysis: AnalysisResult | null, standard: DetectedStandard | null) => {
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);

    // 1. Hash the original evidence
    const fileHash = await calculateFileHash(fileData.buffer);

    const reportPayload = {
        timestamp: new Date().toISOString(),
        file_metadata: { name: file.name, size: file.size, sha256_hash: fileHash },
        intelligence: { detected_standard: standard },
        parsed_content: analysis?.parsed_structures || "No structures detected"
    };

    // 2. Hash the report itself to create an Integrity Seal
    const reportString = JSON.stringify(reportPayload);
    const encoder = new TextEncoder();
    const sealHash = await calculateFileHash(encoder.encode(reportString).buffer);

    const finalReport = {
        ...reportPayload,
        integrity_seal: sealHash // <--- Anti-Tamper Verification
    };

    // 3. Export
    const blob = new Blob([JSON.stringify(finalReport, null, 4)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CIFAD_${fileHash.slice(0, 8)}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
};
