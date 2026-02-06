export interface AnalysisResult {
    /**
     * Entropy values for the file, calculated using a sliding window.
     * Maps to Vec<f64> in Rust.
     */
    entropy_map: number[];

    /**
     * Hilbert curve mapping for visualization.
     * Maps to Uint8Array/Vec<u8> in Rust.
     * Note: This comes across the wire as a raw buffer usually, but for the interface we define it as Uint8Array.
     */
    hilbert_matrix: Uint8Array;

    /**
     * Detected file signatures/magic numbers.
     * Maps to Vec<String> in Rust.
     */
    signatures: string[];
}
