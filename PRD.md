# Product Requirements Document (PRD)
**Project:** CIFAD (Communication Interface File Analysis & Detection)
**Version:** 2.0 (Aligned with Client Feedback & SDD v1.0)

## 1. Executive Summary
[cite_start]CIFAD is a high-performance forensic workbench designed to ingest binary streams, classify data using deterministic heuristics (math over AI), and unmask hidden communication patterns[cite: 9, 10]. [cite_start]The core focus is identifying text-based protocols (specifically TIP - Technical Interface Protocol) and distinguishing them from metadata or encrypted payloads[cite: 11].

## 2. Core Problem
[cite_start]Traditional parsers fail on corrupted files, and ML approaches are opaque and slow[cite: 10]. [cite_start]Analysts need a "Searchlight" approach to scan binary dumps, visually identify regions of interest (e.g., TIP text), and apply reversible transformations to decode them[cite: 18].

## 3. Key User Flows (Client Specific)
1.  [cite_start]**Ingestion:** User loads raw binary (crash dump, PCAP)[cite: 14].
2.  [cite_start]**Detection (The Radar):** System identifies "Known Patterns" (TIP, ETSI H1/H2) and highlights "Unknown Patterns" (proprietary vendor formats)[cite: 11].
3.  **Visual Triage:** User sees a Hilbert Map (Heatmap).
    * [cite_start]**Action:** User clicks a "Blue Section" (High probability Text/H1)[cite: 85].
    * [cite_start]**Sync:** The Hex View immediately jumps to the corresponding offset[cite: 108].
4.  **Transformation & Decoding:**
    * [cite_start]User applies a "Transformation Pipeline" (e.g., XOR Solver, Bit-Rotate)[cite: 30].
    * **Specific Goal:** Decode raw bytes into ASCII/TIP format.
    * **Validation:** System checks if decoded output matches meaningful text structures.
5.  [cite_start]**Export:** User generates a report or exports the cleaned artifacts[cite: 17].

## 4. Functional Requirements

### 4.1 Ingestion & Scanning
* [cite_start]**Universal Input:** Must accept any binary extension (bin, dmp, raw)[cite: 14].
* **Algorithm Focus:**
    * [cite_start]**H1 (Text/TIP):** Detected via Histogram Analysis (>90% ASCII)[cite: 61].
    * [cite_start]**H2 (Metadata):** Detected via Anchor & Leapfrog (ASN.1 Sequences)[cite: 64].
    * [cite_start]**H3 (Encrypted):** Detected via Shannon Entropy (>7.5)[cite: 56].
    * [cite_start]**Vendor (Periodic):** Detected via Autocorrelation (repeating headers)[cite: 70].

### 4.2 Visualization (The Cockpit)
* [cite_start]**Global Radar:** 2D Hilbert Curve rendering of the file[cite: 80].
* **Color Coding:**
    * [cite_start]Blue: Text/TIP (H1)[cite: 85].
    * [cite_start]Red: Metadata (H2)[cite: 86].
    * [cite_start]Black: High Entropy/Encrypted[cite: 84].
    * [cite_start]Purple: Unknown/Periodic Patterns[cite: 87].
* [cite_start]**Synchronization:** Scrolling the Radar or Hex view must lock and sync both views[cite: 91].

### 4.3 The Unmasker (Transformation)
* [cite_start]**Pipeline Logic:** Modular blocks (XOR, Shift, Decompress)[cite: 30].
* [cite_start]**Auto-Solve:** Brute-force solver for simple XOR keys (1-4 bytes)[cite: 95].
* **Text Reconstruction:** Dedicated "TIP Decoder" block to convert raw decoded bytes into readable protocol text.

## 5. Non-Functional Requirements
* [cite_start]**Performance:** Scan 1GB in < 30 seconds[cite: 126].
* [cite_start]**Security:** 100% Air-Gap capable (No external API calls)[cite: 126].
* [cite_start]**Integrity:** Source file is Read-Only; all edits are virtual[cite: 126].