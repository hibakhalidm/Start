# Security & Operational Checklist

## 1. Environment Constraints
- [ ] **Air-Gap Verification:** Application must run with zero network permissions (Tauri `allowlist` restricted).
- [ ] **Offline Mode:** No CDN links (Fonts/Scripts must be bundled locally).

## 2. Input Safety (Rust)
- [ ] **Read-Only Lock:** File handles must be opened in `READ` mode only. No write access to source files.
- [ ] **Zero-Copy Safety:** Ensure `unsafe` blocks in memory mapping are strictly bounded to prevent buffer overreads.
- [ ] **Panic Handling:** Corrupt headers must degrade to "Unknown" classification, not crash the renderer.

## 3. Visualization Safety
- [ ] **WebGL Context Loss:** Handle cases where the GPU context is lost (e.g., system sleep) by reloading the Radar texture.
- [ ] **Render Limits:** Cap the Autocorrelation search to 4KB windows to prevent main-thread freezing.

## 4. Privacy
- [ ] **No Telemetry:** Ensure no usage analytics or error reporting beacons are compiled into the production build.