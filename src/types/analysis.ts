// src/types/analysis.ts
// Strict type definitions — aligned 1:1 with Rust structs in src-wasm/src/

export interface SearchMatch {
    offset: number;
    length: number;
    preview: string;
}

export interface TlvNode {
    tag: number;
    name: string;
    tag_class?: 'Universal' | 'Application' | 'Context' | 'Private';
    tag_length: number;
    value_length: number;
    value_length_len: number;
    offset: number;
    is_container: boolean;
    children: TlvNode[];
    signature?: string; // Cryptographic Identifier from Rust engine
    /** ETSI/3GPP semantic role, e.g. "ETSI_102232_IRI_Header", "LI_TargetIdentifier" */
    etsi_role?: string;
}

export interface AnalysisResult {
    entropy_map: number[];
    /** Hilbert-curve permuted 512×512 pixel matrix */
    hilbert_matrix: Uint8Array;
    autocorrelation_graph: number[];
    /** Format/crypto signature strings from the Rust engine */
    signatures?: string[];
    parsed_structures?: TlvNode[];
    /** Authoritative protocol identification from the WASM parser */
    detected_protocol?: string;
    protocol_confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
}
