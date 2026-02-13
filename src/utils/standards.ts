import { TlvNode } from '../types/analysis';

export interface DetectedStandard {
    name: string;
    description: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    color: string;
}

export const detectStandard = (nodes: TlvNode[]): DetectedStandard | null => {
    if (!nodes || nodes.length === 0) return null;

    const root = nodes[0];

    // HEURISTIC: ETSI TS 101 671 (Lawful Interception)
    // Pattern: Root Sequence (0x30) containing Integer (0x02) and nested data
    if (root.name.includes("Sequence") || root.name.includes("0x30")) {
        const hasInteger = root.children.some(c => c.name.includes("Integer") || c.name.includes("0x02"));
        const hasString = root.children.some(c => c.name.includes("OctetString") || c.name.includes("0x04"));
        const hasNested = root.children.some(c => c.is_container);

        if (hasInteger && hasString && hasNested) {
            return {
                name: "ETSI TS 101 671",
                description: "Lawful Interception (Handover Interface)",
                confidence: "HIGH",
                color: "#00ff9d" // Neon Green
            };
        }
    }

    // HEURISTIC: Generic ASN.1 BER
    if (root.is_container && root.children.length > 0) {
        return {
            name: "ASN.1 BER Structure",
            description: "Basic Encoding Rules (Generic)",
            confidence: "MEDIUM",
            color: "#00f0ff" // Cyan
        };
    }

    return null;
};
