import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useAnalysisEngine } from './hooks/useAnalysisEngine';
import { HilbertCurve } from './utils/hilbert';
import { detectStandard, DetectedStandard } from './utils/standards';
import { generateReport } from './utils/export'; // <--- IMPORT EXPORT
import { Download } from 'lucide-react'; // <--- IMPORT ICON

import Radar from './components/Radar';
import HexView, { HexViewRef } from './components/HexView';
import SemanticScrollbar from './components/SemanticScrollbar';
import AutocorrelationGraph from './components/AutocorrelationGraph';
import FileTree from './components/FileTree';
import TransformationPipeline from './components/TransformationPipeline';
import './App.css';

const calculateLocalAutocorrelation = (data: Uint8Array): number[] => {
    if (!data || data.length < 16) return [];
    const maxLag = Math.min(64, Math.floor(data.length / 2));
    const results = [];
    for (let lag = 1; lag < maxLag; lag++) {
        let sum = 0, count = 0;
        for (let i = 0; i < data.length - lag; i++) {
            sum += (255 - Math.abs(data[i] - data[i + lag]));
            count++;
        }
        results.push(sum / count / 255);
    }
    return results;
};

function App() {
    const { isReady, analyzeFile, result } = useAnalysisEngine();
    const [fileData, setFileData] = useState<Uint8Array | null>(null);
    const [fileObj, setFileObj] = useState<File | null>(null);

    // Interactivity State
    const [hoveredOffset, setHoveredOffset] = useState<number | null>(null);
    const [selectionRange, setSelectionRange] = useState<{ start: number, end: number } | null>(null);
    const [hoverRange, setHoverRange] = useState<{ start: number, end: number } | null>(null); // <--- NEW STATE
    const [standard, setStandard] = useState<DetectedStandard | null>(null);

    const [hexStride, setHexStride] = useState(16);
    const [hilbert] = useState(() => new HilbertCurve(9));
    const hexViewRef = useRef<HexViewRef>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFileObj(file);
            setStandard(null);
            setSelectionRange(null);
            analyzeFile(file);
            const buffer = await file.arrayBuffer();
            setFileData(new Uint8Array(buffer));
        }
    };

    const handleRangeSelect = (start: number, end: number) => {
        setSelectionRange({ start, end });
        setHoveredOffset(start);
        hexViewRef.current?.scrollToOffset(start);
    };

    useEffect(() => {
        if (result?.parsed_structures) {
            setStandard(detectStandard(result.parsed_structures));
        }
    }, [result]);

    const selectedBytes = useMemo(() => {
        if (!fileData || !selectionRange) return null;
        return fileData.slice(selectionRange.start, Math.min(selectionRange.end, selectionRange.start + 65536));
    }, [fileData, selectionRange]);

    const liveGraphData = useMemo(() => {
        if (selectedBytes && selectedBytes.length > 0) return calculateLocalAutocorrelation(selectedBytes);
        return result?.autocorrelation_graph || [];
    }, [selectedBytes, result]);

    return (
        <div className="app-container" style={{ height: '100%', width: '100%', background: 'var(--bg-deep)', display: 'flex', flexDirection: 'column' }}>
            {/* TOOLBAR */}
            <div className="toolbar" style={{ height: '40px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', padding: '0 20px', flexShrink: 0, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="logo" style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>CIFAD</span>
                    <span style={{ margin: '0 10px', color: '#555' }}>/</span>
                    <input type="file" onChange={handleFileChange} style={{ fontSize: '12px', color: '#ccc' }} />
                </div>

                {/* EXPORT BUTTON */}
                <button
                    onClick={() => fileObj && result && generateReport(fileObj, result, standard)}
                    disabled={!result}
                    style={{
                        background: result ? 'rgba(0, 240, 255, 0.1)' : '#222',
                        color: result ? 'var(--accent-cyan)' : '#555',
                        border: result ? '1px solid var(--accent-cyan)' : '1px solid #333',
                        padding: '4px 12px', borderRadius: '4px',
                        fontSize: '11px', fontWeight: 'bold', cursor: result ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
                    }}
                >
                    <Download size={14} />
                    EXPORT JSON
                </button>
            </div>

            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                <PanelGroup direction="horizontal">
                    <Panel defaultSize={20} minSize={10} className="bg-panel cyber-border-right">
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div className="panel-header">EXPLORER</div>
                            <div style={{ flex: 1, overflow: 'auto' }}>
                                <FileTree
                                    file={fileObj}
                                    structures={result?.parsed_structures}
                                    standard={standard}

                                    // --- TWIN-VIEW CONNECTION ---
                                    selectionOffset={selectionRange?.start ?? null}
                                    // ----------------------------

                                    onSelectRange={handleRangeSelect}
                                    onHoverRange={setHoverRange} // <--- WIRE IT UP
                                />
                            </div>
                        </div>
                    </Panel>
                    <PanelResizeHandle className="resize-handle" />
                    <Panel minSize={30}>
                        <PanelGroup direction="vertical">
                            <Panel defaultSize={50} minSize={20}>
                                <div style={{ height: '100%', position: 'relative' }}>
                                    {isReady && result ? (
                                        <Radar
                                            matrix={result.hilbert_matrix}
                                            entropyMap={result.entropy_map}
                                            highlightOffset={hoveredOffset}
                                            selectionRange={selectionRange}
                                            hilbert={hilbert}
                                            onJump={(off) => handleRangeSelect(off, off + 16)}
                                        />
                                    ) : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>NO SIGNAL</div>}
                                </div>
                            </Panel>
                            <PanelResizeHandle className="resize-handle-horizontal" />
                            <Panel minSize={20}>
                                <div style={{ display: 'flex', height: '100%' }}>
                                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                        <div className="panel-header">MATRIX</div>
                                        <div style={{ flex: 1 }}>
                                            {fileData && (
                                                <HexView
                                                    ref={hexViewRef}
                                                    data={fileData}
                                                    stride={hexStride}
                                                    selectionRange={selectionRange}
                                                    hoverRange={hoverRange} // <--- PASS IT DOWN
                                                    onSelect={handleRangeSelect}
                                                    onScroll={(off) => setHoveredOffset(off)}
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ width: '24px', borderLeft: '1px solid #333' }}>
                                        {result && <SemanticScrollbar entropyMap={result.entropy_map} onScroll={(p) => setHoveredOffset(Math.floor(fileData!.length * p))} currentPercent={0} />}
                                    </div>
                                </div>
                            </Panel>
                        </PanelGroup>
                    </Panel>
                    <PanelResizeHandle className="resize-handle" />
                    <Panel defaultSize={30} minSize={20} className="bg-panel cyber-border-left">
                        <div className="panel-header">INSPECTOR</div>
                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: 'calc(100% - 30px)' }}>
                            <AutocorrelationGraph data={liveGraphData} onLagSelect={setHexStride} />
                            <div style={{ flex: 1, marginTop: '20px', overflow: 'hidden' }}>
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