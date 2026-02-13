import React, { useState } from 'react';
import { Folder, FileCode, ChevronDown, ChevronRight, Box } from 'lucide-react';
import { TlvNode } from '../types/analysis';

interface Props {
    file: File | null;
    fileSize?: number;
    structures?: TlvNode[];
    onSelectRange: (start: number, end: number) => void;
}

const TreeNode: React.FC<{ node: TlvNode, onSelect: (s: number, e: number) => void }> = ({ node, onSelect }) => {
    const [expanded, setExpanded] = useState(false);
    const hasChildren = node.children && node.children.length > 0;
    const endOffset = node.offset + node.tag_length + node.value_length;

    return (
        <div style={{ marginLeft: '12px', marginTop: '4px', fontSize: '0.8rem' }}>
            <div
                style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '2px 0' }}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(node.offset, endOffset);
                    if (hasChildren) setExpanded(!expanded);
                }}
            >
                {hasChildren ? (expanded ? <ChevronDown size={12} color="#888" /> : <ChevronRight size={12} color="#888" />) : <span style={{ width: '12px' }} />}
                {node.is_container ? <Folder size={12} color="var(--accent-blue)" style={{ marginLeft: '4px' }} /> : <Box size={12} color="var(--accent-cyan)" style={{ marginLeft: '4px' }} />}
                <span style={{ marginLeft: '6px', color: '#ccc' }}>{node.name}</span>
                <span style={{ marginLeft: 'auto', color: '#555', fontSize: '0.65rem' }}>[0x{node.offset.toString(16).toUpperCase()}] ({node.value_length}B)</span>
            </div>
            {expanded && hasChildren && (
                <div style={{ borderLeft: '1px solid #333' }}>
                    {node.children.map((child, i) => <TreeNode key={i} node={child} onSelect={onSelect} />)}
                </div>
            )}
        </div>
    );
};

const FileTree: React.FC<Props> = ({ file, structures, onSelectRange }) => {
    if (!file) return <div style={{ padding: '20px', color: '#555', fontSize: '0.8rem' }}>No File Loaded</div>;
    return (
        <div className="file-tree" style={{ padding: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-mono)', marginBottom: '10px' }}>
                <ChevronDown size={14} />
                <FileCode size={14} style={{ marginLeft: '5px', color: 'var(--accent-blue)' }} />
                <span style={{ marginLeft: '5px', fontSize: '0.85rem' }}>{file.name}</span>
            </div>
            {structures && structures.length > 0 ? (
                <div style={{ borderLeft: '1px solid #333', paddingLeft: '4px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', marginBottom: '5px', marginLeft: '12px' }}>PARSED ETSI/TLV STRUCTURES</div>
                    {structures.map((node, i) => <TreeNode key={i} node={node} onSelect={onSelectRange} />)}
                </div>
            ) : <div style={{ marginLeft: '20px', fontSize: '0.75rem', color: '#555' }}>Scanning for patterns...</div>}
        </div>
    );
};

export default FileTree;
