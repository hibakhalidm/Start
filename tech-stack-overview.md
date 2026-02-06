# Technical Stack & Architecture

## 1. Architecture Overview
**Client-Heavy Hybrid:**
* **Backend:** High-performance Rust core for File I/O and statistical profiling.
* [cite_start]**Frontend:** React 18 + WebAssembly (WASM) for signal processing and visualization[cite: 24].

## 2. Technology Stack

| Component | Tech | Justification |
| :--- | :--- | :--- |
| **App Wrapper** | **Tauri 2.0** | Provides native desktop performance with web frontend. [cite_start]Replaces "FastAPI" for local deployment[cite: 123]. |
| **Backend Core** | **Rust** | Memory-safe, zero-copy parsing. [cite_start]Handles memory mapping of 4GB+ files[cite: 123]. |
| **Frontend UI** | **React 18** | [cite_start]Component-based state management[cite: 123]. |
| **Processing** | **WASM (Rust)** | [cite_start]Runs decoding logic (XOR, TIP extraction) in-browser at C++ speeds[cite: 124]. |
| **Visualization** | **Deck.gl** | [cite_start]Renders the Hilbert Curve (Millions of points) via WebGL[cite: 123]. |
| **Hex View** | **React-Window** | [cite_start]Virtualized scrolling for GB-scale datasets[cite: 124]. |

## 3. Data Flow & API Structure

### A. Ingestion (Rust)
* `fn map_file(path)`: Memory maps the file (Read-Only).
* `fn calculate_entropy(chunk_size)`: Sliding window entropy.
* `fn autocorrelation(fft)`: Detects periodicity.

### B. Frontend <-> Backend Bridge (Tauri Commands)
* `get_block(offset, length)`: Returns raw bytes.
* `get_histogram_map()`: Returns data for the Hilbert visualization.

### C. Transformation Pipeline (WASM)
* *Input:* `Vec<u8>` (Raw selected bytes).
* *Operations:*
    * `xor_cipher(key)`
    * `tip_decoder()`: Custom logic to parse Technical Interface Protocol headers/body.
* *Output:* `String` (Readable Text) or `Vec<u8>` (Cleaned Binary).

## 4. Database / Storage
* **No SQL Database Required:** The system analyzes files in-place.
* **State Management:** React Context or Zustand for active user session data.
* **Exports:** Writes directly to the user's filesystem.