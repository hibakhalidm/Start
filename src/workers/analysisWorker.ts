// src/workers/analysisWorker.ts
/// <reference lib="webworker" />

import initWasm, { analyze, parse_file_structure, detect_protocol } from '../../src-wasm/pkg/cifad_wasm';
import type { TlvNode, AnalysisResult } from '../types/analysis';

// WASM is initialized once per worker lifetime — zero-overhead on subsequent calls
let wasmInitialized = false;

self.onmessage = async (e: MessageEvent) => {
    try {
        const { buffer } = e.data;

        if (!wasmInitialized) {
            await initWasm();
            wasmInitialized = true;
        }

        // Zero-copy: Uint8Array view over the transferred ArrayBuffer
        const bytes = new Uint8Array(buffer);

        // 1. Physics engine: entropy map, Hilbert matrix, autocorrelation
        const rawResult: Omit<AnalysisResult, 'parsed_structures'> = analyze(bytes);

        // 2. ETSI/3GPP TLV parser: full node tree with retroactive role labels
        let parsed_structures: TlvNode[] = [];
        try {
            parsed_structures = parse_file_structure(bytes) as TlvNode[];
        } catch (parserError) {
            console.warn('[AnalysisWorker] TLV parser warning:', parserError);
        }

        // 3. Protocol verdict: authoritative ETSI/3GPP detection from node tree
        let detected_protocol: string | undefined;
        let protocol_confidence: 'HIGH' | 'MEDIUM' | 'LOW' | undefined;
        try {
            const verdict = detect_protocol(bytes) as {
                detected_protocol: string | null;
                protocol_confidence: string | null;
            };
            detected_protocol  = verdict.detected_protocol  ?? undefined;
            protocol_confidence = (verdict.protocol_confidence as 'HIGH' | 'MEDIUM' | 'LOW') ?? undefined;
        } catch (protocolError) {
            console.warn('[AnalysisWorker] Protocol detection warning:', protocolError);
        }

        // 4. Return the fully typed, combined result
        const result: AnalysisResult = {
            ...rawResult,
            parsed_structures,
            detected_protocol,
            protocol_confidence,
        };

        self.postMessage({ success: true, result });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown analysis error';
        console.error('[AnalysisWorker] Critical failure:', message);
        self.postMessage({ success: false, error: message });
    }
};
