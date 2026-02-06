# Application Flow & User Journey

## Phase 1: Ingestion (The Funnel)
1.  **Start:** User launches CIFAD Desktop (Tauri).
2.  **Action:** Drag & Drop `crash_dump_2026.bin` into the dashboard.
3.  **Process (Backend):**
    * [cite_start]File is memory-mapped[cite: 27].
    * [cite_start]Parallel scan initiates: Entropy Calc + Autocorrelation + Signature Search[cite: 103].

## Phase 2: Triage (The Cockpit)
1.  **Display:**
    * **Left Pane:** "The Skeleton" (Tree view of detected regions).
    * **Center:** "The Matrix" (Raw Hex) or "Global File Radar" (Hilbert Map).
    * **Right Pane:** "The Inspector" (Data details) [based on Image 1].
2.  **User Action:** User observes the Hilbert Map.
    * *Scenario:* User sees a cluster of **Blue** pixels (Text Candidate).
3.  **Interaction:** User clicks the Blue cluster.
    * **System Response:** "The Matrix" (Hex view) auto-scrolls to the specific offset. "The Inspector" shows "As ASCII" preview [based on Image 1].

## Phase 3: Unmasking (The Analyst)
1.  **Problem:** The text in the hex view looks garbled/obfuscated.
2.  **Action:** User activates the **Transformation Pipeline** (Panel from Image 2).
3.  **Step 3a (Auto):** System suggests "XOR Detected: Key 0xAA" [based on Image 2].
4.  **Step 3b (Manual):** User adds "Decode TIP" block.
5.  **Live Preview:** The "Live Transformation Preview" pane updates in real-time. [cite_start]Garbled bytes become readable Technical Interface Protocol strings[cite: 90].

## Phase 4: Output (The Report)
1.  **Action:** User selects the decoded region.
2.  **Command:** Click "Export Selected Regions" or "Generate Report" [based on Image 2].
3.  **Result:** System saves `cleaned_artifact.bin` or a text report of the decoded TIP messages.