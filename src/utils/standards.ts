import { TlvNode } from '../types/analysis';

export interface DetectedStandard {
    name: string;
    description: string;
    category: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    color: string;
}

export const detectStandard = (nodes: TlvNode[] | undefined, rawBytes: Uint8Array | null): DetectedStandard | null => {

    // 1. MAGIC NUMBER DETECTION (Raw Headers)
    if (rawBytes && rawBytes.length >= 4) {
        const magic32 = (rawBytes[0] << 24) | (rawBytes[1] << 16) | (rawBytes[2] << 8) | rawBytes[3];

        // PCAP (.pcap) Magic Numbers (Endianness variants)
        if (magic32 === 0xa1b2c3d4 || magic32 === 0xd4c3b2a1) {
            return { name: "PCAP CAPTURE", description: "Standard Network Packet Capture", category: "NETWORK", confidence: "HIGH", color: "#ff0055" };
        }
        // PCAPNG Magic Number
        if (magic32 === 0x0A0D0D0A) {
            return { name: "PCAP-NG", description: "Next Generation Packet Capture", category: "NETWORK", confidence: "HIGH", color: "#ff00aa" };
        }
        // .CR (Custom Radio / Crash Record) - Typical Ascii "CR" header
        if (rawBytes[0] === 0x43 && rawBytes[1] === 0x52) {
            return { name: ".CR RADIO/CRASH", description: "Custom Radio/Crash Protocol", category: "TELECOM", confidence: "MEDIUM", color: "#eebb00" };
        }
    }

    // 2. ASN.1 / TLV STRUCTURE DETECTION
    if (nodes && nodes.length > 0) {
        const root = nodes[0];
        const hasEtsiTags = nodes.some(n => n.tag === 0xA1 || n.tag === 0xA2);

        if (root.tag === 0x30 && hasEtsiTags) {
            return { name: "ETSI TS 101 671", description: "Lawful Interception (HI2/HI3)", category: "FORENSIC", confidence: "HIGH", color: "#00ff9d" };
        }
        if (root.tag === 0x30 || root.tag === 0x31) {
            return { name: "ASN.1 / BER", description: "Structured Data Container", category: "ENCODING", confidence: "MEDIUM", color: "#00f0ff" };
        }
    }

    // 3. ENCRYPTION / COMPRESSION HEURISTIC (If no structure found, check entropy proxy via bytes)
    if (rawBytes && rawBytes.length > 512) {
        // Proxy heuristic: count unique bytes in the first 512 bytes. High unique count = high entropy.
        const firstBlock = rawBytes.slice(0, 512);
        const uniqueBytes = new Set(firstBlock);

        if (uniqueBytes.size > 200) { // Threshold for "extreme entropy" proxy
            return { name: "ENCRYPTED / COMPRESSED", description: "High entropy payload detected. No readable header.", category: "UNKNOWN", confidence: "LOW", color: "#ffaa00" };
        }
    }

    return null;
};
