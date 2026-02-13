import React, { useState, useEffect, useRef } from 'react';
import { Folder, FileCode, ChevronDown, ChevronRight, Box, Shield, Layers, Code, Minimize2, Maximize2, FileDigit, Database, Layout } from 'lucide-react';
import { TlvNode } from '../types/analysis';
import { DetectedStandard } from '../utils/standards';

interface Props {
    file: File | null;
    fileSize?: number;
    structures?: TlvNode[];
    standard?: DetectedStandard | null;
    selectionOffset?: number | null;
    onSelectRange: (start: number, end: number) => void;
    onHoverRange: (range: { start: number, end: number } | null) => void;
    onNodeSelect?: (node: TlvNode) => void;
}

// ... (TreeNode component remains exactly the same as before) ...
const TreeNode: React.FC<{
    node: TlvNode,
    selectionOffset?: number | null,
    onSelect: (s: number, e: number) => void,
    onHover: (r: { start: number, end: number } | null) => void,
    onNodeClick?: (n: TlvNode) => void
}> = ({ node, selectionOffset, onSelect, onHover, onNodeClick }) => {
    const [expanded, setExpanded] = useState(false);
    const nodeRef = useRef<HTMLDivElement>(null);
    const hasChildren = node.children && node.children.length > 0;
    const endOffset = node.offset + node.tag_length + node.value_length;

    const containsSelection = selectionOffset !== undefined && selectionOffset !== null &&
        selectionOffset >= node.offset && selectionOffset < endOffset;

    useEffect(() => {
        if (containsSelection && hasChildren) setExpanded(true);
    }, [containsSelection, hasChildren]);

    useEffect(() => {
        if (containsSelection && !hasChildren && nodeRef.current) {
            nodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [containsSelection, hasChildren]);

    return (
        <div style={{ marginLeft: '12px', marginTop: '4px', fontSize: '0.8rem' }}>
            <div
                ref={nodeRef}
                style={{
                    display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px',
                    background: containsSelection && !hasChildren ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
                    color: containsSelection && !hasChildren ? '#fff' : '#ccc',
                    transition: 'all 0.2s'
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(node.offset, endOffset);
                    if (onNodeClick) onNodeClick(node);
                    if (hasChildren) setExpanded(!expanded);
                }}
                onMouseEnter={(e) => { e.stopPropagation(); onHover({ start: node.offset, end: endOffset }); }}
                onMouseLeave={() => onHover(null)}
            >
                {hasChildren ? (expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />) : <span style={{ width: '12px' }} />}
                {node.is_container ? <Folder size={12} color="var(--accent-blue)" style={{ marginLeft: '4px' }} /> : <Box size={12} color="var(--accent-cyan)" style={{ marginLeft: '4px' }} />}
                <span style={{ marginLeft: '6px' }}>{node.name}</span>
            </div>
            {expanded && hasChildren && (
                <div style={{ borderLeft: '1px solid #333' }}>
                    {node.children.map((child, i) => (
                        <TreeNode key={i} node={child} selectionOffset={selectionOffset} onSelect={onSelect} onHover={onHover} onNodeClick={onNodeClick} />
                    ))}
                </div>
            )}
        </div>
    );
};

const FileTree: React.FC<Props> = ({ file, fileSize = 0, structures, standard, selectionOffset, onSelectRange, onHoverRange, onNodeSelect }) => {
    // DEFAULT VIEW IS NOW 'SIMPLE'
    const [viewMode, setViewMode] = useState<'simple' | 'detailed'>('simple');
    const [isMinimized, setIsMinimized] = useState(false);

    if (!file) return <div style={{ padding: '20px', color: '#555', fontSize: '0.8rem' }}>No File Loaded</div>;

    // RESTORED OLD SECTION STYLE
    const simpleSections = [
        { name: "File Header", icon: <FileDigit size={14} color="#00ff9d" />, start: 0, end: Math.min(1024, fileSize), color: 'rgba(0, 255, 157, 0.1)' },
        { name: "Data Body", icon: <Database size={14} color="#00f0ff" />, start: Math.min(1024, fileSize), end: Math.max(fileSize - 1024, 0), color: 'rgba(0, 240, 255, 0.1)' },
        { name: "Metadata Overlay", icon: <Layout size={14} color="#bd00ff" />, start: Math.max(fileSize - 1024, 0), end: fileSize, color: 'rgba(189, 0, 255, 0.1)' }
    ];

    return (
        <div className="file-tree" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {/* SWAPPED ORDER: LAYERS FIRST */}
                    <button
                        onClick={() => setViewMode('simple')}
                        title="Simple Sections"
                        style={{ background: 'none', border: 'none', color: viewMode === 'simple' ? 'var(--accent-cyan)' : '#555', cursor: 'pointer' }}
                    >
                        <Layers size={14} />
                    </button>
                    <button
                        onClick={() => setViewMode('detailed')}
                        title="Detailed Structure"
                        style={{ background: 'none', border: 'none', color: viewMode === 'detailed' ? 'var(--accent-cyan)' : '#555', cursor: 'pointer' }}
                    >
                        <Code size={14} />
                    </button>
                </div>
                <button onClick={() => setIsMinimized(!isMinimized)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>
                    {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                </button>
            </div>

            {!isMinimized && (
                <div style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
                    {standard && (
                        <div style={{ marginBottom: '15px', padding: '10px', background: `rgba(0,0,0,0.3)`, border: `1px solid ${standard.color}`, borderRadius: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', color: standard.color, fontWeight: 'bold', fontSize: '0.8rem' }}>
                                <Shield size={14} style={{ marginRight: '6px' }} />
                                {standard.name}
                            </div>
                        </div>
                    )}

                    {viewMode === 'detailed' ? (
                        structures && structures.length > 0 ? (
                            <div style={{ borderLeft: '1px solid #333', paddingLeft: '4px' }}>
                                {structures.map((node, i) => (
                                    <TreeNode key={i} node={node} selectionOffset={selectionOffset} onSelect={onSelectRange} onHover={onHoverRange} onNodeClick={onNodeSelect} />
                                ))}
                            </div>
                        ) : <div style={{ color: '#555', fontSize: '0.8rem' }}>Scanning structure...</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {simpleSections.map((sec, i) => (
                                <div
                                    key={i}
                                    onClick={() => onSelectRange(sec.start, sec.end)}
                                    // RESTORED STYLING
                                    style={{
                                        padding: '10px',
                                        background: sec.color,
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        border: '1px solid transparent',
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        transition: 'all 0.2s'
                                    }}
                                    className="simple-section-hover"
                                >
                                    {sec.icon}
                                    <div>
                                        <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold' }}>{sec.name}</div>
                                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', marginTop: '2px' }}>
                                            0x{sec.start.toString(16).toUpperCase()} - 0x{sec.end.toString(16).toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FileTree;
