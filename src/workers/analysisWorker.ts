// src/workers/analysisWorker.ts
/// <reference lib="webworker" />

import initWasm, { analyze } from '../../src-wasm/pkg/cifad_wasm';

// Ensure WASM is initialized only once
let wasmInitialized = false;

self.onmessage = async (e: MessageEvent) => {
    try {
        const { buffer } = e.data;

        if (!wasmInitialized) {
            await initWasm();
            wasmInitialized = true;
        }

        const bytes = new Uint8Array(buffer);

        // The unified `analyze()` now returns entropy, hilbert, autocorrelation,
        // AND parsed_structures (with cryptographic signatures) in one call.
        const result = analyze(bytes);

        self.postMessage({
            success: true,
            result
        });

    } catch (err: any) {
        console.error("Worker Critical Analysis Failure:", err);
        self.postMessage({
            success: false,
            error: err.message || "Unknown analysis error"
        });
    }
};
