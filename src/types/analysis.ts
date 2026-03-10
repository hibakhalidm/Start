export interface TlvNode {
    tag: number;
    name: string;
    tag_length: number;
    value_length: number;
    value_length_len: number;
    offset: number;
    is_container: boolean;
    children: TlvNode[];
    signature?: string; // Cryptographic Identifier from Rust engine
}

export interface AnalysisResult {
    entropy_map: number[];
    hilbert_matrix: Uint8Array;
    autocorrelation_graph: number[];
    parsed_structures?: TlvNode[];
}
