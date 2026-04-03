// src-wasm/src/lib.rs
// WASM boundary layer: thin bindings only.
// All logic lives in math.rs, crypto.rs, and parser.rs.

mod math;
mod crypto;
mod parser;

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

// ── Public result type ────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Debug)]
pub struct AnalysisResult {
    pub entropy_map: Vec<f64>,
    #[serde(with = "serde_bytes")]
    pub hilbert_matrix: Vec<u8>,
    pub signatures: Vec<String>,
    pub autocorrelation_graph: Vec<f64>,
    /// Authoritatively identified telecom protocol, e.g. "ETSI_TS_102_232"
    pub detected_protocol: Option<String>,
    /// Confidence level: "HIGH" | "MEDIUM" | "LOW"
    pub protocol_confidence: Option<String>,
}

// ── WASM exports ──────────────────────────────────────────────────────────────

/// Run the full physics + crypto analysis engine on the provided byte buffer.
/// Returns an AnalysisResult JSON value.
#[wasm_bindgen]
pub fn analyze(data: &[u8]) -> Result<JsValue, JsValue> {
    let entropy_map          = math::calculate_entropy_sliding_window(data, 256);
    let hilbert_matrix       = math::generate_hilbert_matrix(data);
    let autocorrelation_graph = math::calculate_autocorrelation_graph(data);

    let mut signatures = crypto::detect_signatures(data);
    if math::detect_autocorrelation(data) {
        signatures.push("VENDOR_PERIODIC_DETECTED".into());
    }

    let result = AnalysisResult {
        entropy_map,
        hilbert_matrix,
        signatures,
        autocorrelation_graph,
        detected_protocol: None,   // populated by parse_file_structure
        protocol_confidence: None,
    };

    Ok(serde_wasm_bindgen::to_value(&result)?)
}

/// Run the recursive TLV/ETSI parser and return the full node tree + protocol verdict.
#[wasm_bindgen]
pub fn parse_file_structure(data: &[u8]) -> Result<JsValue, JsValue> {
    let nodes = parser::parse_file_structure(data);
    Ok(serde_wasm_bindgen::to_value(&nodes)
        .map_err(|e| JsValue::from_str(&e.to_string()))?)
}

/// Inspect the parsed node tree for the highest-confidence ETSI/3GPP protocol.
/// Returns { detected_protocol: string | null, protocol_confidence: string | null }
#[wasm_bindgen]
pub fn detect_protocol(data: &[u8]) -> Result<JsValue, JsValue> {
    let nodes = parser::parse_file_structure(data);
    let (proto, conf) = parser::detect_protocol_from_tree(&nodes);

    #[derive(Serialize)]
    struct ProtocolVerdict {
        detected_protocol: Option<String>,
        protocol_confidence: Option<String>,
    }

    let verdict = ProtocolVerdict {
        detected_protocol: proto,
        protocol_confidence: conf,
    };

    Ok(serde_wasm_bindgen::to_value(&verdict)
        .map_err(|e| JsValue::from_str(&e.to_string()))?)
}
