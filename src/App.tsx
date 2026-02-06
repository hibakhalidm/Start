import React, { useState, useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'; // LAYOUT ENGINE
// import { Maximize2, Minimize2, MoreVertical } from 'lucide-react'; // ICONS - Not used yet, keep clean

import { useAnalysisEngine } from './hooks/useAnalysisEngine';
import { HilbertCurve } from './utils/hilbert';
import Radar from './components/Radar';
import HexView, { HexViewRef } from './components/HexView';
import SemanticScrollbar from './components/SemanticScrollbar';
import AutocorrelationGraph from './components/AutocorrelationGraph';
import FileTree from './components/FileTree';
import './App.css';

function App() {
    const { isReady, analyzeFile, result, isAnalyzing } = useAnalysisEngine();

    // State
    const [fileData, setFileData] = useState<Uint8Array | null>(null);
    const [fileObj, setFileObj] = useState<File | null>(null);
    const [hoveredOffset, setHoveredOffset] = useState<number | null>(null);
    const [selectionRange, setSelectionRange] = useState<{ start: number, end: number } | null>(null);

    // Constants
    const [hilbert] = useState(() => new HilbertCurve(9)); // 512x512
    const hexViewRef = useRef<HexViewRef>(null);

    // --- HANDLERS ---

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFileObj(file);
            analyzeFile(file);
            const buffer = await file.arrayBuffer();
            setFileData(new Uint8Array(buffer));
        }
    };

    const handleHexSelection = (start: number, end: number) => {
        // SYNC: Hex Selection -> Radar
        setSelectionRange({ start, end });
    };

    const handleRadarJump = (offset: number) => {
        // SYNC: Radar Click -> Hex Jump
        setHoveredOffset(offset);
        hexViewRef.current?.scrollToOffset(offset);
        setSelectionRange({ start: offset, end: offset + 16 }); // Auto-select row
    };

    return (
        <div className="app-container" style={{ height: '100vh', width: '100vw', background: 'var(--bg-deep)' }}>

            {/* TOP BAR */}
            <div className="toolbar" style={{ height: '40px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
                <span className="logo" style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>CIFAD</span>
                <span style={{ margin: '0 10px', color: '#555' }}>/</span>
                <input type="file" onChange={handleFileChange} style={{ fontSize: '12px', color: '#fff' }} disabled={!isReady || isAnalyzing} />
            </div>

            {/* DYNAMIC LAYOUT */}
            <PanelGroup direction="horizontal">

                {/* LEFT: SKELETON */}
                <Panel defaultSize={20} minSize={10} collapsible={true} className="bg-panel cyber-border-right">
                    <div className="panel-header">EXPLORER</div>
                    <FileTree file={fileObj} onNodeSelect={handleRadarJump} />
                </Panel>

                <PanelResizeHandle className="resize-handle" />

                {/* CENTER: COCKPIT */}
                <Panel minSize={30}>
                    <PanelGroup direction="vertical">

                        {/* TOP: GLOBAL RADAR */}
                        <Panel defaultSize={60} minSize={20}>
                            <div style={{ height: '100%', position: 'relative' }}>
                                <div className="panel-header" style={{ position: 'absolute', zIndex: 10, top: 0, left: 0 }}>GLOBAL RADAR</div>
                                {isReady && result ? (
                                    <Radar
                                        matrix={result.hilbert_matrix}
                                        highlightOffset={hoveredOffset}
                                        selectionRange={selectionRange}
                                        hilbert={hilbert}
                                        onJump={handleRadarJump}
                                    />
                                ) : <div className="flex-center" style={{ height: '100%', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>NO SIGNAL</div>}
                            </div>
                        </Panel>

                        <PanelResizeHandle className="resize-handle-horizontal" />

                        {/* BOTTOM: MATRIX */}
                        <Panel minSize={20}>
                            <div style={{ display: 'flex', height: '100%' }}>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div className="panel-header">MATRIX</div>
                                    {fileData && (
                                        <HexView
                                            ref={hexViewRef}
                                            data={fileData}
                                            onScroll={(off) => setHoveredOffset(off)}
                                        />
                                    )}
                                </div>
                                <div style={{ width: '24px', borderLeft: '1px solid #333' }}>
                                    {result && (
                                        <SemanticScrollbar
                                            entropyMap={result.entropy_map}
                                            onScroll={(p) => handleRadarJump(Math.floor(fileData!.length * p))}
                                            currentPercent={fileData && hoveredOffset ? hoveredOffset / fileData.length : 0}
                                        />
                                    )}
                                </div>
                            </div>
                        </Panel>

                    </PanelGroup>
                </Panel>

                <PanelResizeHandle className="resize-handle" />

                {/* RIGHT: INSPECTOR */}
                <Panel defaultSize={25} minSize={15} collapsible={true} className="bg-panel cyber-border-left">
                    <div className="panel-header">INSPECTOR</div>
                    <div style={{ padding: '20px' }}>
                        {result?.autocorrelation_graph && (
                            <AutocorrelationGraph data={result.autocorrelation_graph} />
                        )}
                        <h3 className="panel-header" style={{ background: 'none', paddingLeft: 0, marginTop: '20px' }}>METADATA</h3>
                        {result && (
                            <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.85rem', color: '#888' }}>
                                <li>ENTROPY: <span style={{ color: '#fff' }}>{(result.entropy_map.reduce((a, b) => a + b, 0) / result.entropy_map.length).toFixed(2)}</span></li>
                                <li>SIZE: <span style={{ color: '#fff' }}>{fileData?.length.toLocaleString()} BYTES</span></li>
                            </ul>
                        )}
                        {/* Pipeline Placeholders */}
                    </div>
                </Panel>

            </PanelGroup>
        </div>
    );
}

export default App;