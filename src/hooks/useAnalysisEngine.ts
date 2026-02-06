import { useState, useEffect, useCallback } from 'react';
import { AnalysisResult } from '../types/analysis';

// Dynamic import for WASM module
const importWasm = async () => {
    // In a real Vite setup with vite-plugin-wasm, this might differ slightly
    // but typically we import the init function or the module.
    // Assuming 'cifad-wasm' is the package name or path.
    // For local dev, we often point to the pkg folder.
    // Adjust path as needed for the specific build setup.
    // const wasm = await import('../../src-wasm/pkg'); 
    // return wasm;

    // For this prototype code, we'll assume the user has configured vite-plugin-wasm
    // and can import directly or via a wrapper.
    // We'll define a placeholder here or try to import if path is known.
    // Let's assume standard `import init, { analyze } from "cifad-wasm"` pattern
    // coupled with vite config.

    // TEMPORARY: using a mock or expecting global for the snippet if package not linked.
    // But since we are providing the CODE, we should write standard code.

    // @ts-ignore
    return import('../../src-wasm/pkg/cifad_wasm');
};

export const useAnalysisEngine = () => {
    const [isReady, setIsReady] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        const initWasm = async () => {
            const wasm = await importWasm();
            if (wasm.default) {
                await wasm.default(); // Initialize if default export is init function
            }
            setIsReady(true);
        };
        initWasm().catch(console.error);
    }, []);

    const analyzeFile = useCallback(async (file: File) => {
        if (!isReady) {
            console.error("WASM engine not ready");
            return;
        }

        setIsAnalyzing(true);
        try {
            const buffer = await file.arrayBuffer();
            const bytes = new Uint8Array(buffer);

            const wasm = await importWasm();
            // Zero-copy usually implies passing the pointer or memory view.
            // wasm-bindgen handles passing &[u8] as a view usually.

            const rawResult = wasm.analyze(bytes);

            // Convert or usage rawResult directly.
            // Construct the TS object from the raw WASM result if needed, 
            // but wasm-bindgen structs are objects in JS.
            setResult(rawResult);

        } catch (err) {
            console.error("Analysis failed:", err);
        } finally {
            setIsAnalyzing(false);
        }
    }, [isReady]);

    return { isReady, analyzeFile, result, isAnalyzing };
};
