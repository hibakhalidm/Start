// src/utils/standards.ts
// Protocol detection — single source of truth is the WASM engine.
// Magic-byte and entropy heuristics are fallbacks only.
const WASM_PROTOCOL_MAP = {
    ETSI_TS_102_232: {
        name: "ETSI TS 102 232",
        description: "PS Domain Lawful Interception (IRI/CC Payloads)",
        category: "FORENSIC:LI",
        confidence: "HIGH",
        color: "#ff3366",
    },
    ETSI_TS_101_671: {
        name: "ETSI TS 101 671",
        description: "Circuit-Switched LI — HI2 IRI / HI3 CC",
        category: "FORENSIC:LI",
        confidence: "HIGH",
        color: "#ff6600",
    },
    "3GPP_TS_33_108": {
        name: "3GPP TS 33.108",
        description: "UMTS/LTE/5G Lawful Interception",
        category: "FORENSIC:LI",
        confidence: "HIGH",
        color: "#a855f7",
    },
    ETSI_LI_GENERIC: {
        name: "ETSI LI (Generic)",
        description: "Lawful Intercept payload — standard undetermined",
        category: "FORENSIC:LI",
        confidence: "LOW",
        color: "#f59e0b",
    },
};
// ── Main export ───────────────────────────────────────────────────────────────
export const detectStandard = (nodes, rawBytes, entropyMap, detectedProtocol, protocolConfidence) => {
    // 1. WASM engine verdict — highest authority
    if (detectedProtocol && WASM_PROTOCOL_MAP[detectedProtocol]) {
        const base = WASM_PROTOCOL_MAP[detectedProtocol];
        return {
            ...base,
            confidence: protocolConfidence ?? base.confidence,
        };
    }
    // 2. Magic-byte detection (raw header fingerprinting)
    if (rawBytes && rawBytes.length >= 4) {
        const m32 = (rawBytes[0] << 24) | (rawBytes[1] << 16) | (rawBytes[2] << 8) | rawBytes[3];
        if (m32 === 0xa1b2c3d4 || m32 === 0xd4c3b2a1) {
            return { name: "PCAP CAPTURE", description: "Standard Network Packet Capture", category: "NETWORK", confidence: "HIGH", color: "#ff0055" };
        }
        if (m32 === 0x0A0D0D0A) {
            return { name: "PCAP-NG", description: "Next Generation Packet Capture", category: "NETWORK", confidence: "HIGH", color: "#ff00aa" };
        }
        if (rawBytes[0] === 0x43 && rawBytes[1] === 0x52) {
            return { name: ".CR RADIO/CRASH", description: "Custom Radio/Crash Protocol", category: "TELECOM", confidence: "MEDIUM", color: "#eebb00" };
        }
    }
    // 3. Generic ASN.1 fallback — LOW confidence (removed the false A1/A2 heuristic)
    if (nodes && nodes.length > 0) {
        if (nodes[0].tag === 0x30 || nodes[0].tag === 0x31) {
            return { name: "ASN.1 / BER", description: "Structured Data Container — protocol unresolved", category: "ENCODING", confidence: "LOW", color: "#00f0ff" };
        }
    }
    // 4. Entropy heuristic (last resort)
    if (entropyMap && entropyMap.length > 0) {
        const avg = entropyMap.reduce((a, b) => a + b, 0) / entropyMap.length;
        if (avg > 7.5) {
            return { name: "ENCRYPTED / COMPRESSED", description: "High entropy — no readable header.", category: "UNKNOWN", confidence: "HIGH", color: "#ffaa00" };
        }
    }
    return null;
};
//# sourceMappingURL=standards.js.map