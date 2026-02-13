import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useAnalysisEngine } from './hooks/useAnalysisEngine';
import { HilbertCurve } from './utils/hilbert';
import { detectStandard, DetectedStandard } from './utils/standards';
import { generateReport } from './utils/export';
import { Download, Eye, EyeOff } from 'lucide-react'; // Import Eye icons

import Radar from './components/Radar';
import HexView, { HexViewRef } from './components/HexView';
import SemanticScrollbar from './components/SemanticScrollbar';
import AutocorrelationGraph from './components/AutocorrelationGraph';
import FileTree from './components/FileTree';
import StructureInspector from './components/StructureInspector';
import TransformationPipeline from './components/TransformationPipeline';
import { TlvNode } from './types/analysis';
import './App.css';

const calculateLocalAutocorrelation = (data: Uint8Array): number[] => { return []; };

function App() {
    const { isReady, analyzeFile, result } = useAnalysisEngine();
    const [fileData, setFileData] = useState<Uint8Array | null>(null);
    const [fileObj, setFileObj] = useState<File | null>(null);

    // View Options State
    const [showHilbert, setShowHilbert] = useState(true);
    const [showHeatmap, setShowHeatmap] = useState(true);

    const [hoveredOffset, setHoveredOffset] = useState<number | null>(null);
    const [selectionRange, setSelectionRange] = useState<{ start: number, end: number } | null>(null);
    const [hoverRange, setHoverRange] = useState<{ start: number, end: number } | null>(null);
    const [standard, setStandard] = useState<DetectedStandard | null>(null);
    const [selectedNode, setSelectedNode] = useState<TlvNode | null>(null);
    const [currentScrollOffset, setCurrentScrollOffset] = useState(0);

    const [hexStride, setHexStride] = useState(16);
    const [hilbert] = useState(() => new HilbertCurve(9));
    const hexViewRef = useRef<HexViewRef>(null);

    // ... (handleFileChange, handleJumpTo, handleScrollUpdate, useEffect, useMemos SAME AS BEFORE) ...
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFileObj(file);
            setStandard(null);
            setSelectionRange(null);
            setSelectedNode(null);
            analyzeFile(file);
            const buffer = await file.arrayBuffer();
            setFileData(new Uint8Array(buffer));
        }
    };

    const handleJumpTo = (offset: number, length: number = 16) => {
        setSelectionRange({ start: offset, end: offset + length });
        hexViewRef.current?.scrollToOffset(offset);
    };

    const handleScrollUpdate = (offset: number) => {
        setCurrentScrollOffset(offset);
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

    const currentViewPercent = fileData ? currentScrollOffset / fileData.length : 0;

    return (
        <div className="app-container" style={{ height: '100%', width: '100%', background: 'var(--bg-deep)', display: 'flex', flexDirection: 'column' }}>
            {/* TOOLBAR */}
            <div className="toolbar" style={{ height: '40px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', padding: '0 20px', flexShrink: 0, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="logo" style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>CIFAD</span>
                    <span style={{ margin: '0 10px', color: '#555' }}>/</span>
                    <input type="file" onChange={handleFileChange} style={{ fontSize: '12px', color: '#ccc' }} />
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                    {/* VIEW OPTIONS */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRight: '1px solid #333', paddingRight: '15px' }}>
                        <label style={{ fontSize: '11px', color: showHilbert ? '#fff' : '#666', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={showHilbert} onChange={(e) => setShowHilbert(e.target.checked)} />
                            Radar
                        </label>
                        <label style={{ fontSize: '11px', color: showHeatmap ? '#fff' : '#666', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={showHeatmap} onChange={(e) => setShowHeatmap(e.target.checked)} />
                            Heatmap
                        </label>
                    </div>

                    <button
                        onClick={() => fileObj && result && generateReport(fileObj, result, standard)}
                        disabled={!result}
                        style={{
                            background: result ? 'rgba(0, 240, 255, 0.1)' : '#222',
                            color: result ? 'var(--accent-cyan)' : '#555',
                            border: result ? '1px solid var(--accent-cyan)' : '1px solid #333',
                            padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: result ? 'pointer' : 'not-allowed',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        <Download size={14} /> EXPORT JSON
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                <PanelGroup direction="horizontal">
                    {/* LEFT PANEL */}
                    <Panel defaultSize={20} minSize={10} className="bg-panel cyber-border-right">
                        <FileTree
                            file={fileObj}
                            fileSize={fileData?.length}
                            structures={result?.parsed_structures}
                            standard={standard}
                            selectionOffset={selectionRange?.start ?? null}
                            onSelectRange={(s, e) => handleJumpTo(s, e - s)}
                            onHoverRange={setHoverRange}
                            onNodeSelect={(node) => setSelectedNode(node)}
                        />
                    </Panel>
                    <PanelResizeHandle className="resize-handle" />

                    {/* CENTER PANEL */}
                    <Panel minSize={30}>
                        <PanelGroup direction="vertical">
                            {/* TOP: RADAR (TOGGLEABLE) */}
                            {showHilbert && (
                                <>
                                    <Panel defaultSize={40} minSize={20}>
                                        <div style={{ height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                                            <div className="panel-header" style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}>GLOBAL SIGNAL (ENTROPY & HILBERT)</div>
                                            {isReady && result ? (
                                                <Radar
                                                    matrix={result.hilbert_matrix}
                                                    entropyMap={result.entropy_map}
                                                    highlightOffset={hoveredOffset}
                                                    selectionRange={selectionRange}
                                                    hilbert={hilbert}
                                                    onJump={(off) => handleJumpTo(off)}
                                                />
                                            ) : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>NO SIGNAL</div>}
                                        </div>
                                    </Panel>
                                    <PanelResizeHandle className="resize-handle-horizontal" />
                                </>
                            )}

                            {/* MIDDLE: GLOBAL RHYTHM */}
                            <Panel defaultSize={15} minSize={10} collapsible={true}>
                                <AutocorrelationGraph
                                    fileData={fileData}
                                    onLagSelect={(off) => handleJumpTo(off)}
                                />
                            </Panel>
                            <PanelResizeHandle className="resize-handle-horizontal" />

                            {/* BOTTOM: MICRO VIEW (Matrix) */}
                            <Panel minSize={20}>
                                <div style={{ display: 'flex', height: '100%' }}>
                                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                        <div className="panel-header">RAW MATRIX</div>
                                        <div style={{ flex: 1 }}>
                                            {fileData && (
                                                <HexView
                                                    ref={hexViewRef}
                                                    data={fileData}
                                                    stride={hexStride}
                                                    selectionRange={selectionRange}
                                                    hoverRange={hoverRange}
                                                    onSelect={(s, e) => { setSelectionRange({ start: s, end: e }); }}
                                                    onScroll={handleScrollUpdate}
                                                />
                                            )}
                                        </div>
                                    </div>
                                    {/* HEATMAP SCROLLBAR (TOGGLEABLE) */}
                                    {showHeatmap && (
                                        <div style={{ width: '24px', borderLeft: '1px solid #333' }}>
                                            {result && (
                                                <SemanticScrollbar
                                                    entropyMap={result.entropy_map}
                                                    currentPercent={currentViewPercent}
                                                    onScroll={(p) => handleJumpTo(Math.floor(fileData!.length * p))}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </Panel>
                        </PanelGroup>
                    </Panel>
                    <PanelResizeHandle className="resize-handle" />

                    {/* RIGHT PANEL: INSPECTOR */}
                    <Panel defaultSize={25} minSize={20} className="bg-panel cyber-border-left">
                        <div className="panel-header">DETAILS</div>
                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: 'calc(100% - 30px)' }}>
                            {selectedNode ? (
                                <StructureInspector node={selectedNode} fileData={fileData} onFocus={(s, e) => handleJumpTo(s, e - s)} />
                            ) : (
                                <div style={{ marginTop: '20px' }}>
                                    <TransformationPipeline selectedBytes={selectedBytes} />
                                </div>
                            )}
                        </div>
                    </Panel>
                </PanelGroup>
            </div>
        </div>
    );
}

export default App;