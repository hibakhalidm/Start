import React, { useState, useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
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
    const [fileData, setFileData] = useState<Uint8Array | null>(null);
    const [fileObj, setFileObj] = useState<File | null>(null);
    const [hoveredOffset, setHoveredOffset] = useState<number | null>(null);
    const [selectionRange, setSelectionRange] = useState<{ start: number, end: number } | null>(null);

    const [hilbert] = useState(() => new HilbertCurve(9));
    const hexViewRef = useRef<HexViewRef>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFileObj(file);
            analyzeFile(file);
            const buffer = await file.arrayBuffer();
            setFileData(new Uint8Array(buffer));
        }
    };

    const handleRadarJump = (offset: number) => {
        setHoveredOffset(offset);
        hexViewRef.current?.scrollToOffset(offset);
        setSelectionRange({ start: offset, end: offset + 16 });
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
                                <FileTree file={fileObj} onNodeSelect={handleRadarJump} />
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
                                    ) : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>NO SIGNAL</div>}
                                </div>
                            </Panel>
                            <PanelResizeHandle className="resize-handle-horizontal" />
                            <Panel minSize={20}>
                                <div style={{ display: 'flex', height: '100%' }}>
                                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                        <div className="panel-header">MATRIX</div>
                                        <div style={{ flex: 1 }}>
                                            {fileData && <HexView ref={hexViewRef} data={fileData} onScroll={(off) => setHoveredOffset(off)} />}
                                        </div>
                                    </div>
                                    <div style={{ width: '24px', borderLeft: '1px solid #333' }}>
                                        {result && <SemanticScrollbar entropyMap={result.entropy_map} onScroll={(p) => handleRadarJump(Math.floor(fileData!.length * p))} currentPercent={0} />}
                                    </div>
                                </div>
                            </Panel>
                        </PanelGroup>
                    </Panel>
                    <PanelResizeHandle className="resize-handle" />

                    {/* RIGHT */}
                    <Panel defaultSize={25} minSize={15} collapsible={true} className="bg-panel cyber-border-left">
                        <div className="panel-header">INSPECTOR</div>
                        <div style={{ padding: '20px' }}>
                            {result?.autocorrelation_graph && <AutocorrelationGraph data={result.autocorrelation_graph} />}
                        </div>
                    </Panel>
                </PanelGroup>
            </div>
        </div>
    );
}

export default App;