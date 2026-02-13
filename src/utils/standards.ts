// src/utils/standards.ts
import { TlvNode } from '../types/analysis';

export interface DetectedStandard {
    name: string;
    description: string;
    category: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    color: string;
}

export const detectStandard = (nodes: TlvNode[]): DetectedStandard | null => {
    if (!nodes || nodes.length === 0) return null;

    // Root detection
    const root = nodes[0];

    // 1. SIGNATURE: ETSI Lawful Interception (TS 101 671)
    // Looking for Sequence (0x30) or specific context tags (0xA1, 0xA2)
    const hasEtsiTags = nodes.some(n => n.tag === 0xA1 || n.tag === 0xA2);

    if (root.tag === 0x30 && hasEtsiTags) {
        return {
            name: "ETSI TS 101 671",
            description: "Handover Interface (HI2/HI3) Communication Signal",
            category: "TELECOM / FORENSIC",
            confidence: "HIGH",
            color: "#00ff9d"
        };
    }

    // 2. SIGNATURE: Generic ASN.1 Binary
    if (root.tag === 0x30 || root.tag === 0x31) {
        return {
            name: "ASN.1 / BER Structure",
            description: "Structured Data Container (Hierarchical)",
            category: "DATA ENCODING",
            confidence: "MEDIUM",
            color: "#00f0ff"
        };
    }

    return {
        name: "Custom Binary Format",
        description: "Unidentified structural patterns detected.",
        category: "UNKNOWN",
        confidence: "LOW",
        color: "#aaa"
    };
};
