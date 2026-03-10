/**
 * reportBuilder.ts
 * Executive Intelligence Report Generator
 *
 * Aggregates WASM analysis output into a professionally formatted
 * Markdown report suitable for IR teams, SOCs, and executive briefings.
 */

import { AnalysisResult, TlvNode } from '../types/analysis';
import { DetectedStandard } from './standards';

export interface ReportParams {
    fileName: string;
    fileSize: number;
    analysisTimestamp: string;
    result: AnalysisResult;
    standard: DetectedStandard | null;
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/** Compute the mean value of an array */
function mean(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** Format bytes into a human-readable string */
function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// ─── Cryptographic Signal Analysis ────────────────────────────────────────────

interface CryptoFinding {
    lag: number;
    strength: number;
    verdict: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

function analyzeCryptoSignature(autocorr: number[]): {
    findings: CryptoFinding[];
    baselineNoise: number;
} {
    if (autocorr.length < 64) return { findings: [], baselineNoise: 0 };

    // Compute baseline noise from the "flat" middle of the autocorrelation curve
    const midSection = autocorr.slice(48, Math.min(autocorr.length, 200));
    const baselineNoise = mean(midSection);
    const threshold = baselineNoise * 3; // A spike must be 3× the baseline

    // Lag-to-cipher dictionary
    const CIPHER_MAP: Record<number, { verdict: string; confidence: 'HIGH' | 'MEDIUM' | 'LOW' }> = {
        4: { verdict: 'DES Block Boundary (4-byte), possible IDEA or RC2', confidence: 'MEDIUM' },
        8: { verdict: 'DES / 3DES Block Cipher (64-bit blocks)', confidence: 'HIGH' },
        16: { verdict: 'AES-128 Block Cipher (128-bit / 16-byte blocks)', confidence: 'HIGH' },
        32: { verdict: 'AES-256 / SHA-256 Block Boundary (256-bit)', confidence: 'HIGH' },
        20: { verdict: 'SHA-1 Block Boundary (160-bit)', confidence: 'MEDIUM' },
        64: { verdict: 'AES GCM / ChaCha20-Poly1305 Nonce Segment', confidence: 'LOW' },
    };

    const findings: CryptoFinding[] = [];

    for (const [lagStr, info] of Object.entries(CIPHER_MAP)) {
        const lag = parseInt(lagStr);
        if (lag >= autocorr.length) continue;

        const strength = autocorr[lag] ?? 0;

        if (strength > threshold) {
            findings.push({
                lag,
                strength: Math.round(strength),
                verdict: info.verdict,
                confidence: info.confidence,
            });
        }
    }

    // Sort by confidence then strength
    findings.sort((a, b) => {
        const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        const confDiff = order[a.confidence] - order[b.confidence];
        return confDiff !== 0 ? confDiff : b.strength - a.strength;
    });

    return { findings, baselineNoise: Math.round(baselineNoise) };
}

// ─── Entropy Classification ───────────────────────────────────────────────────

function classifyEntropy(avgEntropy: number): {
    label: string;
    icon: string;
    detail: string;
} {
    if (avgEntropy > 7.5) {
        return {
            label: 'ENCRYPTED / COMPRESSED',
            icon: '🔴',
            detail: 'Average Shannon entropy exceeds 7.5 bits/byte. This payload is statistically indistinguishable from random data. High probability of AES, ChaCha20, ZIP, or GZIP compression applied.',
        };
    }
    if (avgEntropy > 5.0) {
        return {
            label: 'MIXED / PARTIALLY OBFUSCATED',
            icon: '🟡',
            detail: 'Average entropy is in the mixed range (5.0–7.5 bits/byte). The payload contains both structured and high-entropy regions. Possible XOR obfuscation, Base64, or packed executable code.',
        };
    }
    return {
        label: 'PLAINTEXT / LOW ENTROPY',
        icon: '🟢',
        detail: 'Average entropy is below 5.0 bits/byte. The payload contains significant structured data — likely plaintext, ASN.1, XML, or a low-complexity binary protocol.',
    };
}

// ─── Artifact Extraction ──────────────────────────────────────────────────────

interface Artifact {
    type: 'TIMESTAMP' | 'STRING' | 'TLV_CONTAINER';
    offset: string;
    value: string;
    size: number;
}

function extractArtifacts(nodes: TlvNode[], fileData?: Uint8Array): Artifact[] {
    const artifacts: Artifact[] = [];

    const MIN_TIMESTAMP = 946684800;  // 2000-01-01
    const MAX_TIMESTAMP = 2145916800; // 2038-01-01

    function walkNodes(node: TlvNode) {
        // 1. Check if value_length could encode a Unix timestamp (4 bytes)
        if (!node.is_container && node.value_length === 4 && fileData) {
            const start = node.offset + node.tag_length + node.value_length_len;
            if (start + 4 <= fileData.length) {
                const view = new DataView(fileData.buffer, fileData.byteOffset + start, 4);
                const ts = view.getUint32(0, false); // Big-endian
                if (ts >= MIN_TIMESTAMP && ts <= MAX_TIMESTAMP) {
                    artifacts.push({
                        type: 'TIMESTAMP',
                        offset: `0x${node.offset.toString(16).toUpperCase().padStart(8, '0')}`,
                        value: new Date(ts * 1000).toISOString().replace('T', ' ').split('.')[0] + ' UTC',
                        size: 4,
                    });
                }
            }
        }

        // 2. Check for printable ASCII string values
        if (!node.is_container && node.value_length > 5 && node.value_length < 4096 && fileData) {
            const start = node.offset + node.tag_length + node.value_length_len;
            const end = start + node.value_length;
            if (end <= fileData.length) {
                const slice = fileData.slice(start, end);
                const text = new TextDecoder('utf-8', { fatal: false }).decode(slice);
                if (/^[\x20-\x7E\n\r\t]{6,}$/.test(text)) {
                    artifacts.push({
                        type: 'STRING',
                        offset: `0x${node.offset.toString(16).toUpperCase().padStart(8, '0')}`,
                        value: text.replace(/\n/g, '↵').substring(0, 120),
                        size: node.value_length,
                    });
                }
            }
        }

        // 3. Note high-value containers
        if (node.is_container && node.children.length > 2) {
            artifacts.push({
                type: 'TLV_CONTAINER',
                offset: `0x${node.offset.toString(16).toUpperCase().padStart(8, '0')}`,
                value: `TAG 0x${node.tag.toString(16).toUpperCase()} — "${node.name}" contains ${node.children.length} sub-fields`,
                size: node.tag_length + node.value_length_len + node.value_length,
            });
        }

        for (const child of node.children) {
            walkNodes(child);
        }
    }

    for (const node of nodes) {
        walkNodes(node);
    }

    // Limit output to the most relevant artifacts
    return artifacts.slice(0, 40);
}

// ─── Threat Score ─────────────────────────────────────────────────────────────

function computeThreatScore(
    avgEntropy: number,
    findings: CryptoFinding[],
    hasStructure: boolean,
): number {
    let score = 0;

    // Entropy contribution (0–40 pts)
    score += Math.min(40, Math.round((avgEntropy / 8.0) * 40));

    // Crypto findings (0–40 pts)
    for (const f of findings) {
        if (f.confidence === 'HIGH') score += 15;
        if (f.confidence === 'MEDIUM') score += 8;
        if (f.confidence === 'LOW') score += 4;
    }
    score = Math.min(80, score); // Cap crypto contribution

    // Structure bonus (−10 pts) — structured data is less threatening
    if (hasStructure) score -= 10;

    return Math.max(0, Math.min(100, score));
}

function threatScoreEmoji(score: number): string {
    if (score >= 75) return '🔴 CRITICAL';
    if (score >= 50) return '🟠 HIGH';
    if (score >= 25) return '🟡 MODERATE';
    return '🟢 LOW';
}

// ─── Main Report Builder ──────────────────────────────────────────────────────

export function generateIntelReport(params: ReportParams, fileData?: Uint8Array): string {
    const { fileName, fileSize, analysisTimestamp, result, standard } = params;
    const { autocorrelation_graph, entropy_map, parsed_structures } = result;

    // --- Compute Metrics ---
    const avgEntropy = mean(entropy_map);
    const entryClass = classifyEntropy(avgEntropy);
    const { findings, baselineNoise } = analyzeCryptoSignature(autocorrelation_graph);
    const hasStructure = (parsed_structures?.length ?? 0) > 0;
    const threatScore = computeThreatScore(avgEntropy, findings, hasStructure);
    const artifacts = parsed_structures ? extractArtifacts(parsed_structures, fileData) : [];

    const structureTree = (parsed_structures ?? []).slice(0, 20).map(n =>
        `| 0x${n.tag.toString(16).toUpperCase().padStart(4, '0')} | ${n.name} | ${n.is_container ? '📦 Container' : '📄 Primitive'} | ${formatBytes(n.value_length)} |`
    ).join('\n');

    const analysisDate = new Date(analysisTimestamp);
    const dateStr = analysisDate.toISOString().replace('T', ' ').split('.')[0] + ' UTC';

    // ── Begin Markdown Assembly ───────────────────────────────────────────────
    const lines: string[] = [];

    lines.push(`# 🛡️ CIFAD Intelligence Report`);
    lines.push(``);
    lines.push(`> **Classification:** UNCLASSIFIED // FOR OFFICIAL USE ONLY`);
    lines.push(`> **Generated by:** CIFAD v0.1 — Cyber Intelligence Forensic Analysis Dashboard`);
    lines.push(`> **Report Date:** ${dateStr}`);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);

    // ── 1. Executive Summary ──────────────────────────────────────────────────
    lines.push(`## 1. Executive Summary`);
    lines.push(``);
    lines.push(`| Field | Value |`);
    lines.push(`|---|---|`);
    lines.push(`| **Target File** | \`${fileName}\` |`);
    lines.push(`| **File Size** | ${formatBytes(fileSize)} (${fileSize.toLocaleString()} bytes) |`);
    lines.push(`| **Analysis Timestamp** | ${dateStr} |`);
    lines.push(`| **Detected Protocol** | ${standard ? `**${standard.name}** — ${standard.description}` : 'Unknown / Unclassified'} |`);
    lines.push(`| **Confidence** | ${standard?.confidence ?? 'N/A'} |`);
    lines.push(`| **Threat Score** | **${threatScore}/100** — ${threatScoreEmoji(threatScore)} |`);
    lines.push(``);

    // ── 2. Thermodynamic Analysis (Entropy) ───────────────────────────────────
    lines.push(`---`);
    lines.push(``);
    lines.push(`## 2. Thermodynamic Analysis (Shannon Entropy)`);
    lines.push(``);
    lines.push(`**Verdict:** ${entryClass.icon} \`${entryClass.label}\``);
    lines.push(``);
    lines.push(`| Metric | Value |`);
    lines.push(`|---|---|`);
    lines.push(`| **Mean Entropy** | ${avgEntropy.toFixed(4)} bits/byte |`);
    lines.push(`| **Max Theoretical** | 8.0000 bits/byte |`);
    lines.push(`| **Payload Classification** | ${entryClass.label} |`);
    lines.push(``);
    lines.push(`${entryClass.detail}`);
    lines.push(``);

    // ── 3. Cryptographic Signal Analysis ──────────────────────────────────────
    lines.push(`---`);
    lines.push(``);
    lines.push(`## 3. Cryptographic Signal Analysis (Autocorrelation)`);
    lines.push(``);
    lines.push(`Autocorrelation baseline noise level: **${baselineNoise}** (spikes exceeding 3× baseline are flagged).`);
    lines.push(``);

    if (findings.length === 0) {
        lines.push(`✅ **No significant cryptographic block boundaries detected.** The autocorrelation spectrum shows no structured periodicity. Payload does not exhibit signature patterns of known symmetric cipher block alignment.`);
    } else {
        lines.push(`⚠️ **${findings.length} cryptographic signature(s) detected:**`);
        lines.push(``);
        lines.push(`| Lag (bytes) | Spike Strength | Confidence | Interpretation |`);
        lines.push(`|---|---|---|---|`);
        for (const f of findings) {
            const icon = f.confidence === 'HIGH' ? '🔴' : f.confidence === 'MEDIUM' ? '🟡' : '⚪';
            lines.push(`| **${f.lag}** | ${f.strength} | ${icon} ${f.confidence} | ${f.verdict} |`);
        }
        lines.push(``);
        lines.push(`> **Technical Note:** These periodic spikes in the autocorrelation spectrum correspond to repeating block structures characteristic of ${findings[0]?.verdict ?? 'block ciphers'}. This does NOT conclusively confirm encryption — structured binary formats (e.g., ASN.1 TLV) can exhibit similar periodicity.`);
    }
    lines.push(``);

    // ── 4. Artifact Extraction ─────────────────────────────────────────────────
    lines.push(`---`);
    lines.push(``);
    lines.push(`## 4. Extracted Artifacts`);
    lines.push(``);

    if (artifacts.length === 0) {
        lines.push(`No parseable artifacts (timestamps, plaintext strings, or significant TLV containers) were detected in the parsed structure tree.`);
    } else {
        lines.push(`${artifacts.length} artifact(s) extracted from the TLV structure tree:`);
        lines.push(``);
        lines.push(`| Type | File Offset | Size | Value / Description |`);
        lines.push(`|---|---|---|---|`);
        for (const art of artifacts) {
            const typeIcon = art.type === 'TIMESTAMP' ? '🕐' : art.type === 'STRING' ? '📝' : '📦';
            lines.push(`| ${typeIcon} ${art.type} | \`${art.offset}\` | ${art.size}B | \`${art.value}\` |`);
        }
    }
    lines.push(``);

    // ── 5. Structural Map ──────────────────────────────────────────────────────
    lines.push(`---`);
    lines.push(``);
    lines.push(`## 5. Structural Map (Top-Level TLV Nodes)`);
    lines.push(``);

    if (!parsed_structures || parsed_structures.length === 0) {
        lines.push(`No parseable TLV/ASN.1 structure detected. The payload is either unstructured binary or uses an unsupported encoding.`);
    } else {
        lines.push(`| Tag | Name | Type | Value Size |`);
        lines.push(`|---|---|---|---|`);
        lines.push(structureTree);
        if (parsed_structures.length > 20) {
            lines.push(`\n> _Showing first 20 of ${parsed_structures.length} root nodes._`);
        }
    }
    lines.push(``);

    // ── 6. Analyst Recommendations ────────────────────────────────────────────
    lines.push(`---`);
    lines.push(``);
    lines.push(`## 6. Analyst Recommendations`);
    lines.push(``);

    const recs: string[] = [];
    if (avgEntropy > 7.5) {
        recs.push(`**PRIORITY**: Attempt decryption. Entropy signature strongly suggests AES/ChaCha20 encryption or deflate/zlib compression. Check for embedded IV, key schedule artifacts, or hardcoded keys in associated executables.`);
    }
    if (findings.some(f => f.confidence === 'HIGH' && (f.lag === 16 || f.lag === 32))) {
        recs.push(`**CRYPTO PIVOT**: AES block boundaries detected. Conduct TLS/SSL handshake analysis on network captures from the source host. Look for session keys in PCAP via Wireshark \`SSLKEYLOGFILE\`.`);
    }
    if (artifacts.some(a => a.type === 'TIMESTAMP')) {
        recs.push(`**TIMELINE**: Timestamps found embedded in structure. Cross-reference with Windows Event Log 4624/4625 (Logon events) and network flows from the same time window.`);
    }
    if (standard?.category === 'NETWORK') {
        recs.push(`**NETWORK FORENSICS**: Recognized network capture format (${standard.name}). Parse with Wireshark/tshark for full protocol dissection. Extract C2 IPs, DNS queries, and payload streams.`);
    }
    if (hasStructure && !findings.length && avgEntropy < 5.0) {
        recs.push(`**PLAINTEXT INTEL**: Low entropy structured payload. Candidate for direct human-readable content extraction. Attempt \`strings\` extraction and keyword search (email addresses, hostnames, API keys).`);
    }
    if (recs.length === 0) {
        recs.push(`No specific high-priority recommendations. Conduct standard forensic examination: hash verification, string extraction, and metadata analysis.`);
    }

    for (const rec of recs) {
        lines.push(`- ${rec}`);
    }
    lines.push(``);

    // ── Footer ────────────────────────────────────────────────────────────────
    lines.push(`---`);
    lines.push(``);
    lines.push(`_Report generated by CIFAD — Cyber Intelligence Forensic Analysis Dashboard_  `);
    lines.push(`_Analysis Engine: Rust/WASM Deterministic State-Machine Parser v0.1 | Web Worker Offloaded_  `);
    lines.push(`_Do not redistribute without authorization_`);
    lines.push(``);

    return lines.join('\n');
}

/**
 * Triggers a browser download of the report as a .md file.
 */
export function downloadReport(markdown: string, fileName: string): void {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CIFAD_intel_report_${fileName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
