import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from 'react';
import { Folder, ChevronDown, ChevronRight, Box, Shield, Minimize2, Maximize2 } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';
const FileTree = ({ file, fileSize = 0, structures, standard, selectionOffset, onSelectRange, onHoverRange, onNodeSelect }) => {
    const [viewMode, setViewMode] = useState('simple');
    const [isMinimized, setIsMinimized] = useState(false);
    const [expandedOffsets, setExpandedOffsets] = useState(new Set());
    const listRef = useRef(null);
    // Expand nodes that contain the selection
    useEffect(() => {
        if (!structures || selectionOffset === null || selectionOffset === undefined)
            return;
        let changed = false;
        const newExpanded = new Set(expandedOffsets);
        const ensurePathExpanded = (nodes) => {
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
        if (changed)
            setExpandedOffsets(newExpanded);
    }, [structures, selectionOffset]);
    const toggleExpand = (offset) => {
        const next = new Set(expandedOffsets);
        if (next.has(offset))
            next.delete(offset);
        else
            next.add(offset);
        setExpandedOffsets(next);
    };
    const flatTree = React.useMemo(() => {
        if (!structures || structures.length === 0)
            return [];
        const result = [];
        const traverse = (nodes, depth) => {
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
    const Row = ({ index, style }) => {
        const { node, depth, expanded, hasChildren, containsSelection } = flatTree[index];
        const endOffset = node.offset + node.tag_length + node.value_length;
        return (_jsx("div", { style: style, children: _jsxs("div", { style: {
                    display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '2px 4px',
                    marginLeft: `${depth * 12}px`, fontSize: '0.75rem',
                    background: containsSelection && !hasChildren ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
                    color: containsSelection && !hasChildren ? '#fff' : '#aaa',
                }, onClick: (e) => {
                    e.stopPropagation();
                    onSelectRange(node.offset, endOffset);
                    if (onNodeSelect)
                        onNodeSelect(node);
                    if (hasChildren)
                        toggleExpand(node.offset);
                }, onMouseEnter: (e) => { e.stopPropagation(); onHoverRange({ start: node.offset, end: endOffset }); }, onMouseLeave: () => onHoverRange(null), children: [hasChildren ? (expanded ? _jsx(ChevronDown, { size: 12, color: "#555" }) : _jsx(ChevronRight, { size: 12, color: "#555" })) : _jsx("span", { style: { width: '12px' } }), node.is_container ? _jsx(Folder, { size: 12, color: containsSelection ? "#fff" : "var(--accent-blue)", style: { marginLeft: '4px', flexShrink: 0 } }) : _jsx(Box, { size: 12, color: containsSelection ? "#fff" : "#555", style: { marginLeft: '4px', flexShrink: 0 } }), _jsx("span", { style: { marginLeft: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, children: node.name })] }) }));
    };
    if (!file)
        return _jsx("div", { style: { padding: '30px', color: '#444', fontSize: '0.75rem', textAlign: 'center' }, children: "NO SIGNAL SOURCE" });
    const simpleSections = [
        { name: "FILE HEADER", start: 0, end: Math.min(1024, fileSize), color: '#00ff9d' },
        { name: "DATA PAYLOAD", start: Math.min(1024, fileSize), end: Math.max(fileSize - 1024, 0), color: 'var(--accent-cyan)' },
        { name: "METADATA FOOTER", start: Math.max(fileSize - 1024, 0), end: fileSize, color: '#bd00ff' }
    ];
    return (_jsxs("div", { className: "file-tree", style: { height: '100%', display: 'flex', flexDirection: 'column' }, children: [_jsxs("div", { className: "panel-header", children: [_jsxs("div", { style: { display: 'flex', gap: '15px' }, children: [_jsx("span", { onClick: () => setViewMode('simple'), style: { cursor: 'pointer', color: viewMode === 'simple' ? 'var(--accent-cyan)' : '#555' }, children: "SECTIONS" }), _jsx("span", { onClick: () => setViewMode('detailed'), style: { cursor: 'pointer', color: viewMode === 'detailed' ? 'var(--accent-cyan)' : '#555' }, children: "TREE" })] }), _jsx("button", { onClick: () => setIsMinimized(!isMinimized), style: { background: 'none', border: 'none', color: '#555', cursor: 'pointer' }, children: isMinimized ? _jsx(Maximize2, { size: 12 }) : _jsx(Minimize2, { size: 12 }) })] }), !isMinimized && (_jsxs("div", { style: { flex: 1, overflow: 'auto', padding: '15px' }, children: [standard && (_jsxs("div", { style: { marginBottom: '20px', padding: '8px 10px', background: 'rgba(0, 255, 157, 0.05)', borderLeft: '2px solid #00ff9d' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', color: '#00ff9d', fontSize: '0.7rem', letterSpacing: '1px' }, children: [_jsx(Shield, { size: 10, style: { marginRight: '6px' } }), " VERIFIED STANDARD"] }), _jsx("div", { style: { color: '#eee', fontSize: '0.85rem', marginTop: '4px' }, children: standard.name })] })), viewMode === 'detailed' ? (flatTree.length > 0 ? (_jsx("div", { style: { paddingLeft: '0px', height: '100%', minHeight: '400px' }, children: _jsx(List, { ref: listRef, height: 600, itemCount: flatTree.length, itemSize: 24, width: "100%", children: Row }) })) : _jsx("div", { style: { color: '#555', fontSize: '0.75rem' }, children: "Parsing stream..." })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '1px' }, children: simpleSections.map((sec, i) => (_jsxs("div", { onClick: () => onSelectRange(sec.start, sec.end), style: { padding: '12px', background: '#0a0a0a', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `2px solid ${sec.color}` }, children: [_jsx("div", { style: { color: '#ccc', fontSize: '0.75rem' }, children: sec.name }), _jsxs("div", { style: { color: '#555', fontSize: '0.7rem' }, children: [((sec.end - sec.start) / 1024).toFixed(1), " KB"] })] }, i))) }))] }))] }));
};
export default FileTree;
//# sourceMappingURL=FileTree.js.map