import { AnalysisResult } from '../types/analysis';
import { DetectedStandard } from './standards';

interface ForensicReport {
    timestamp: string;
    file_metadata: {
        name: string;
        size: number;
        type: string;
        last_modified: number;
        sha256_hash: string;
    };
    analysis_metrics: {
        entropy_average: number;
        structure_depth: number;
    };
    intelligence: {
        detected_standard: DetectedStandard | null;
    };
    parsed_content: any;
}

export const calculateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const generateReport = async (
    file: File,
    analysis: AnalysisResult | null,
    standard: DetectedStandard | null
) => {
    if (!file || !analysis) {
        console.error("Cannot generate report: Missing file or analysis data.");
        return;
    }

    const hash = await calculateFileHash(file);

    const report: ForensicReport = {
        timestamp: new Date().toISOString(),
        file_metadata: {
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            last_modified: file.lastModified,
            sha256_hash: hash
        },
        analysis_metrics: {
            entropy_average: analysis.entropy_map.reduce((a, b) => a + b, 0) / analysis.entropy_map.length,
            structure_depth: analysis.parsed_structures ? analysis.parsed_structures.length : 0
        },
        intelligence: {
            detected_standard: standard
        },
        parsed_content: analysis.parsed_structures || "No structures detected"
    };

    const blob = new Blob([JSON.stringify(report, null, 4)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CIFAD_REPORT_${file.name}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
