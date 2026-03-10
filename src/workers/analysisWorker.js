// src/workers/analysisWorker.ts
/// <reference lib="webworker" />
import initWasm, { analyze, parse_file_structure } from '../../src-wasm/pkg/cifad_wasm';
// Ensure WASM is initialized only once
let wasmInitialized = false;
self.onmessage = async (e) => {
    try {
        const { buffer } = e.data;
        if (!wasmInitialized) {
            await initWasm();
            wasmInitialized = true;
        }
        const bytes = new Uint8Array(buffer);
        // 1. Run Physics Engine (Entropy, Hilbert, Autocorrelation)
        const rawResult = analyze(bytes);
        // 2. Run Logic Engine (Recursive TLV Parser)
        let parsed_structures = [];
        try {
            if (parse_file_structure) {
                parsed_structures = parse_file_structure(bytes);
            }
        }
        catch (parserError) {
            console.warn("Worker TLV Parser warning:", parserError);
        }
        // 3. Send combined results back to main thread
        self.postMessage({
            success: true,
            result: {
                ...rawResult,
                parsed_structures
            }
        });
    }
    catch (err) {
        console.error("Worker Critical Analysis Failure:", err);
        self.postMessage({
            success: false,
            error: err.message || "Unknown analysis error"
        });
    }
};
//# sourceMappingURL=analysisWorker.js.map