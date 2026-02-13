import { useState, useEffect, useCallback } from 'react';
import { AnalysisResult, TlvNode } from '../types/analysis';

// Standard dynamic import for the WASM module
const importWasm = async () => {
    // @ts-ignore
    return import('../../src-wasm/pkg/cifad_wasm');
};

export const useAnalysisEngine = () => {
    const [isReady, setIsReady] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        const initWasm = async () => {
            try {
                const wasm = await importWasm();
                if (wasm.default && typeof wasm.default === 'function') {
                    await wasm.default(); // Initialize WASM memory
                }
                setIsReady(true);
            } catch (e) {
                console.error("Failed to initialize WASM engine:", e);
            }
        };
        initWasm();
    }, []);

    const analyzeFile = useCallback(async (file: File) => {
        if (!isReady) return;

        setIsAnalyzing(true);
        try {
            const buffer = await file.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            const wasm = await importWasm();

            // 1. Run Physics Engine (Entropy, Hilbert, Autocorrelation)
            const rawResult = wasm.analyze(bytes);

            // 2. Run Logic Engine (Recursive TLV Parser)
            // We run this separately so parser failures don't kill the whole analysis
            let parsed_structures: TlvNode[] = [];
            try {
                if (wasm.parse_file_structure) {
                    parsed_structures = wasm.parse_file_structure(bytes);
                }
            } catch (e) {
                console.warn("TLV Parser warning:", e);
                // We swallow the parser error so the user still gets the visual analysis
            }

            // 3. Merge Results
            setResult({
                ...rawResult,
                parsed_structures
            });

        } catch (err) {
            console.error("Critical Analysis Failure:", err);
            setResult(null);
        } finally {
            setIsAnalyzing(false);
        }
    }, [isReady]);

    return { isReady, analyzeFile, result, isAnalyzing };
};
