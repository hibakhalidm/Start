export interface TlvNode {
    name: string;
    offset: number;
    tag_length: number;
    value_length: number;
    is_container: boolean;
    children: TlvNode[];
}

export interface AnalysisResult {
    entropy_map: number[];
    hilbert_matrix: Uint8Array;
    autocorrelation_graph: number[];
    parsed_structures?: TlvNode[];
}
