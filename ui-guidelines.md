# UI/UX Design Guidelines
**Theme:** "Cyber-Forensic" (Tactical, Dark, High-Contrast)

## 1. Aesthetic Direction
* **Philosophy:** "Data is Light." The interface is deep void black; data is neon.
* **Constraint:** NO EMOJIS. Use SVG technical icons.
* **Inspiration:** The provided screenshots (`image_40797e.png`, `image_407693.png`)


## 2. Color Palette (Strict Adherence)
| Scope | Color Name | Hex Code | Usage |
| :--- | :--- | :--- | :--- |
| **Background** | **Deep Void** | `#050505` | App Background |
| | **Panel Black** | `#0a0a0f` | Components |
| **Accents** | **Neon Cyan** | `#00f0ff` | Selection, Active State, Scrollbar Reticle |
| | **Alert Red** | `#ff2a2a` | High Entropy / Encryption |
| | **Data Blue** | `#3b82f6` | Text / Structured Data |
| **Text** | **Mono** | `#e0e0e0` | Hex Data, Offsets |

## 3. Layout Structure: "The Vertical Stack"

**Grid Configuration:** `280px` (Left) | `1fr` (Center) | `320px` (Right)

### Pane A: The Skeleton (Left - 280px)
* **Component:** `FileTree`.
* **Visual:** Minimalist tree nodes. Connected by faint guide lines (`#333`).
* **Behavior:** Auto-expands to match the current Hex View offset.

### Pane B: The Twin-View Core (Center - 1fr)
* **Container:** Flex Column.
* **Top (60%): The Global Radar**
    * **Component:** `HilbertMap` (Square).
    * **Visual:** 2D Heatmap.
    * **Overlay:** A "Cyan Box" Reticle showing the current Hex View viewport.
* **Bottom (40%): The Matrix & Scrollbar**
    * **Container:** Grid `1fr` (Hex) | `24px` (Scrollbar).
    * **Component 1:** `HexView` (Raw Bytes).
    * **Component 2:** `SemanticScrollbar` (Right Edge).
        * **Visual:** A tall, thin strip visualizing file density/entropy.
        * **Interaction:** Replaces the native browser scrollbar.

### Pane C: The Inspector (Right - 320px)
* **Top:** **Autocorrelation Graph** (Neon Cyan line chart).
* **Middle:** **Data Inspector** (Int8, Float32, Timestamp).
* **Bottom:** **Transformation Pipeline** (XOR blocks).

## 4. Interaction Model
* **Hover:** Hovering the Radar highlights the corresponding byte range in the Hex View (Ghost selection).
* **Scroll:** Scrolling the Hex View moves the Reticle on the Radar AND the Thumb on the Semantic Scrollbar.