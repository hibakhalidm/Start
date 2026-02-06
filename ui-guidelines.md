# UI/UX Design Guidelines

## 1. Aesthetic Direction: "Cyber-Forensic"
* **Theme:** Dark Mode Only. High contrast for data visibility.
* **Inspiration:** The provided screenshots (`image_40797e.png`, `image_407693.png`).
* [cite_start]**Core Philosophy:** "The Searchlight" – illuminate data amidst the dark noise[cite: 18].

## 2. Layout Structure
The app utilizes a **3-Column** or **Dashboard** layout.

### A. The Skeleton (Left Sidebar) [Image 1]
* **Purpose:** Hierarchical navigation.
* **Components:** Tree view showing `Root > Payload > Data_Block_1`.
* **Behavior:** Clicking a node selects the corresponding byte range in the Matrix.

### B. The Matrix / Radar (Center Stage)
* **View 1: Hilbert Map (Global):**
    * [cite_start]Square visualization using Deck.gl[cite: 81].
    * Pixel-dense representation of the entire file.
* **View 2: Hex Editor (Micro):**
    * Fixed-width font (Monospace).
    * [cite_start]Grid system: Offset (Left), Hex Bytes (Center), ASCII (Right)[cite: 89].
    * Highlighting: Active selection is outlined in Cyan/Neon Blue [Image 1].

### C. The Inspector / Pipeline (Right/Bottom Panel)
* **Inspector:** Shows value interpretations (As Integer, As Float, As Timestamp) [Image 1].
* **Pipeline (The Unmasker):** Node-based or Stack-based UI for applying operations (XOR -> Rotate -> Inflate) [Image 2].

## 3. Color Palette (Strict Adherence)
* **Background:** `#0d1117` (Deep almost-black).
* [cite_start]**Text/H1:** `#3b82f6` (Neon Blue) – Used for TIP data[cite: 85].
* [cite_start]**Metadata/H2:** `#ef4444` (Red)[cite: 86].
* [cite_start]**Encrypted/H3:** `#000000` (Black/Dark Grey)[cite: 84].
* [cite_start]**Vendor Pattern:** `#a855f7` (Purple)[cite: 87].
* **UI Accents:** Cyan (`#06b6d4`) for borders and active selections [Image 1].

## 4. Typography
* **Data/Code:** `JetBrains Mono`, `Fira Code`, or `Roboto Mono`.
* **UI Labels:** `Inter` or `Segoe UI`.