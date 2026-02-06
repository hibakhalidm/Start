# Security & Operational Checklist

## 1. Deployment Environment
- [ ] [cite_start]**Air-Gap Verification:** Ensure no libraries (like Google Fonts or Analytics) are making external network requests[cite: 126].
- [ ] **Offline Mode:** The application must function 100% without internet access.

## 2. Input Handling (Rust Backend)
- [ ] **Memory Safety:** Use Rust's borrow checker to prevent buffer overflows when reading malicious/corrupted files.
- [ ] **Read-Only Access:** Ensure the file handle for the input binary is opened in `READ` mode only. [cite_start]No write permissions to the source file[cite: 126].
- [ ] [cite_start]**Panic Handling:** Ensure the parser degrades gracefully (e.g., flagging as "Anomaly") rather than crashing the app when encountering unexpected byte sequences[cite: 10].

## 3. Execution Safety (WASM)
- [ ] **Sandboxing:** Ensure all user-defined transformations (XOR, Decoding) run strictly within the WASM sandbox.
- [ ] **Resource Limits:** Implement limits on loop iterations in the "XOR Solver" to prevent browser freezes (Denial of Service via complexity).

## 4. Data Privacy
- [ ] **Zero Telemetry:** Confirm no usage data is sent back to developers.
- [ ] **Local Processing:** All data stays in RAM/Disk on the local machine.