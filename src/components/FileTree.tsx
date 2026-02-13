import React, { useState } from 'react';
import { Folder, FileCode, ChevronDown, ChevronRight, Box, ShieldCheck } from 'lucide-react';
import { TlvNode } from '../types/analysis';
import { DetectedStandard } from '../utils/standards';

interface Props {
    file: File | null;
    fileSize?: number;
    structures?: TlvNode[];
    standard?: DetectedStandard | null; // <-- NEW
    onSelectRange: (start: number, end: number) => void;
    onHoverRange: (range: { start: number, end: number } | null) => void; // <-- NEW INTERACTIVITY
}

const TreeNode: React.FC<{ node: TlvNode, onSelect: (s: number, e: number) => void, onHover: (r: { start: number, end: number } | null) => void }> = ({ node, onSelect, onHover }) => {
    const [expanded, setExpanded] = useState(false);
    const hasChildren = node.children && node.children.length > 0;
    const endOffset = node.offset + node.tag_length + node.value_length;

    return (
        <div style={{ marginLeft: '12px', marginTop: '4px', fontSize: '0.8rem' }}>
            <div
                style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '2px 0', opacity: 0.9, transition: 'opacity 0.2s' }}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(node.offset, endOffset);
                    if (hasChildren) setExpanded(!expanded);
                }}
                onMouseEnter={(e) => { e.stopPropagation(); onHover({ start: node.offset, end: endOffset }); }}
                onMouseLeave={() => onHover(null)}
            >
                {hasChildren ? (expanded ? <ChevronDown size={12} color="#888" /> : <ChevronRight size={12} color="#888" />) : <span style={{ width: '12px' }} />}
                {node.is_container ? <Folder size={12} color="var(--accent-blue)" style={{ marginLeft: '4px' }} /> : <Box size={12} color="var(--accent-cyan)" style={{ marginLeft: '4px' }} />}
                <span style={{ marginLeft: '6px', color: '#ccc' }}>{node.name}</span>
                <span style={{ marginLeft: 'auto', color: '#555', fontSize: '0.65rem' }}>[0x{node.offset.toString(16).toUpperCase()}]</span>
            </div>
            {expanded && hasChildren && (
                <div style={{ borderLeft: '1px solid #333' }}>
                    {node.children.map((child, i) => <TreeNode key={i} node={child} onSelect={onSelect} onHover={onHover} />)}
                </div>
            )}
        </div>
    );
};

const FileTree: React.FC<Props> = ({ file, structures, standard, onSelectRange, onHoverRange }) => {
    if (!file) return <div style={{ padding: '20px', color: '#555', fontSize: '0.8rem' }}>No File Loaded</div>;

    return (
        <div className="file-tree" style={{ padding: '10px' }}>
            {/* STANDARD RECOGNITION BADGE */}
            {standard && (
                <div style={{ marginBottom: '15px', padding: '10px', background: `rgba(0,0,0,0.3)`, border: `1px solid ${standard.color}`, borderRadius: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', color: standard.color, fontWeight: 'bold', fontSize: '0.8rem' }}>
                        <ShieldCheck size={14} style={{ marginRight: '6px' }} />
                        {standard.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#aaa', marginTop: '4px' }}>{standard.description}</div>
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-mono)', marginBottom: '10px' }}>
                <ChevronDown size={14} />
                <FileCode size={14} style={{ marginLeft: '5px', color: 'var(--accent-blue)' }} />
                <span style={{ marginLeft: '5px', fontSize: '0.85rem' }}>{file.name}</span>
            </div>
            {structures && structures.length > 0 ? (
                <div style={{ borderLeft: '1px solid #333', paddingLeft: '4px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', marginBottom: '5px', marginLeft: '12px' }}>PARSED STRUCTURES</div>
                    {structures.map((node, i) => <TreeNode key={i} node={node} onSelect={onSelectRange} onHover={onHoverRange} />)}
                </div>
            ) : <div style={{ marginLeft: '20px', fontSize: '0.75rem', color: '#555' }}>Scanning...</div>}
        </div>
    );
};

export default FileTree;
