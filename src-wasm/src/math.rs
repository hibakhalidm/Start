// src-wasm/src/math.rs
// Mathematical analysis engine: Shannon entropy, Hilbert mapping, autocorrelation.
// All functions are pure — no allocations shared with the WASM boundary.

const HILBERT_SIZE: usize = 512;
const HILBERT_PIXELS: usize = HILBERT_SIZE * HILBERT_SIZE;

// ── Entropy ──────────────────────────────────────────────────────────────────

pub fn calculate_entropy_sliding_window(data: &[u8], window_size: usize) -> Vec<f64> {
    let step = 1024.max(data.len() / 2000); // ~2000 data points max
    let mut entropies = Vec::with_capacity(data.len() / step + 1);
    for window in data.chunks(window_size).step_by(step / window_size + 1) {
        entropies.push(shannon_entropy(window));
    }
    entropies
}

pub fn shannon_entropy(data: &[u8]) -> f64 {
    if data.is_empty() { return 0.0; }
    let mut counts = [0usize; 256];
    for &b in data { counts[b as usize] += 1; }
    let len = data.len() as f64;
    let mut entropy = 0.0;
    for &count in &counts {
        if count > 0 {
            let p = count as f64 / len;
            entropy -= p * p.log2();
        }
    }
    entropy
}

// ── Hilbert Curve ─────────────────────────────────────────────────────────────

/// Map raw bytes onto a 512×512 Hilbert-curve pixel matrix.
/// Bytes are permuted from file order into Hilbert XY order so that
/// BitmapLayer renders the correct space-filling curve.
pub fn generate_hilbert_matrix(data: &[u8]) -> Vec<u8> {
    let mut matrix = vec![0u8; HILBERT_PIXELS];
    let n = 1usize << 9; // 2^9 = 512
    for (i, &byte) in data.iter().take(HILBERT_PIXELS).enumerate() {
        let (x, y) = d2xy(n, i);
        if y < n && x < n {
            matrix[y * n + x] = byte;
        }
    }
    matrix
}

/// Convert a Hilbert distance `d` to (x, y) coordinates for an n×n grid.
pub fn d2xy(n: usize, d: usize) -> (usize, usize) {
    let mut x = 0usize;
    let mut y = 0usize;
    let mut s = 1usize;
    let mut t = d;
    while s < n {
        let rx = 1 & (t / 2);
        let ry = 1 & (t ^ rx);
        let (nx, ny) = rot(s, x, y, rx, ry);
        x = nx + s * rx;
        y = ny + s * ry;
        t /= 4;
        s *= 2;
    }
    (x, y)
}

fn rot(n: usize, mut x: usize, mut y: usize, rx: usize, ry: usize) -> (usize, usize) {
    if ry == 0 {
        if rx == 1 {
            x = n - 1 - x;
            y = n - 1 - y;
        }
        return (y, x);
    }
    (x, y)
}

// ── Autocorrelation ───────────────────────────────────────────────────────────

/// Sliding-window autocorrelation over first 64 KB, lags 0..512.
/// Normalized so the strongest non-zero spike = 1.0.
pub fn calculate_autocorrelation_graph(data: &[u8]) -> Vec<f64> {
    let len = data.len().min(65536);
    let sample = &data[..len];
    let max_lag = 512.min(len);
    if max_lag == 0 { return Vec::new(); }

    let mut graph = Vec::with_capacity(max_lag);
    let mut max_score: f64 = 0.0;

    for lag in 0..max_lag {
        let comparisons = len - lag;
        if comparisons == 0 { graph.push(0.0); continue; }
        let match_count = (0..comparisons)
            .filter(|&i| sample[i] == sample[i + lag])
            .count();
        let score = match_count as f64 / comparisons as f64;
        if lag > 0 && score > max_score { max_score = score; }
        graph.push(score);
    }

    // Normalize — spikes are visible against noise
    let scale = if max_score > 0.0 { 1.0 / max_score } else { 1.0 };
    for v in graph.iter_mut().skip(1) { *v *= scale; }
    if !graph.is_empty() { graph[0] = 1.0; }
    graph
}

/// Quick heuristic: returns true if a 32-byte header block repeats within 4 KB.
pub fn detect_autocorrelation(data: &[u8]) -> bool {
    if data.len() < 1024 { return false; }
    let header_size = 32;
    let search_limit = 4096.min(data.len());
    let header = &data[..header_size];
    for i in header_size..search_limit {
        let end = (i + header_size).min(data.len());
        if &data[i..end] == &header[..(end - i)] { return true; }
    }
    false
}
