# Product Requirements Document (PRD)
**Project:** CIFAD (Communication Interface File Analysis & Detection)
**Version:** 3.0 (Forensic Cockpit Edition)
**Status:** Approved

## 1. Executive Summary
CIFAD is a high-performance, air-gapped forensic workbench designed to analyze binary files through "Searchlight" visualization. It replaces linear parsing with specific statistical heuristics (Entropy, Autocorrelation) to identify islands of structured data (TIP, Metadata) within massive binary dumps.

## 2. Core Product Pillars

### 2.1 The "Twin-View" Hilbert Visualization
**Goal:** To provide both Macro (Global) and Micro (Contextual) spatial awareness.
* **View 1: The Global Radar (Top Pane):**
    * A 2D Square Hilbert Heatmap (e.g., 512x512) representing the *entire* file.
    * Preserves 2D data locality to show structural patterns (clusters, lattices).
* **View 2: The Semantic Scrollbar (Hex Companion):**
    * A vertical, dense visualization strip anchored to the right of the Hex View.
    * Acts as a functioning scrollbar but visualizes the data distribution (Entropy/Tags) for the entire file length.
    * Provides immediate "You Are Here" context relative to the file's structure.

### 2.2 The "Forensic Cockpit" Layout
* **Structure:** A unified 3-pane vertical stack designed to minimize eye movement.
    * **Left:** Navigation (File Tree).
    * **Center:** Visualization (Radar + Hex).
    * **Right:** Analysis (Inspector + Graph).
* **Synchronization:**
    * Clicking the **Global Radar** jumps the Hex View.
    * Dragging the **Semantic Scrollbar** scrubs through the file.
    * Scrolling the **Hex View** moves the "Reticle" on the Global Radar.

### 2.3 Key Algorithms
* **Entropy Engine:** Sliding window Shannon Entropy (Window: 256 bytes).
* **Autocorrelation:** FFT-based lag detection to find repeating vendor headers (Periodicity).
* **Signatures:** Deterministic magic-byte detection for standard formats (PNG, ELF, TIP).

## 3. Functional Requirements

### 3.1 Ingestion
* **FR-01:** Zero-Copy memory mapping for files >500MB.
* **FR-02:** Background WASM thread processing for Entropy and Autocorrelation.

### 3.2 Visualization & Interaction
* **FR-03:** **Global Radar:** Must render <200ms using WebGL.
* **FR-04:** **Semantic Scrollbar:** Must allow "Click-to-Warp" navigation.
* **FR-05:** **Hex View:** Virtualized rendering (only visible rows in DOM).

### 3.3 Inspection
* **FR-06:** **Autocorrelation Graph:** Line chart showing "Pattern Strength" vs. "Byte Lag".
* **FR-07:** **Transformation Pipeline:** Stackable decoders (XOR, Shift) applied to selections.

## 4. Non-Functional Requirements
* **NFR-01 (Security):** 100% Offline (Air-Gapped). No external requests.
* **NFR-02 (Performance):** UI must maintain 60fps during scrolling.