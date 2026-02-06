import React from 'react';
import { Folder, FileCode, Binary, ChevronDown } from 'lucide-react';

interface Props {
    file: File | null;
    onNodeSelect: (offset: number) => void;
}

const FileTree: React.FC<Props> = ({ file, onNodeSelect }) => {
    if (!file) return <div className="p-4 text-gray-500" style={{ padding: '20px', color: '#555' }}>NO FILE LOADED</div>;

    return (
        <div className="file-tree" style={{ padding: '10px', fontSize: '0.85rem' }}>
            {/* Root Node */}
            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary)', marginBottom: '10px' }}>
                <ChevronDown size={14} />
                <Folder size={14} style={{ marginLeft: '5px', color: 'var(--accent-blue)' }} />
                <span style={{ marginLeft: '5px', fontWeight: 'bold' }}>{file.name}</span>
            </div>

            {/* Simulated Structure (In v4 this comes from Rust) */}
            <div style={{ marginLeft: '12px', borderLeft: '1px solid #333', paddingLeft: '12px' }}>
                {/* Header Node */}
                <div
                    className="tree-node"
                    onClick={() => onNodeSelect(0)}
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '4px 0', color: '#aaa' }}
                >
                    <FileCode size={12} style={{ color: 'var(--accent-cyan)' }} />
                    <span style={{ marginLeft: '8px' }}>HEADER [0x00]</span>
                </div>

                {/* Payload Node */}
                <div
                    className="tree-node"
                    onClick={() => onNodeSelect(1024)}
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '4px 0', color: '#aaa' }}
                >
                    <Binary size={12} style={{ color: 'var(--accent-red)' }} />
                    <span style={{ marginLeft: '8px' }}>PAYLOAD [0x400]</span>
                </div>

                {/* Metadata Node */}
                <div
                    className="tree-node"
                    onClick={() => onNodeSelect(2048)}
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '4px 0', color: '#aaa' }}
                >
                    <Binary size={12} style={{ color: 'var(--accent-blue)' }} />
                    <span style={{ marginLeft: '8px' }}>METADATA [0x800]</span>
                </div>
            </div>
        </div>
    );
};

export default FileTree;
