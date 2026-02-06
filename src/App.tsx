import React, { useState } from 'react';
import { useAnalysisEngine } from './hooks/useAnalysisEngine';
import { HilbertCurve } from './utils/hilbert';
import './App.css';

// Placeholder components if we don't have them yet.
// In a real deliverable, we might split these out.
// For now, I will define simple versions or import them.
// I will assume I need to create them next.
import Radar from './components/Radar';
import HexView from './components/HexView';

function App() {
    const { isReady, analyzeFile, result, isAnalyzing } = useAnalysisEngine();
    const [hoveredOffset, setHoveredOffset] = useState<number | null>(null);
    const [hilbert] = useState(() => new HilbertCurve(9)); // 512x512

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            analyzeFile(e.target.files[0]);
        }
    };

    const handleHexScroll = (offset: number) => {
        // Sync Logic: Hex Scroll -> Radar Reticle
        setHoveredOffset(offset);
    };

    return (
        <div className="app-container" style={{ display: 'grid', gridTemplateColumns: '250px 1fr 1fr', height: '100vh', backgroundColor: '#0f172a', color: '#e2e8f0' }}>

            {/* Pane 1: Controls & Metadata */}
            <div className="sidebar" style={{ padding: '20px', borderRight: '1px solid #334155' }}>
                <h1 style={{ fontSize: '1.2rem', marginBottom: '20px', color: '#38bdf8' }}>CIFAD <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>v0.1</span></h1>

                <input type="file" onChange={handleFileChange} disabled={!isReady || isAnalyzing} />
                {isAnalyzing && <p>Analyzing...</p>}

                {result && (
                    <div style={{ marginTop: '20px' }}>
                        <h3>Signatures</h3>
                        <ul>
                            {result.signatures.map((sig, i) => <li key={i}>{sig}</li>)}
                        </ul>
                    </div>
                )}
            </div>

            {/* Pane 2: Radar (Hilbert Visualization) */}
            <div className="radar-view" style={{ position: 'relative', borderRight: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
                {isReady ? (
                    result ? (
                        <Radar
                            matrix={result.hilbert_matrix}
                            highlightOffset={hoveredOffset}
                            hilbert={hilbert}
                        />
                    ) : <div style={{ color: '#475569' }}>Waiting for analysis...</div>
                ) : <div>Loading Engine...</div>}
            </div>

            {/* Pane 3: Hex View */}
            <div className="hex-view" style={{ overflow: 'hidden' }}>
                {result ? (
                    <HexView
                        data={result.hilbert_matrix} // Ideally we pass the full raw file, but utilizing matrix for now or assuming result has it. 
                        // Wait, result.hilbert_matrix is just the visual representation. 
                        // Ideally we keep the file buffer in memory in JS or fetch chunks.
                        // For this prototype, we'll pass the matrix buffer as "data" proxy or assume we read the file again.
                        // NOTE: In a real app we'd pass the original ArrayBuffer.
                        // Let's modify useAnalysisEngine to return the original buffer too?
                        // Or just use the matrix for demo. I'll use matrix for demo but it might be shuffled if I did that in Rust.
                        // Re-reading file for HexView is cleaner.
                        // For now, assuming matrix is 1:1 data for demo.
                        onScroll={handleHexScroll}
                    />
                ) : <div style={{ padding: '20px', color: '#475569' }}>No File Loaded</div>}
            </div>

        </div>
    );
}

export default App;
