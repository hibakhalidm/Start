# Application Flow & User Journey

## Phase 1: Ingestion
1.  **Launch:** User opens CIFAD (Tauri Window).
2.  **Action:** User drops `firmware.bin` (2GB) into the drop zone.
3.  **Process:**
    * File memory-mapped (Rust).
    * Entropy & Hilbert calculations start (WASM Thread).
    * UI transitions to "Cockpit Mode."

## Phase 2: Visual Triage (The Twin-View)
1.  **Global Scan:** User looks at the **Global Radar** (Top).
    * *Observation:* A large Red block (Entropy > 7.5) suggests an encrypted payload.
2.  **Navigation:**
    * **Action:** User clicks the Red block on the Radar.
    * **Response:**
        1.  **Hex View** jumps to offset `0x004000`.
        2.  **Semantic Scrollbar** thumb moves to the corresponding vertical position.
        3.  **Autocorrelation Graph** updates to show patterns for this region.

## Phase 3: Fine-Tuning
1.  **Context Check:** User drags the **Semantic Scrollbar** slowly to scrub through the boundary of the encrypted block.
2.  **Detail:** User spots a specific header pattern in the **Hex View**.

## Phase 4: Unmasking
1.  **Selection:** User highlights the header bytes.
2.  **Analysis:** The **Inspector** shows "Pattern Strength: 98% (Periodicity 64)".
3.  **Action:** User drags a "XOR Decoder" block into the Pipeline.
4.  **Result:** The Hex View updates in real-time to show decoded text.