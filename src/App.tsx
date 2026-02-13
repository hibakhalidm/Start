import React, { useState, useRef, useMemo } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useAnalysisEngine } from './hooks/useAnalysisEngine';
import { HilbertCurve } from './utils/hilbert';
import Radar from './components/Radar';
import HexView, { HexViewRef } from './components/HexView';
import SemanticScrollbar from './components/SemanticScrollbar';
import AutocorrelationGraph from './components/AutocorrelationGraph';
import FileTree from './components/FileTree';
import TransformationPipeline from './components/TransformationPipeline';
import { detectStandard, DetectedStandard } from './utils/standards';
import './App.css';

// Local Periodicity Helper
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
    const [hoveredOffset, setHoveredOffset] = useState<number | null>(null);
    const [selectionRange, setSelectionRange] = useState<{ start: number, end: number } | null>(null);

    const [standard, setStandard] = useState<DetectedStandard | null>(null); // <--- ADD STATE
    const [hexStride, setHexStride] = useState(16); // <-- New State
    const [hilbert] = useState(() => new HilbertCurve(9));
    const hexViewRef = useRef<HexViewRef>(null);

    React.useEffect(() => {
        if (result?.parsed_structures) {
            const detected = detectStandard(result.parsed_structures);
            setStandard(detected);
        } else {
            setStandard(null);
        }
    }, [result]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFileObj(file);
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

    // Calculate Data specific to current selection
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
            <div className="toolbar" style={{ height: '40px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', padding: '0 20px', flexShrink: 0 }}>
                <span className="logo" style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>CIFAD</span>
                <span style={{ margin: '0 10px', color: '#555' }}>/</span>
                <input type="file" onChange={handleFileChange} style={{ fontSize: '12px', color: '#ccc' }} />
            </div>

            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                <PanelGroup direction="horizontal">

                    {/* LEFT PANEL */}
                    <Panel defaultSize={20} minSize={10} className="bg-panel cyber-border-right">
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div className="panel-header">EXPLORER</div>
                            <div style={{ flex: 1, overflow: 'auto' }}>
                                <FileTree file={fileObj} fileSize={fileData?.length} structures={result?.parsed_structures} standard={standard} onSelectRange={handleRangeSelect} />
                            </div>
                        </div>
                    </Panel>
                    <PanelResizeHandle className="resize-handle" />

                    {/* CENTER PANEL */}
                    <Panel minSize={30}>
                        <PanelGroup direction="vertical">
                            <Panel defaultSize={50} minSize={20}>
                                <div style={{ height: '100%', position: 'relative' }}>
                                    {isReady && result ? (
                                        <Radar matrix={result.hilbert_matrix} entropyMap={result.entropy_map} highlightOffset={hoveredOffset} selectionRange={selectionRange} hilbert={hilbert} onJump={(off) => handleRangeSelect(off, off + 16)} />
                                    ) : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>NO SIGNAL</div>}
                                </div>
                            </Panel>
                            <PanelResizeHandle className="resize-handle-horizontal" />
                            <Panel minSize={20}>
                                <div style={{ display: 'flex', height: '100%' }}>
                                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                        <div className="panel-header">MATRIX</div>
                                        <div style={{ flex: 1 }}>
                                            {fileData && <HexView ref={hexViewRef} data={fileData} stride={hexStride} selectionRange={selectionRange} onSelect={handleRangeSelect} onScroll={(off) => setHoveredOffset(off)} />}
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

                    {/* RIGHT PANEL */}
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