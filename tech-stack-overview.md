# Technical Stack & Architecture

## 1. Architecture: "Hybrid Forensic Engine"
* **Host:** Tauri 2.0 (Rust) - Manages Window & File I/O.
* **Compute:** WASM (Rust) - Runs Entropy, Hilbert, and Autocorrelation logic.
* **UI:** React 18 + TypeScript - Manages the "Forensic Cockpit."

## 2. Visualization Stack
| Component | Technology | Reasoning |
| :--- | :--- | :--- |
| **Global Radar** | **Deck.gl (BitmapLayer)** | Must render 262k+ pixels (512x512) via WebGL for 60fps performance. |
| **Semantic Scrollbar** | **HTML5 Canvas** | Custom rendering of 1D entropy map; native scrollbars cannot support data visualization. |
| **Hex Matrix** | **React-Window** | Virtualized list to handle millions of rows without DOM bloat. |
| **Graphs** | **uPlot** or **SVG** | Lightweight, high-performance charting for Autocorrelation. |

## 3. Data Flow
1.  **Rust (Tauri):** Reads file chunk `&[u8]`.
2.  **Rust (WASM):** Calculates `AnalysisResult` (Entropy Map, Hilbert Matrix, Graph Data).
3.  **React:**
    * Receives `AnalysisResult`.
    * Passes `hilbert_matrix` to **Deck.gl** (Radar).
    * Passes `entropy_map` to **Canvas** (Semantic Scrollbar).
    * Passes raw bytes to **React-Window** (Hex View).