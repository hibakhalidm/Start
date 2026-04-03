// src-wasm/src/crypto.rs
// Cryptographic and file-format signature detection.
// Uses magic-byte matching plus OID byte-pattern scanning in the first 64 KB.

// ── X.509 / PKCS OID content bytes (BER-encoded, after tag 0x06 + length byte) ──

const OID_SHA1_WITH_RSA: &[u8]     = &[0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x01, 0x05];
const OID_SHA256_WITH_RSA: &[u8]   = &[0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x01, 0x0B];
const OID_PKCS7_SIGNED_DATA: &[u8] = &[0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x07, 0x02];
const OID_X509_COMMON_NAME: &[u8]  = &[0x55, 0x04, 0x03];
const OID_X509_EMAIL: &[u8]        = &[0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x09, 0x01];

// ─────────────────────────────────────────────────────────────────────────────

pub fn detect_signatures(data: &[u8]) -> Vec<String> {
    let mut found = Vec::new();

    // ── Magic headers (format fingerprinting) ─────────────────────────────────
    if data.starts_with(b"\x89PNG\r\n\x1a\n")  { found.push("PNG_IMAGE".into()); }
    if data.starts_with(b"GIF8")                { found.push("GIF_IMAGE".into()); }
    if data.starts_with(b"%PDF")                { found.push("PDF_DOCUMENT".into()); }
    if data.starts_with(b"MZ")                  { found.push("PE_EXECUTABLE".into()); }
    if data.starts_with(b"\x7FELF")             { found.push("ELF_EXECUTABLE".into()); }
    if data.starts_with(b"PK\x03\x04")          { found.push("ZIP_ARCHIVE".into()); }
    if data.starts_with(b"\x1f\x8b")            { found.push("GZIP_COMPRESSED".into()); }
    if data.starts_with(b"BZh")                 { found.push("BZIP2_COMPRESSED".into()); }
    if data.starts_with(b"RIFF")                { found.push("RIFF_MEDIA".into()); }
    if data.starts_with(b"\xD0\xCF\x11\xE0")   { found.push("MS_COMPOUND_DOCUMENT".into()); }
    if data.starts_with(b"\x1f\x9d")            { found.push("LZW_COMPRESSED".into()); }

    // ── PCAP magic numbers ────────────────────────────────────────────────────
    if data.len() >= 4 {
        let m = u32::from_be_bytes([data[0], data[1], data[2], data[3]]);
        if m == 0xa1b2c3d4 || m == 0xd4c3b2a1 { found.push("PCAP_CAPTURE".into()); }
        if m == 0x0A0D0D0A                      { found.push("PCAPNG_CAPTURE".into()); }
    }

    // ── ZLIB: CMF/FLG integrity check (mod-31 checksum) ──────────────────────
    if data.len() >= 2 {
        let cmf = data[0];
        let flg = data[1];
        if (cmf & 0x0F) == 8 && (((cmf as u16) * 256 + flg as u16) % 31 == 0) {
            found.push("ZLIB_COMPRESSED".into());
        }
    }

    // ── X.509 / PKI OID scanning (first 64 KB only for performance) ──────────
    if scan_oid(data, OID_PKCS7_SIGNED_DATA) { found.push("PKCS7_SIGNED_DATA".into()); }
    if scan_oid(data, OID_SHA256_WITH_RSA)   { found.push("X509_SHA256_RSA_CERT".into()); }
    if scan_oid(data, OID_SHA1_WITH_RSA)     { found.push("X509_SHA1_RSA_CERT".into()); }
    if scan_oid(data, OID_X509_COMMON_NAME)  { found.push("X509_DN_PRESENT".into()); }
    if scan_oid(data, OID_X509_EMAIL)        { found.push("X509_EMAIL_PKCS9".into()); }

    found
}

/// Scan for a BER OID TLV (tag=0x06, then length byte equal to oid_content.len(),
/// then the OID content bytes). Limits search to first 64 KB for O(N) performance.
fn scan_oid(data: &[u8], oid_content: &[u8]) -> bool {
    let search_len = data.len().min(65536);
    let needle_len = oid_content.len();
    if needle_len == 0 || needle_len > 127 || search_len < needle_len + 2 { return false; }
    let limit = search_len - needle_len - 1;
    for i in 0..=limit {
        if data[i] == 0x06
            && data[i + 1] as usize == needle_len
            && &data[i + 2..i + 2 + needle_len] == oid_content
        {
            return true;
        }
    }
    false
}
