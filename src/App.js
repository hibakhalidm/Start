import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useMemo, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useAnalysisEngine } from './hooks/useAnalysisEngine';
import { HilbertCurve } from './utils/hilbert';
import { detectStandard } from './utils/standards';
import { generateReport } from './utils/export';
import { Download, HardDrive, Activity, MousePointer2, FileType } from 'lucide-react';
import Radar from './components/Radar';
import HexView from './components/HexView';
import SemanticScrollbar from './components/SemanticScrollbar';
import AutocorrelationGraph from './components/AutocorrelationGraph';
import FileTree from './components/FileTree';
import StructureInspector from './components/StructureInspector';
import TransformationPipeline from './components/TransformationPipeline';
import './App.css';
function App() {
    const { isReady, analyzeFile, result } = useAnalysisEngine();
    const [fileData, setFileData] = useState(null);
    const [fileObj, setFileObj] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    // --- VIEW OPTIONS STATE ---
    const [showHilbert, setShowHilbert] = useState(true);
    const [showHeatmap, setShowHeatmap] = useState(true);
    const [showInspector, setShowInspector] = useState(true);
    const [showPipeline, setShowPipeline] = useState(true);
    const [hoveredOffset, setHoveredOffset] = useState(null);
    const [selectionRange, setSelectionRange] = useState(null);
    const [hoverRange, setHoverRange] = useState(null);
    const [standard, setStandard] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const [currentScrollOffset, setCurrentScrollOffset] = useState(0);
    const [hexStride, setHexStride] = useState(16);
    const [hilbert] = useState(() => new HilbertCurve(9));
    const hexViewRef = useRef(null);
    const handleFileChange = async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // FORENSIC MEMORY FIREWALL
            const MAX_FILE_SIZE = 256 * 1024 * 1024; // 256 MB Limit for Browser Sandbox
            if (file.size > MAX_FILE_SIZE) {
                alert(`FORENSIC WARNING: File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds safe memory boundaries for live browser analysis.`);
                return;
            }
            await processFile(file);
        }
    };
    const processFile = async (file) => {
        setFileObj(file);
        setStandard(null);
        setSelectionRange(null);
        setSelectedNode(null);
        analyzeFile(file);
        const buffer = await file.arrayBuffer();
        setFileData(new Uint8Array(buffer));
    };
    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            // FORENSIC MEMORY FIREWALL
            const MAX_FILE_SIZE = 256 * 1024 * 1024; // 256 MB Limit for Browser Sandbox
            if (file.size > MAX_FILE_SIZE) {
                alert(`FORENSIC WARNING: File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds safe memory boundaries for live browser analysis. Please carve or split the evidence file to < 256MB before ingestion to prevent memory corruption.`);
                return;
            }
            await processFile(file);
        }
    };
    const handleJumpTo = (offset, length = 16) => {
        setSelectionRange({ start: offset, end: offset + length });
        hexViewRef.current?.scrollToOffset(offset);
    };
    const handleScrollUpdate = (offset) => {
        setCurrentScrollOffset(offset);
    };
    const handleEditByte = async (index, newByte) => {
        if (!fileData || !fileObj)
            return;
        // 1. Create a brand new copy of the array in memory
        const updatedData = new Uint8Array(fileData);
        // 2. Apply the forensic edit
        updatedData[index] = newByte;
        // 3. Update the React State with the NEW array
        setFileData(updatedData);
        // 4. Re-package into a File object for the analyzer
        const newFile = new File([updatedData], fileObj.name, { type: fileObj.type, lastModified: Date.now() });
        setFileObj(newFile);
        // 5. Force the WASM engine to re-analyze the new payload
        setTimeout(() => {
            analyzeFile(newFile);
        }, 50);
    };
    useEffect(() => {
        // Pass BOTH parsed structures AND raw bytes to detect signatures (PCAP, CR)
        setStandard(detectStandard(result?.parsed_structures, fileData, result?.entropy_map));
    }, [result, fileData]);
    const selectedBytes = useMemo(() => {
        if (!fileData || !selectionRange)
            return null;
        return fileData.slice(selectionRange.start, Math.min(selectionRange.end, selectionRange.start + 65536));
    }, [fileData, selectionRange]);
    // NEW PRECISE REVERSE LOOKUP ALGORITHM
    const activeInspectorNode = useMemo(() => {
        // If the user clicked a specific tree node, always show that first
        if (selectedNode)
            return selectedNode;
        // If the user hasn't selected any hex bytes, or we haven't parsed the file, abort
        if (!selectionRange || !result?.parsed_structures)
            return null;
        const targetOffset = selectionRange.start;
        // Recursive helper to traverse the tree and find the smallest encompassing TLV block
        const findDeepestNode = (nodes) => {
            let bestMatch = null;
            for (const node of nodes) {
                const nodeStart = node.offset;
                const nodeEnd = node.offset + node.tag_length + node.value_length;
                // Does our hex cursor fall exactly inside this protocol block?
                if (targetOffset >= nodeStart && targetOffset < nodeEnd) {
                    bestMatch = node; // Found a match at this level
                    // If it's a container (like a Sequence), dive deeper to find the narrowest leaf
                    if (node.is_container && node.children && node.children.length > 0) {
                        const deeperMatch = findDeepestNode(node.children);
                        if (deeperMatch) {
                            return deeperMatch; // Return the smallest child covering the offset
                        }
                    }
                }
            }
            return bestMatch;
        };
        return findDeepestNode(result.parsed_structures);
    }, [selectedNode, selectionRange, result?.parsed_structures]);
    const currentViewPercent = fileData ? currentScrollOffset / fileData.length : 0;
    const isAnalyzing = !result && fileObj; // Simple heuristic for now
    const handleRadarHover = (offset) => {
        setHoveredOffset(offset);
        if (offset !== null) {
            setHoverRange({ start: offset, end: offset + 1 });
        }
        else {
            setHoverRange(null);
        }
    };
    return (_jsxs("div", { className: `app-container ${isDragging ? 'drop-active' : ''}`, onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop, style: { height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-deep)' }, children: [_jsxs("div", { className: "toolbar", style: { height: '40px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', padding: '0 20px', flexShrink: 0, justifyContent: 'space-between', background: '#0a0a0a' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center' }, children: [_jsx("span", { className: "logo", style: { color: 'var(--accent-cyan)', fontWeight: 'bold', letterSpacing: '1px' }, children: "CIFAD" }), _jsx("span", { style: { margin: '0 10px', color: '#333' }, children: "|" }), _jsx("input", { type: "file", onChange: handleFileChange, style: { fontSize: '12px', color: '#888' } })] }), _jsxs("div", { style: { display: 'flex', gap: '15px', alignItems: 'center' }, children: [_jsxs("div", { className: !fileData ? "disabled-toolbar" : "", style: { display: 'flex', gap: '2px', background: '#111', padding: '2px', borderRadius: '4px', border: '1px solid #333' }, children: [_jsx(ToggleButton, { label: "RADAR", active: showHilbert, onClick: () => setShowHilbert(!showHilbert) }), _jsx(ToggleButton, { label: "HEATMAP", active: showHeatmap, onClick: () => setShowHeatmap(!showHeatmap) }), _jsx("span", { style: { width: '1px', background: '#333', margin: '0 4px' } }), _jsx(ToggleButton, { label: "DETAILS", active: showInspector, onClick: () => setShowInspector(!showInspector) }), _jsx(ToggleButton, { label: "PIPELINE", active: showPipeline, onClick: () => setShowPipeline(!showPipeline) })] }), _jsxs("button", { onClick: () => fileObj && result && generateReport(fileObj, result, standard), disabled: !result, style: {
                                    background: result ? 'rgba(0, 240, 255, 0.1)' : '#222',
                                    color: result ? 'var(--accent-cyan)' : '#555',
                                    border: result ? '1px solid var(--accent-cyan)' : '1px solid #333',
                                    padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: result ? 'pointer' : 'not-allowed',
                                    display: 'flex', alignItems: 'center', gap: '6px'
                                }, children: [_jsx(Download, { size: 14 }), " EXPORT"] })] })] }), _jsx("div", { style: { flex: 1, minHeight: 0, position: 'relative' }, children: !fileData ? (
                // 1. PREMIUM EMPTY STATE
                _jsxs("div", { style: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#444' }, children: [_jsx("div", { style: { width: '100px', height: '100px', border: '2px dashed #333', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', animation: 'pulse-border 2s infinite' }, children: _jsx(Download, { size: 40, color: "#666" }) }), _jsx("h2", { style: { color: '#eee', marginBottom: '8px' }, children: "INITIALIZE ANALYSIS" }), _jsx("p", { style: { fontSize: '0.9rem' }, children: "Drag & Drop Signal File or Select from Toolbar" })] })) : (_jsxs(PanelGroup, { direction: "horizontal", children: [_jsx(Panel, { defaultSize: 20, minSize: 10, className: "bg-panel cyber-border-right", children: _jsx(FileTree, { file: fileObj, fileSize: fileData?.length, structures: result?.parsed_structures, standard: standard, selectionOffset: selectionRange?.start ?? null, onSelectRange: (s, e) => handleJumpTo(s, e - s), onHoverRange: setHoverRange, onNodeSelect: (node) => setSelectedNode(node) }) }), _jsx(PanelResizeHandle, { className: "resize-handle" }), _jsx(Panel, { minSize: 30, children: _jsxs(PanelGroup, { direction: "vertical", children: [showHilbert && (_jsxs(_Fragment, { children: [_jsx(Panel, { defaultSize: 40, minSize: 20, children: _jsxs("div", { style: { height: '100%', position: 'relative' }, children: [_jsx("div", { className: "panel-header", style: { position: 'absolute', top: 0, left: 0, zIndex: 10 }, children: "GLOBAL SIGNAL" }), isReady && result ? (_jsx(Radar, { matrix: result.hilbert_matrix, entropyMap: result.entropy_map, highlightOffset: hoveredOffset, selectionRange: selectionRange, hilbert: hilbert, onJump: (off) => handleJumpTo(off), onSelectRange: (start, end) => setSelectionRange({ start, end }), onHover: handleRadarHover })) : _jsx("div", { style: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }, children: "AWAITING ANALYSIS..." })] }) }), _jsx(PanelResizeHandle, { className: "resize-handle-horizontal" })] })), _jsx(Panel, { defaultSize: 15, minSize: 10, collapsible: true, children: _jsx(AutocorrelationGraph, { data: result?.autocorrelation_graph || [], onJump: (offset) => {
                                                handleJumpTo(offset);
                                                setSelectionRange({ start: offset, end: offset + 16 });
                                            } }) }), _jsx(PanelResizeHandle, { className: "resize-handle-horizontal" }), _jsx(Panel, { minSize: 20, children: _jsxs("div", { style: { display: 'flex', height: '100%' }, children: [_jsxs("div", { style: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }, children: [_jsx("div", { className: "panel-header", children: "RAW MATRIX" }), _jsx("div", { style: { flex: 1 }, children: fileData && (_jsx(HexView, { ref: hexViewRef, data: fileData, stride: hexStride, selectionRange: selectionRange, hoverRange: hoverRange, onSelect: (s, e) => { setSelectionRange({ start: s, end: e }); }, onScroll: handleScrollUpdate, onEditByte: handleEditByte })) })] }), showHeatmap && (_jsx("div", { style: { width: '24px', borderLeft: '1px solid #333' }, children: result && (_jsx(SemanticScrollbar, { entropyMap: result.entropy_map, currentPercent: currentViewPercent, onScroll: (p) => handleJumpTo(Math.floor(fileData.length * p)) })) }))] }) })] }) }), (showInspector || showPipeline) && (_jsxs(_Fragment, { children: [_jsx(PanelResizeHandle, { className: "resize-handle" }), _jsxs(Panel, { defaultSize: 25, minSize: 20, className: "bg-panel cyber-border-left", children: [_jsx("div", { className: "panel-header", children: "DETAILS" }), _jsxs("div", { style: { padding: '15px', display: 'flex', flexDirection: 'column', height: 'calc(100% - 30px)', gap: '15px', overflowY: 'auto' }, children: [showInspector && (_jsx("div", { style: { flexShrink: 0 }, children: _jsx(StructureInspector, { node: activeInspectorNode, fileData: fileData, selectionRange: selectionRange, onFocus: (s, e) => { if (s !== undefined && e !== undefined)
                                                            handleJumpTo(s, e - s); } }) })), showPipeline && (_jsxs("div", { style: { flex: 1, borderTop: showInspector ? '1px solid #333' : 'none', paddingTop: showInspector ? '15px' : '0' }, children: [_jsx("div", { style: { fontSize: '10px', color: '#666', marginBottom: '10px' }, children: "TRANSFORMATION PIPELINE" }), _jsx(TransformationPipeline, { selectedBytes: selectedBytes, fileData: fileData, fileObj: fileObj, analysisResult: result, detectedStandard: standard })] }))] })] })] }))] })) }), _jsxs("div", { style: {
                    height: '28px', background: '#0a0a0a', borderTop: '1px solid #333',
                    display: 'flex', alignItems: 'center', padding: '0 15px',
                    fontSize: '11px', color: '#888', gap: '20px', fontFamily: 'monospace'
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx(HardDrive, { size: 12, color: "var(--accent-blue)" }), _jsxs("span", { children: ["SIZE: ", fileObj ? (fileObj.size / 1024).toFixed(2) + ' KB' : 'N/A'] })] }), _jsx("div", { style: { width: '1px', height: '12px', background: '#333' } }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx(MousePointer2, { size: 12, color: selectionRange ? 'var(--accent-cyan)' : '#555' }), _jsxs("span", { children: ["SEL: ", selectionRange ? `0x${selectionRange.start.toString(16).toUpperCase()} (+${selectionRange.end - selectionRange.start})` : 'NONE'] })] }), _jsx("div", { style: { width: '1px', height: '12px', background: '#333' } }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx(FileType, { size: 12, color: standard ? '#00ff9d' : '#555' }), _jsxs("span", { style: { color: standard ? '#00ff9d' : 'inherit' }, children: ["TYPE: ", standard ? standard.name : 'RAW BINARY'] })] }), _jsxs("div", { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx(Activity, { size: 12, color: isAnalyzing ? '#ffff00' : '#00ff9d' }), _jsx("span", { children: isAnalyzing ? 'PROCESSING...' : 'READY' })] })] })] }));
}
// Helper for the Toggle Buttons
const ToggleButton = ({ label, active, onClick }) => (_jsx("button", { onClick: onClick, style: {
        background: active ? 'var(--accent-cyan)' : 'transparent',
        color: active ? '#000' : '#666',
        border: 'none', borderRadius: '2px', padding: '4px 8px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer',
        transition: 'all 0.2s'
    }, children: label }));
export default App;
//# sourceMappingURL=App.js.map