import { useState, useEffect, useCallback, useRef } from 'react';
export const useAnalysisEngine = () => {
    const [isReady, setIsReady] = useState(true); // Worker model handles its own readiness
    const [result, setResult] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    // Maintain a persistent reference to the worker
    const workerRef = useRef(null);
    useEffect(() => {
        // Initialize the Web Worker leveraging Vite's native syntax
        const worker = new Worker(new URL('../workers/analysisWorker.ts', import.meta.url), {
            type: 'module',
        });
        workerRef.current = worker;
        return () => {
            // Cleanup on unmount
            worker.terminate();
        };
    }, []);
    const analyzeFile = useCallback(async (file) => {
        if (!workerRef.current)
            return;
        setIsAnalyzing(true);
        setResult(null); // Clear previous results while analyzing
        try {
            const buffer = await file.arrayBuffer();
            // Set up exactly ONE listener for this specific file request
            // In a more complex app we'd use message IDs, but this is 1:1 currently
            workerRef.current.onmessage = (e) => {
                const data = e.data;
                if (data.success) {
                    setResult(data.result);
                }
                else {
                    console.error("Analysis Worker Error:", data.error);
                    setResult(null);
                }
                setIsAnalyzing(false);
            };
            workerRef.current.onerror = (err) => {
                console.error("Critical Worker Sandbox Error:", err);
                setIsAnalyzing(false);
                setResult(null);
            };
            // Dispatch payload to the background thread
            // Offloads the 64-KB True Autocorrelation loop over 512-lags to Rust running silently behind the scenes
            workerRef.current.postMessage({ buffer }, [buffer]); // Transfer buffer ownership for zero-copy performance
        }
        catch (err) {
            console.error("File Buffer Extraction Error:", err);
            setResult(null);
            setIsAnalyzing(false);
        }
    }, []);
    return { isReady, analyzeFile, result, isAnalyzing };
};
//# sourceMappingURL=useAnalysisEngine.js.map