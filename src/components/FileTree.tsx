import React, { useState, useEffect, useRef } from 'react';
import { Folder, ChevronDown, ChevronRight, Box, Shield, Minimize2, Maximize2 } from 'lucide-react';
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

import { FixedSizeList as List } from 'react-window';

interface FlatNode {
    node: TlvNode;
    depth: number;
    expanded: boolean;
    hasChildren: boolean;
    containsSelection: boolean;
}

const FileTree: React.FC<Props> = ({ file, fileSize = 0, structures, standard, selectionOffset, onSelectRange, onHoverRange, onNodeSelect }) => {
    const [viewMode, setViewMode] = useState<'simple' | 'detailed'>('simple');
    const [isMinimized, setIsMinimized] = useState(false);
    const [expandedOffsets, setExpandedOffsets] = useState<Set<number>>(new Set());
    const listRef = useRef<List>(null);

    // Expand nodes that contain the selection
    useEffect(() => {
        if (!structures || selectionOffset === null || selectionOffset === undefined) return;

        let changed = false;
        const newExpanded = new Set(expandedOffsets);

        const ensurePathExpanded = (nodes: TlvNode[]) => {
            for (const node of nodes) {
                const endOffset = node.offset + node.tag_length + node.value_length;
                const contains = selectionOffset >= node.offset && selectionOffset < endOffset;

                if (contains && node.children && node.children.length > 0) {
                    if (!newExpanded.has(node.offset)) {
                        newExpanded.add(node.offset);
                        changed = true;
                    }
                    ensurePathExpanded(node.children);
                }
            }
        };

        ensurePathExpanded(structures);
        if (changed) setExpandedOffsets(newExpanded);
    }, [structures, selectionOffset]);

    const toggleExpand = (offset: number) => {
        const next = new Set(expandedOffsets);
        if (next.has(offset)) next.delete(offset);
        else next.add(offset);
        setExpandedOffsets(next);
    };

    const flatTree = React.useMemo(() => {
        if (!structures || structures.length === 0) return [];
        const result: FlatNode[] = [];

        const traverse = (nodes: TlvNode[], depth: number) => {
            for (const node of nodes) {
                const isExpanded = expandedOffsets.has(node.offset);
                const hasChildren = !!(node.children && node.children.length > 0);
                const endOffset = node.offset + node.tag_length + node.value_length;
                const containsSel = selectionOffset !== undefined && selectionOffset !== null && selectionOffset >= node.offset && selectionOffset < endOffset;

                result.push({ node, depth, expanded: isExpanded, hasChildren, containsSelection: containsSel });

                if (isExpanded && hasChildren) {
                    traverse(node.children, depth + 1);
                }
            }
        };

        traverse(structures, 0);
        return result;
    }, [structures, expandedOffsets, selectionOffset]);

    // Auto-scroll to selected node via ref
    useEffect(() => {
        if (selectionOffset !== null && selectionOffset !== undefined && flatTree.length > 0) {
            const idx = flatTree.findIndex(f => f.containsSelection && !f.hasChildren);
            if (idx >= 0 && listRef.current) {
                listRef.current.scrollToItem(idx, 'center');
            }
        }
    }, [selectionOffset, flatTree]);

    const Row = ({ index, style }: { index: number, style: React.CSSProperties }) => {
        const { node, depth, expanded, hasChildren, containsSelection } = flatTree[index];
        const endOffset = node.offset + node.tag_length + node.value_length;

        return (
            <div style={style}>
                <div
                    style={{
                        display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '2px 4px',
                        marginLeft: `${depth * 12}px`, fontSize: '0.75rem',
                        background: containsSelection && !hasChildren ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
                        color: containsSelection && !hasChildren ? '#fff' : '#aaa',
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelectRange(node.offset, endOffset);
                        if (onNodeSelect) onNodeSelect(node);
                        if (hasChildren) toggleExpand(node.offset);
                    }}
                    onMouseEnter={(e) => { e.stopPropagation(); onHoverRange({ start: node.offset, end: endOffset }); }}
                    onMouseLeave={() => onHoverRange(null)}
                >
                    {hasChildren ? (expanded ? <ChevronDown size={12} color="#555" /> : <ChevronRight size={12} color="#555" />) : <span style={{ width: '12px' }} />}
                    {node.is_container ? <Folder size={12} color={containsSelection ? "#fff" : "var(--accent-blue)"} style={{ marginLeft: '4px', flexShrink: 0 }} /> : <Box size={12} color={containsSelection ? "#fff" : "#555"} style={{ marginLeft: '4px', flexShrink: 0 }} />}
                    <span style={{ marginLeft: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</span>
                </div>
            </div>
        );
    };

    if (!file) return <div style={{ padding: '30px', color: '#444', fontSize: '0.75rem', textAlign: 'center' }}>NO SIGNAL SOURCE</div>;

    const simpleSections = [
        { name: "FILE HEADER", start: 0, end: Math.min(1024, fileSize), color: '#00ff9d' },
        { name: "DATA PAYLOAD", start: Math.min(1024, fileSize), end: Math.max(fileSize - 1024, 0), color: 'var(--accent-cyan)' },
        { name: "METADATA FOOTER", start: Math.max(fileSize - 1024, 0), end: fileSize, color: '#bd00ff' }
    ];

    return (
        <div className="file-tree" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header">
                <div style={{ display: 'flex', gap: '15px' }}>
                    <span onClick={() => setViewMode('simple')} style={{ cursor: 'pointer', color: viewMode === 'simple' ? 'var(--accent-cyan)' : '#555' }}>SECTIONS</span>
                    <span onClick={() => setViewMode('detailed')} style={{ cursor: 'pointer', color: viewMode === 'detailed' ? 'var(--accent-cyan)' : '#555' }}>TREE</span>
                </div>
                <button onClick={() => setIsMinimized(!isMinimized)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>
                    {isMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
                </button>
            </div>

            {!isMinimized && (
                <div style={{ flex: 1, overflow: 'auto', padding: '15px' }}>
                    {standard && (
                        <div style={{ marginBottom: '20px', padding: '8px 10px', background: 'rgba(0, 255, 157, 0.05)', borderLeft: '2px solid #00ff9d' }}>
                            <div style={{ display: 'flex', alignItems: 'center', color: '#00ff9d', fontSize: '0.7rem', letterSpacing: '1px' }}>
                                <Shield size={10} style={{ marginRight: '6px' }} /> VERIFIED STANDARD
                            </div>
                            <div style={{ color: '#eee', fontSize: '0.85rem', marginTop: '4px' }}>{standard.name}</div>
                        </div>
                    )}

                    {viewMode === 'detailed' ? (
                        flatTree.length > 0 ? (
                            <div style={{ paddingLeft: '0px', height: '100%', minHeight: '400px' }}>
                                <List ref={listRef} height={600} itemCount={flatTree.length} itemSize={24} width="100%">
                                    {Row}
                                </List>
                            </div>
                        ) : <div style={{ color: '#555', fontSize: '0.75rem' }}>Parsing stream...</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            {/* NO BOXES: Just sleek rows separated by 1px gaps */}
                            {simpleSections.map((sec, i) => (
                                <div
                                    key={i} onClick={() => onSelectRange(sec.start, sec.end)}
                                    style={{ padding: '12px', background: '#0a0a0a', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `2px solid ${sec.color}` }}
                                >
                                    <div style={{ color: '#ccc', fontSize: '0.75rem' }}>{sec.name}</div>
                                    <div style={{ color: '#555', fontSize: '0.7rem' }}>{((sec.end - sec.start) / 1024).toFixed(1)} KB</div>
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
