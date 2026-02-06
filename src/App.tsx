import React, { useState, useRef } from 'react';
import { useAnalysisEngine } from './hooks/useAnalysisEngine';
import { HilbertCurve } from './utils/hilbert';
import Radar from './components/Radar';
import HexView, { HexViewRef } from './components/HexView';
import SemanticScrollbar from './components/SemanticScrollbar'; // The new component
import './App.css';

function App() {
    const { isReady, analyzeFile, result, isAnalyzing } = useAnalysisEngine();
    const [hoveredOffset, setHoveredOffset] = useState<number | null>(null);
    const [fileData, setFileData] = useState<Uint8Array | null>(null);
    const [hilbert] = useState(() => new HilbertCurve(9)); // 512x512

    // Refs for synchronization
    const hexViewRef = useRef<HexViewRef>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            analyzeFile(file);
            const buffer = await file.arrayBuffer();
            setFileData(new Uint8Array(buffer));
        }
    };

    // 1. SYNC: Hex View Scrolled -> Update Radar & Scrollbar Thumb
    const handleHexScroll = (offset: number) => {
        setHoveredOffset(offset);
    };

    // 2. SYNC: Radar Clicked -> Jump Hex View
    const handleRadarJump = (offset: number) => {
        setHoveredOffset(offset);
        hexViewRef.current?.scrollToOffset(offset);
    };

    // 3. SYNC: Scrollbar Dragged -> Jump Hex View
    const handleScrollbarScrub = (percent: number) => {
        if (!fileData) return;
        const offset = Math.floor(fileData.length * percent);
        hexViewRef.current?.scrollToOffset(offset);
    };

    // Calculate current percentage for the scrollbar thumb
    const currentPercent = (fileData && hoveredOffset)
        ? (hoveredOffset / fileData.length)
        : 0;

    return (
        <div className="app-container" style={{
            display: 'grid',
            gridTemplateColumns: '280px 1fr 320px', // THE 3-PANE LAYOUT
            height: '100vh',
            width: '100vw'
        }}>

            {/* PANE 1: THE SKELETON (Left) */}
            <div className="bg-panel cyber-border-right" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="panel-header">FILE SYSTEM</div>
                <div style={{ padding: '20px' }}>
                    <input
                        type="file"
                        onChange={handleFileChange}
                        style={{ color: '#fff' }}
                        disabled={!isReady || isAnalyzing}
                    />
                    {isAnalyzing && <div style={{ color: 'var(--accent-cyan)', marginTop: '10px' }}>SCANNING...</div>}
                </div>
            </div>

            {/* PANE 2: THE TWIN-VIEW (Center) */}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* TOP: GLOBAL RADAR (60%) */}
                <div style={{ flex: '6', position: 'relative', borderBottom: '1px solid #333' }}>
                    <div className="panel-header" style={{ position: 'absolute', zIndex: 10, top: 0, left: 0 }}>GLOBAL RADAR</div>
                    {isReady && result ? (
                        <Radar
                            matrix={result.hilbert_matrix}
                            highlightOffset={hoveredOffset}
                            hilbert={hilbert}
                            onJump={handleRadarJump}
                        />
                    ) : <div className="flex-center" style={{ height: '100%', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>NO SIGNAL</div>}
                </div>

                {/* BOTTOM: MATRIX & SCROLLBAR (40%) */}
                <div style={{ flex: '4', display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>

                    {/* The Hex Matrix */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div className="panel-header">MATRIX VIEW</div>
                        <div style={{ flex: 1 }}>
                            {fileData ? (
                                <HexView
                                    ref={hexViewRef}
                                    data={fileData}
                                    onScroll={handleHexScroll}
                                />
                            ) : null}
                        </div>
                    </div>

                    {/* The Semantic Scrollbar (Fixed Width) */}
                    <div style={{ width: '24px', borderLeft: '1px solid #333' }}>
                        {result && (
                            <SemanticScrollbar
                                entropyMap={result.entropy_map}
                                onScroll={handleScrollbarScrub}
                                currentPercent={currentPercent}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* PANE 3: THE INSPECTOR (Right) */}
            <div className="bg-panel cyber-border-left">
                <div className="panel-header">INSPECTOR</div>
                <div style={{ padding: '20px' }}>
                    <h3 style={{ color: 'var(--accent-blue)', fontSize: '0.9rem' }}>METADATA</h3>
                    {result && (
                        <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.85rem', color: '#888' }}>
                            <li>ENTROPY: <span style={{ color: '#fff' }}>{(result.entropy_map.reduce((a, b) => a + b, 0) / result.entropy_map.length).toFixed(2)}</span></li>
                            <li>SIZE: <span style={{ color: '#fff' }}>{fileData?.length.toLocaleString()} BYTES</span></li>
                        </ul>
                    )}

                    <h3 style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem', marginTop: '20px' }}>SIGNATURES</h3>
                    {result?.signatures.map((sig, i) => (
                        <div key={i} style={{
                            background: 'rgba(0, 240, 255, 0.1)',
                            border: '1px solid var(--accent-cyan)',
                            padding: '5px',
                            fontSize: '0.8rem',
                            color: 'var(--accent-cyan)',
                            marginBottom: '5px'
                        }}>
                            {sig}
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}

export default App;