import React, { useState, useRef, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useAnalysisEngine } from './hooks/useAnalysisEngine';
import { HilbertCurve } from './utils/hilbert';
import Radar from './components/Radar';
import HexView, { HexViewRef } from './components/HexView';
import SemanticScrollbar from './components/SemanticScrollbar';
import AutocorrelationGraph from './components/AutocorrelationGraph';
import FileTree from './components/FileTree';
import TransformationPipeline from './components/TransformationPipeline';
import './App.css';

// 64KB Chunk Size for "Zero-Copy" feel
const CHUNK_SIZE = 64 * 1024;

// Simple JS Autocorrelation for "Live" preview (run on small chunks)
const calculateLocalAutocorrelation = (data: Uint8Array): number[] => {
    if (!data || data.length < 16) return [];
    const maxLag = Math.min(64, Math.floor(data.length / 2));
    const results = [];

    for (let lag = 1; lag < maxLag; lag++) {
        let sum = 0;
        let count = 0;
        for (let i = 0; i < data.length - lag; i++) {
            // Normalized diff
            const diff = Math.abs(data[i] - data[i + lag]);
            sum += (255 - diff); // Higher = more similar
            count++;
        }
        results.push(sum / count / 255); // 0.0 to 1.0
    }
    return results;
};

function App() {
    const { isReady, analyzeFile, result, isAnalyzing } = useAnalysisEngine();

    // Zero-Copy State
    const [fileObj, setFileObj] = useState<File | null>(null);
    const [viewWindow, setViewWindow] = useState<{ start: number; data: Uint8Array } | null>(null);

    // UI State
    const [hoveredOffset, setHoveredOffset] = useState<number | null>(null);
    const [selectionRange, setSelectionRange] = useState<{ start: number, end: number } | null>(null);

    const [hilbert] = useState(() => new HilbertCurve(9));
    const hexViewRef = useRef<HexViewRef>(null);

    // Load a specific chunk from the file without reading the whole thing
    const loadChunk = useCallback(async (startOffset: number, file: File) => {
        // Clamp offset
        if (startOffset < 0) startOffset = 0;
        if (startOffset >= file.size) return;

        const endOffset = Math.min(startOffset + CHUNK_SIZE, file.size);
        const blob = file.slice(startOffset, endOffset);
        const buffer = await blob.arrayBuffer();
        const data = new Uint8Array(buffer);

        setViewWindow({
            start: startOffset,
            data
        });
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFileObj(file);

            // 1. Trigger Async Analysis (WASM)
            analyzeFile(file);

            // 2. Load Initial Chunk for UI (Header)
            await loadChunk(0, file);
        }
    };

    // Scroll Handler from HexView
    const handleHexScroll = (offset: number) => {
        setHoveredOffset(offset);

        // If the user scrolls outside our current window, load a new chunk
        if (fileObj && viewWindow) {
            const relative = offset - viewWindow.start;
            const bufferZone = 4096; // 4KB buffer before triggering new load

            if (relative < 0 || relative > (viewWindow.data.length - bufferZone)) {
                // Determine new window start (center around current offset)
                // Align to 16 bytes for cleanliness
                const newStart = Math.max(0, offset - (CHUNK_SIZE / 2));
                const alignedStart = Math.floor(newStart / 16) * 16;

                // Avoid redundant loads (simple check)
                if (Math.abs(alignedStart - viewWindow.start) > 4096) {
                    loadChunk(alignedStart, fileObj).catch(console.error);
                }
            }
        }
    };

    const handleRadarJump = (offset: number) => {
        handleRangeSelect(offset, offset + 16);
    };

    const handleHexSelection = (start: number, end: number) => {
        setSelectionRange({ start, end });
        // Optional: Also highlight on Radar immediately
        // setHoveredOffset(start); 
    };

    // 1. CALCULATE SELECTED BYTES (Adapted for Zero-Copy)
    const selectedBytes = React.useMemo(() => {
        if (!viewWindow || !selectionRange) return null;

        // We can only preview bytes if they are currently loaded in the viewWindow
        const valStart = selectionRange.start;
        const valEnd = selectionRange.end;

        // Check intersection with loaded window
        const winStart = viewWindow.start;
        const winEnd = winStart + viewWindow.data.length;

        if (valStart >= winStart && valStart < winEnd) {
            const relStart = valStart - winStart;
            // Limit preview to ~1KB for performance
            const length = Math.min(valEnd - valStart, 1024);
            const relEnd = Math.min(relStart + length, viewWindow.data.length);

            return viewWindow.data.subarray(relStart, relEnd);
        }

        return null; // Bytes not in memory
    }, [viewWindow, selectionRange]);

    // Calculate Graph Data dynamically
    const liveGraphData = React.useMemo(() => {
        // If selection exists, show LOCAL analysis
        if (selectedBytes && selectedBytes.length > 0) {
            return calculateLocalAutocorrelation(selectedBytes);
        }
        // Fallback to GLOBAL analysis from WASM
        return result?.autocorrelation_graph || [];
    }, [selectedBytes, result]);

    // 2. UNIFIED SELECTION HANDLER
    const handleRangeSelect = (start: number, end: number) => {
        setSelectionRange({ start, end });
        setHoveredOffset(start);

        // Jump the Hex View to this location
        hexViewRef.current?.scrollToOffset(start);

        // Ensure we load the data for this location so the pipeline can see it
        if (fileObj) {
            // Check if we need to load a new chunk
            if (!viewWindow || start < viewWindow.start || start > (viewWindow.start + viewWindow.data.length)) {
                // Determine new window start (center around target)
                const newStart = Math.max(0, start - (CHUNK_SIZE / 2));
                const alignedStart = Math.floor(newStart / 16) * 16;
                loadChunk(alignedStart, fileObj);
            }
        }
    };

    return (
        <div className="app-container" style={{
            height: '100%',
            width: '100%',
            background: 'var(--bg-deep)',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* TOOLBAR */}
            <div className="toolbar" style={{
                height: '40px',
                borderBottom: '1px solid #333',
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                flexShrink: 0
            }}>
                <span className="logo" style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>CIFAD</span>
                <span style={{ margin: '0 10px', color: '#555' }}>/</span>
                <input type="file" onChange={handleFileChange} style={{ fontSize: '12px', color: '#ccc' }} />
            </div>

            {/* LAYOUT ENGINE */}
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                <PanelGroup direction="horizontal">
                    {/* LEFT */}
                    <Panel defaultSize={20} minSize={10} collapsible={true} className="bg-panel cyber-border-right">
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div className="panel-header">EXPLORER</div>
                            <div style={{ flex: 1, overflow: 'auto' }}>
                                <FileTree
                                    file={fileObj}
                                    fileSize={fileObj?.size || 0}
                                    signatures={result?.signatures || []}
                                    onSelectRange={handleRangeSelect}
                                />
                            </div>
                        </div>
                    </Panel>
                    <PanelResizeHandle className="resize-handle" />

                    {/* CENTER */}
                    <Panel minSize={30}>
                        <PanelGroup direction="vertical">
                            <Panel defaultSize={60} minSize={20}>
                                <div style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
                                    <div className="panel-header" style={{ position: 'absolute', zIndex: 10 }}>GLOBAL RADAR</div>
                                    {isReady && result ? (
                                        <Radar
                                            matrix={result.hilbert_matrix}
                                            highlightOffset={hoveredOffset}
                                            selectionRange={selectionRange}
                                            hilbert={hilbert}
                                            onJump={handleRadarJump}
                                        />
                                    ) : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                                        {isAnalyzing ? "ANALYZING..." : "NO SIGNAL"}
                                    </div>}
                                </div>
                            </Panel>
                            <PanelResizeHandle className="resize-handle-horizontal" />
                            <Panel minSize={20}>
                                <div style={{ display: 'flex', height: '100%' }}>
                                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                        <div className="panel-header">MATRIX</div>
                                        <div style={{ flex: 1 }}>
                                            <HexView
                                                ref={hexViewRef}
                                                window={viewWindow}
                                                totalFileSize={fileObj?.size || 0}
                                                selectionRange={selectionRange}
                                                onSelect={handleHexSelection}
                                                onScroll={handleHexScroll}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ width: '24px', borderLeft: '1px solid #333' }}>
                                        {result && <SemanticScrollbar entropyMap={result.entropy_map} onScroll={(p) => handleRadarJump(Math.floor((fileObj?.size || 0) * p))} currentPercent={0} />}
                                    </div>
                                </div>
                            </Panel>
                        </PanelGroup>
                    </Panel>
                    <PanelResizeHandle className="resize-handle" />

                    {/* RIGHT */}
                    <Panel defaultSize={25} minSize={15} collapsible={true} className="bg-panel cyber-border-left">
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div className="panel-header">INSPECTOR</div>
                            <div style={{ padding: '20px', borderBottom: '1px solid #333' }}>
                                <div style={{
                                    fontSize: '0.7rem',
                                    color: selectedBytes ? 'var(--accent-cyan)' : '#888',
                                    marginBottom: '5px'
                                }}>
                                    {selectedBytes ? 'LOCAL PERIODICITY (SELECTION)' : 'GLOBAL PERIODICITY (FILE)'}
                                </div>
                                <AutocorrelationGraph data={liveGraphData} />
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <TransformationPipeline selectedBytes={selectedBytes} />
                            </div>
                        </div>
                    </Panel>
                </PanelGroup>
            </div>
        </div>
    );
}

export default App;