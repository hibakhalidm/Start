use wasm_bindgen::prelude::*;
use serde::Serialize;
use std::cmp;

#[derive(Serialize)]
pub struct TlvNode {
    pub tag: u8,
    pub name: String,
    pub tag_length: usize,
    pub value_length: usize,
    pub value_length_len: usize,
    pub offset: usize,
    pub is_container: bool,
    pub children: Vec<TlvNode>,
    pub signature: Option<String>, // Cryptographic Identifier
}

#[derive(Serialize)]
pub struct AnalysisResult {
    pub parsed_structures: Vec<TlvNode>,
    pub entropy_map: Vec<f64>,
    pub autocorrelation_graph: Vec<f64>,
    pub hilbert_matrix: Vec<u8>,
}

#[wasm_bindgen]
pub fn analyze(data: &[u8]) -> Result<JsValue, JsValue> {
    let parsed_structures = parse_tlv(data);
    let entropy_map = calculate_entropy_map(data);
    let autocorrelation_graph = calculate_autocorrelation_graph(data);
    let hilbert_matrix = generate_hilbert_matrix(data);

    let result = AnalysisResult {
        parsed_structures,
        entropy_map,
        autocorrelation_graph,
        hilbert_matrix,
    };

    Ok(serde_wasm_bindgen::to_value(&result).map_err(|e| e.to_string())?)
}

// ─── TLV / ASN.1 Parsing ─────────────────────────────────────────────────────

pub fn parse_tlv(data: &[u8]) -> Vec<TlvNode> {
    let mut nodes = Vec::new();
    let mut cursor = 0;
    while cursor < data.len() {
        if let Some(node) = parse_tlv_node(data, cursor, data.len(), 0) {
            cursor = node.offset + node.tag_length + node.value_length_len + node.value_length;
            nodes.push(node);
        } else {
            cursor += 1;
        }
    }
    nodes
}

fn parse_tlv_node(data: &[u8], offset: usize, end_limit: usize, depth: usize) -> Option<TlvNode> {
    if offset >= end_limit || depth > 64 {
        return None;
    }

    // ── 1. MAGIC NUMBER PRE-FLIGHT SCAN ──────────────────────────────────────
    // Detect ZLIB Streams BEFORE the parser tries to interpret them as broken TLV tags.
    if end_limit - offset >= 16 && depth == 0 {
        let b0 = data[offset];
        let b1 = data[offset + 1];
        if b0 == 0x78 && (b1 == 0x9C || b1 == 0xDA || b1 == 0x01) {
            let check_end = cmp::min(offset + 256, end_limit);
            let entropy = calculate_shannon_entropy(&data[offset..check_end]);
            if entropy > 7.0 {
                let label = match b1 {
                    0x9C => "ZLIB Compressed Stream (Default Compression)",
                    0xDA => "ZLIB Compressed Stream (Best Compression)",
                    _    => "ZLIB Stream (No Compression)",
                };
                return Some(TlvNode {
                    tag: 0xFF, // Virtual tag for non-TLV signatures
                    name: label.to_string(),
                    tag_length: 2,
                    value_length: (end_limit - offset).saturating_sub(2),
                    value_length_len: 0,
                    offset,
                    is_container: false,
                    children: vec![],
                    signature: Some(label.to_string()),
                });
            }
        }
    }

    // ── 2. STANDARD ASN.1 / BER-TLV PARSER ───────────────────────────────────
    let tag = data[offset];
    let tag_length = 1;
    let mut cursor = offset + tag_length;

    if cursor >= end_limit {
        return None;
    }

    let len_byte = data[cursor];
    let mut value_length = 0;
    let mut value_length_len = 1;

    if len_byte < 128 {
        value_length = len_byte as usize;
    } else {
        let num_len_bytes = (len_byte & 0x7F) as usize;
        if num_len_bytes == 0 || num_len_bytes > 4 || cursor + 1 + num_len_bytes > end_limit {
            return None;
        }
        for i in 0..num_len_bytes {
            value_length = (value_length << 8) | (data[cursor + 1 + i] as usize);
        }
        value_length_len += num_len_bytes;
    }

    cursor += value_length_len;
    if cursor + value_length > end_limit {
        return None;
    }

    let value_start = cursor;
    let is_container = (tag & 0x20) == 0x20;
    let mut children = Vec::new();
    let mut signature: Option<String> = None;

    // ── 3. CRYPTOGRAPHIC ENVELOPE DETECTION ──────────────────────────────────

    // A) X.509 Certificate Heuristic
    // X.509 invariant: SEQUENCE { SEQUENCE { ... } } where the outer sequence is > 100B
    if tag == 0x30 && value_length > 100 && value_length_len >= 3 && data[offset + 1] == 0x82 {
        if value_start < end_limit && data[value_start] == 0x30 {
            signature = Some("Suspected X.509 Cryptographic Certificate".to_string());
        }
    }

    // B) PKCS#7 Enveloped / Signed Data OID Detection
    // Full OID TLV: 06 09 2A 86 48 86 F7 0D 01 07 {02|03}
    let pkcs7_enveloped: [u8; 11] = [0x06, 0x09, 0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x07, 0x03];
    let pkcs7_signed:    [u8; 11] = [0x06, 0x09, 0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x07, 0x02];

    if is_container && value_length >= 11 && value_start + 11 <= end_limit {
        let probe = &data[value_start..value_start + 11];
        if probe == pkcs7_enveloped {
            signature = Some("PKCS#7 Enveloped Data (Encrypted Payload Wrapper)".to_string());
        } else if probe == pkcs7_signed {
            signature = Some("PKCS#7 Signed Data (Cryptographic Signature Block)".to_string());
        }
    }

    // ── 4. RECURSIVE CHILD PARSING (Containers only) ─────────────────────────
    if is_container && value_length > 0 {
        let mut child_cursor = value_start;
        let node_end = value_start + value_length;
        let mut valid = true;

        while child_cursor < node_end {
            if let Some(child) = parse_tlv_node(data, child_cursor, node_end, depth + 1) {
                child_cursor = child.offset + child.tag_length + child.value_length_len + child.value_length;
                children.push(child);
            } else {
                valid = false;
                break;
            }
        }

        // Strict hallucinaton guard: parsed children must sum to exactly the declared length
        if !valid || child_cursor != node_end {
            return None;
        }
    } else if !is_container && value_length >= 32 && signature.is_none() {
        // ── 5. HIGH-ENTROPY LEAF DETECTION ──────────────────────────────────
        let end = cmp::min(value_start + value_length, end_limit);
        let entropy = calculate_shannon_entropy(&data[value_start..end]);
        if entropy > 7.5 {
            signature = Some(format!(
                "High-Entropy Payload ({:.2} bits/byte) — Likely Encrypted or Compressed",
                entropy
            ));
        }
    }

    // ── 6. TAG NAME RESOLUTION ────────────────────────────────────────────────
    let name = if let Some(ref sig) = signature {
        sig.clone()
    } else {
        match tag {
            0x30 => "ETSI_Sequence".to_string(),
            0x31 => "Set".to_string(),
            0x02 => "Integer".to_string(),
            0x04 => "OctetString".to_string(),
            0x05 => "Null".to_string(),
            0x06 => "ObjectIdentifier".to_string(),
            0x0C => "UTF8String".to_string(),
            0x13 => "PrintableString".to_string(),
            0x16 => "IA5String".to_string(),
            0x17 => "UTCTime".to_string(),
            0x80 => "ContextSpecific[0]".to_string(),
            0x81 => "ContextSpecific[1]".to_string(),
            0xA0 => "ContextSpecific[0] Constructed".to_string(),
            0xA1 => "ContextSpecific[1] Constructed".to_string(),
            0xA2 => "ContextSpecific[2] Constructed".to_string(),
            0xA3 => "ContextSpecific[3] Constructed".to_string(),
            _    => format!("Tag_0x{:02X}", tag),
        }
    };

    Some(TlvNode {
        tag,
        name,
        tag_length,
        value_length,
        value_length_len,
        offset,
        is_container,
        children,
        signature,
    })
}

// ─── Entropy ─────────────────────────────────────────────────────────────────

fn calculate_shannon_entropy(data: &[u8]) -> f64 {
    if data.is_empty() {
        return 0.0;
    }
    let mut counts = [0usize; 256];
    for &b in data {
        counts[b as usize] += 1;
    }
    let len = data.len() as f64;
    let mut entropy = 0.0;
    for &c in &counts {
        if c > 0 {
            let p = c as f64 / len;
            entropy -= p * p.log2();
        }
    }
    entropy
}

fn calculate_entropy_map(data: &[u8]) -> Vec<f64> {
    let chunk_size = 16;
    let step = if data.len() > 1_000_000 { 16 } else { 1 };
    let mut map = Vec::with_capacity(data.len());

    for i in (0..data.len()).step_by(step) {
        let end = cmp::min(i + chunk_size, data.len());
        let entropy = calculate_shannon_entropy(&data[i..end]);
        for _ in 0..step {
            if map.len() < data.len() {
                map.push(entropy);
            }
        }
    }
    map
}

// ─── Autocorrelation Graph ────────────────────────────────────────────────────

fn calculate_autocorrelation_graph(data: &[u8]) -> Vec<f64> {
    let max_lag = 512;
    let window = cmp::min(data.len(), 65536);
    if window == 0 {
        return vec![];
    }

    let sample = &data[0..window];
    let mut graph = Vec::with_capacity(max_lag);

    for lag in 0..max_lag {
        if lag == 0 {
            graph.push(1.0);
            continue;
        }
        if lag >= window {
            graph.push(0.0);
            continue;
        }
        let compare_len = window - lag;
        let matches: usize = (0..compare_len).filter(|&i| sample[i] == sample[i + lag]).count();
        graph.push(matches as f64 / compare_len as f64);
    }

    // Normalize: re-center around average, scale peak to 1.0
    let avg: f64 = if graph.len() > 1 {
        graph[1..].iter().sum::<f64>() / (graph.len() - 1) as f64
    } else {
        0.0
    };
    let max_spike = graph[1..].iter().cloned().fold(0.0_f64, f64::max);

    if max_spike > avg {
        for v in graph[1..].iter_mut() {
            let normalized = (*v - avg) / (max_spike - avg);
            *v = normalized.max(0.0);
        }
    }

    graph
}

// ─── Hilbert Matrix ───────────────────────────────────────────────────────────

const HILBERT_SIZE: usize = 512;
const HILBERT_PIXELS: usize = HILBERT_SIZE * HILBERT_SIZE;

fn generate_hilbert_matrix(data: &[u8]) -> Vec<u8> {
    let mut matrix = vec![0u8; HILBERT_PIXELS];
    let n = HILBERT_SIZE;

    for (i, &byte) in data.iter().take(HILBERT_PIXELS).enumerate() {
        let (x, y) = d2xy(n, i);
        if y < n && x < n {
            matrix[y * n + x] = byte;
        }
    }
    matrix
}

fn d2xy(n: usize, mut d: usize) -> (usize, usize) {
    let mut x = 0;
    let mut y = 0;
    let mut s = 1;
    let mut t = d;

    while s < n {
        let rx = 1 & (t / 2);
        let ry = 1 & (t ^ rx);
        let (nx, ny) = rot(s, x, y, rx, ry);
        x = nx + s * rx;
        y = ny + s * ry;
        t /= 4;
        s *= 2;
    }
    let _ = d; // suppress unused warning
    (x, y)
}

fn rot(n: usize, mut x: usize, mut y: usize, rx: usize, ry: usize) -> (usize, usize) {
    if ry == 0 {
        if rx == 1 {
            x = n - 1 - x;
            y = n - 1 - y;
        }
        return (y, x);
    }
    (x, y)
}
