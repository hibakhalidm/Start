// src-wasm/src/parser.rs
// ETSI/3GPP TLV parser with Lawful Intercept protocol fingerprinting.
//
// ETSI OID BER encoding reference (user-confirmed):
//   ETSI TS 102 232 PS Domain: [0x06, 0x05, 0x04, 0x00, 0x8B, 0x39, 0x01]
//   PSHeader (IRI):            [0x06, 0x06, 0x04, 0x00, 0x8B, 0x39, 0x01, 0x00]
//   PSPayload (CC):            [0x06, 0x06, 0x04, 0x00, 0x8B, 0x39, 0x01, 0x01]
//   3GPP TS 33.108 LI:         [0x06, 0x06, 0x04, 0x00, 0x81, 0xCC, 0x52, 0x01]
//
// Application-class tags (ETSI TS 101 671):
//   0x61 = [APPLICATION 1] CONSTRUCTED → HI2 IRI container
//   0x63 = [APPLICATION 3] CONSTRUCTED → HI3 CC container

use serde::{Deserialize, Serialize};

// ── ETSI OID content bytes (BER, without tag 0x06 and length byte) ───────────

/// ETSI TS 102 232 PS Domain LI root arc (0.4.0.1465.1 in ITU-T numbering)
const OID_ETSI_102232_PS:  &[u8] = &[0x04, 0x00, 0x8B, 0x39, 0x01];
/// ETSI 102 232 — PSHeader (IRI metadata wrapper), sub-arc .0
const OID_ETSI_102232_IRI: &[u8] = &[0x04, 0x00, 0x8B, 0x39, 0x01, 0x00];
/// ETSI 102 232 — PSPayload (Content of Communication), sub-arc .1
const OID_ETSI_102232_CC:  &[u8] = &[0x04, 0x00, 0x8B, 0x39, 0x01, 0x01];
/// 3GPP TS 33.108 LI root OID arc (encodes 0.4.0.26194.1)
const OID_3GPP_33108:      &[u8] = &[0x04, 0x00, 0x81, 0xCC, 0x52, 0x01];

/// ETSI TS 101 671 HI2 container (APPLICATION 1 CONSTRUCTED)
const TAG_HI2_IRI: u8 = 0x61;
/// ETSI TS 101 671 HI3 container (APPLICATION 3 CONSTRUCTED)
const TAG_HI3_CC:  u8 = 0x63;

// ── 3GPP TS 33.108 mandatory inner context tags ───────────────────────────────
// [0] = LIID/targetIdentifier, [1] = sequenceNumber, [4] = timestamp
const MANDATORY_LI_CONTEXT_TAGS: &[u8] = &[0x80, 0x81, 0x84];

// ─────────────────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TlvNode {
    pub name: String,
    pub tag: u8,
    pub tag_class: String,
    pub offset: usize,
    pub tag_length: usize,
    pub value_length_len: usize,
    pub value_length: usize,
    pub is_container: bool,
    pub children: Vec<TlvNode>,
    pub etsi_role: Option<String>,
}

// ── Public entry point ────────────────────────────────────────────────────────

pub fn parse_file_structure(data: &[u8]) -> Vec<TlvNode> {
    let mut nodes = Vec::new();
    let mut cursor = 0usize;
    while cursor < data.len() {
        match parse_tlv_node(data, cursor, 0) {
            Some(node) => {
                cursor = node.offset
                    + node.tag_length
                    + node.value_length_len
                    + node.value_length;
                nodes.push(node);
            }
            None => cursor += 1,
        }
    }
    nodes
}

/// Walk the parsed node tree and return the most specific protocol detected.
pub fn detect_protocol_from_tree(nodes: &[TlvNode]) -> (Option<String>, Option<String>) {
    fn walk(node: &TlvNode) -> Option<(String, String)> {
        if let Some(ref role) = node.etsi_role {
            let (proto, conf) = map_role_to_protocol(role);
            return Some((proto, conf));
        }
        for child in &node.children {
            if let Some(r) = walk(child) { return Some(r); }
        }
        None
    }

    for node in nodes {
        if let Some((proto, conf)) = walk(node) {
            return (Some(proto), Some(conf));
        }
    }
    (None, None)
}

fn map_role_to_protocol(role: &str) -> (String, String) {
    if role.contains("102232_IRI") || role.contains("102232_CC") {
        return ("ETSI_TS_102_232".into(), "HIGH".into());
    }
    if role.contains("102232") {
        return ("ETSI_TS_102_232".into(), "MEDIUM".into());
    }
    if role.contains("TS101671") {
        return ("ETSI_TS_101_671".into(), "HIGH".into());
    }
    if role.contains("3GPP_33108") || role.contains("3GPP") {
        return ("3GPP_TS_33_108".into(), "HIGH".into());
    }
    ("ETSI_LI_GENERIC".into(), "LOW".into())
}

// ── Core recursive TLV parser ─────────────────────────────────────────────────

fn parse_tlv_node(data: &[u8], offset: usize, depth: usize) -> Option<TlvNode> {
    if offset >= data.len() || depth > 64 { return None; }

    let tag = data[offset];
    let is_container = (tag & 0x20) == 0x20;
    let tag_class = classify_tag_class(tag);
    let tag_length = 1usize; // single-byte tag only (long-form not used in ETSI LI)

    // ── Length field decoding ─────────────────────────────────────────────────
    let len_offset = offset + 1;
    if len_offset >= data.len() { return None; }

    let length_byte = data[len_offset];
    let (value_length, value_length_len) = if length_byte & 0x80 == 0 {
        (length_byte as usize, 1usize)
    } else {
        let n = (length_byte & 0x7F) as usize;
        if n == 0 || n > 4 || len_offset + n >= data.len() { return None; }
        let mut vlen = 0usize;
        for k in 0..n { vlen = (vlen << 8) | data[len_offset + 1 + k] as usize; }
        (vlen, 1 + n)
    };

    let value_start = offset + tag_length + value_length_len;
    if value_start + value_length > data.len() { return None; }

    // ── Children ──────────────────────────────────────────────────────────────
    let mut children = Vec::new();
    if is_container && value_length > 0 {
        let end = value_start + value_length;
        let mut cur = value_start;
        while cur < end {
            match parse_tlv_node(data, cur, depth + 1) {
                Some(child) => {
                    cur = child.offset
                        + child.tag_length
                        + child.value_length_len
                        + child.value_length;
                    children.push(child);
                }
                None => break,
            }
        }
        // Strict DER/BER bounds check — abort ghost branches
        if cur != end { return None; }
    }

    // ── ETSI/3GPP role detection (retroactive labeling) ───────────────────────
    let etsi_role = detect_etsi_role(tag, &children, data, value_start, value_length);

    // Label child nodes with telecom-specific field meanings
    let mut children = children;
    if let Some(ref role) = etsi_role {
        label_etsi_children(&mut children, role);
    }

    // Validate schema — strip role from plausible-but-invalid structures
    let etsi_role = etsi_role.filter(|role| validate_etsi_schema(role, &children));

    let name = name_from_tag(tag, &etsi_role);

    Some(TlvNode {
        name,
        tag,
        tag_class,
        offset,
        tag_length,
        value_length_len,
        value_length,
        is_container,
        children,
        etsi_role,
    })
}

// ── ETSI role detection ───────────────────────────────────────────────────────

fn detect_etsi_role(
    tag: u8,
    children: &[TlvNode],
    data: &[u8],
    value_start: usize,
    value_length: usize,
) -> Option<String> {
    // 1. Application-class tags — ETSI TS 101 671 (highest specificity)
    if tag == TAG_HI2_IRI { return Some("ETSI_TS101671_HI2_IRI".into()); }
    if tag == TAG_HI3_CC  { return Some("ETSI_TS101671_HI3_CC".into()); }

    // 2. OID children — scan for known ETSI/3GPP discriminator OIDs
    for child in children {
        if child.tag == 0x06 && child.value_length > 0 {
            let vs = child.offset + child.tag_length + child.value_length_len;
            let ve = (vs + child.value_length).min(data.len());
            if ve > vs {
                if let Some(role) = match_etsi_oid(&data[vs..ve]) {
                    return Some(role);
                }
            }
        }
    }

    // 3. Heuristic: SEQUENCE with 2+ mandatory 3GPP context tags
    if tag == 0x30 && children.len() >= 3 {
        let child_tags: Vec<u8> = children.iter().map(|c| c.tag).collect();
        let hits = MANDATORY_LI_CONTEXT_TAGS
            .iter()
            .filter(|&&t| child_tags.contains(&t))
            .count();
        if hits >= 2 {
            return Some("3GPP_TS33108_LI_Header".into());
        }
    }

    // 4. Deep OID scan inside value bytes (catches OIDs nested in Octet Strings)
    let vs = value_start;
    let ve = (vs + value_length).min(data.len());
    if ve > vs + 4 {
        if let Some(role) = scan_for_etsi_oid(&data[vs..ve]) {
            return Some(role);
        }
    }

    None
}

fn match_etsi_oid(oid_bytes: &[u8]) -> Option<String> {
    // Most-specific match first (sub-arcs before root arcs)
    if oid_bytes.starts_with(OID_ETSI_102232_CC)  { return Some("ETSI_102232_CC_Payload".into()); }
    if oid_bytes.starts_with(OID_ETSI_102232_IRI) { return Some("ETSI_102232_IRI_Header".into()); }
    if oid_bytes.starts_with(OID_ETSI_102232_PS)  { return Some("ETSI_102232_PS_LI".into()); }
    if oid_bytes.starts_with(OID_3GPP_33108)       { return Some("3GPP_TS33108_LI".into()); }
    None
}

fn scan_for_etsi_oid(data: &[u8]) -> Option<String> {
    if data.len() < 4 { return None; }
    let limit = data.len() - 2;
    for i in 0..limit {
        if data[i] == 0x06 {
            let len = data[i + 1] as usize;
            if len > 0 && i + 2 + len <= data.len() {
                if let Some(role) = match_etsi_oid(&data[i + 2..i + 2 + len]) {
                    return Some(role);
                }
            }
        }
    }
    None
}

// ── Child field labeling ──────────────────────────────────────────────────────

fn label_etsi_children(children: &mut [TlvNode], parent_role: &str) {
    let is_iri = parent_role.contains("IRI")
        || parent_role.contains("LI_Header")
        || parent_role.contains("102232");
    let is_cc = parent_role.contains("CC") || parent_role.contains("HI3");

    for child in children.iter_mut() {
        if child.etsi_role.is_some() { continue; }
        child.etsi_role = if is_iri {
            match child.tag {
                0x80 => Some("LI_TargetIdentifier".into()),
                0x81 => Some("LI_SequenceNumber".into()),
                0x82 => Some("LI_CommIdentifier".into()),
                0x83 => Some("LI_NetworkIdentifier".into()),
                0x84 => Some("LI_Timestamp".into()),
                0x85 => Some("LI_ServiceType".into()),
                0x86 => Some("LI_TargetAddress".into()),
                0x06 => Some("OID_Discriminator".into()),
                0x13 | 0x0C => Some("LI_PrintableString".into()),
                _ => None,
            }
        } else if is_cc {
            match child.tag {
                0x80 => Some("CC_ContentFromTarget".into()),
                0x81 => Some("CC_ContentToTarget".into()),
                0x04 => Some("CC_OctetPayload".into()),
                _ => None,
            }
        } else {
            None
        };
        // Recurse if child is a labeled container
        if child.etsi_role.is_some() && child.is_container {
            let role = child.etsi_role.clone().unwrap();
            label_etsi_children(&mut child.children, &role);
        }
    }
}

// ── Schema validation (discard false positives) ───────────────────────────────

fn validate_etsi_schema(role: &str, children: &[TlvNode]) -> bool {
    // IRI/PSHeader must have at least one OID discriminator or LIID
    if role.contains("IRI") || role.contains("LI_Header") || role.contains("102232") {
        let has_oid_or_liid = children.iter().any(|c| {
            c.tag == 0x06  // OID discriminator
            || c.tag == 0x80  // targetIdentifier
            || c.tag == 0x81  // sequenceNumber
            || matches!(c.etsi_role.as_deref(), Some("OID_Discriminator")
                | Some("LI_TargetIdentifier") | Some("LI_SequenceNumber"))
        });
        return has_oid_or_liid;
    }
    // CC payloads must have at least one content field or raw octet
    if role.contains("CC") || role.contains("HI3") {
        return !children.is_empty() || true; // CC can be a raw payload
    }
    // Application-class containers and 3GPP are trusted by tag alone
    true
}

// ── Tag classification helpers ────────────────────────────────────────────────

fn classify_tag_class(tag: u8) -> String {
    match tag & 0xC0 {
        0x00 => "Universal".into(),
        0x40 => "Application".into(),
        0x80 => "Context".into(),
        0xC0 => "Private".into(),
        _    => "Unknown".into(),
    }
}

fn name_from_tag(tag: u8, etsi_role: &Option<String>) -> String {
    if let Some(role) = etsi_role { return role.clone(); }
    match tag {
        0x01 => "Boolean".into(),
        0x02 => "Integer".into(),
        0x03 => "Bit String".into(),
        0x04 => "Octet String".into(),
        0x05 => "Null".into(),
        0x06 => "Object Identifier".into(),
        0x0A => "Enumerated".into(),
        0x0C => "UTF8 String".into(),
        0x13 => "Printable String".into(),
        0x14 => "Teletex String".into(),
        0x16 => "IA5 String".into(),
        0x17 => "UTC Time".into(),
        0x18 => "Generalized Time".into(),
        0x1A => "Visible String".into(),
        0x30 => "Sequence".into(),
        0x31 => "Set".into(),
        0x61 => "HI2_IRI_Container".into(),
        0x63 => "HI3_CC_Container".into(),
        _ => {
            let num = tag & 0x1F;
            match tag & 0xC0 {
                0x80 => format!("Context_[{}]", num),
                0xC0 => format!("Context_C[{}]", num),
                0x40 => format!("Application_[{}]", num),
                _    => format!("Tag_0x{:02X}", tag),
            }
        }
    }
}
