import React, { useState } from 'react';
import { Folder, FileCode, Binary, ChevronDown, Box } from 'lucide-react';

interface Props {
    file: File | null;
    fileSize?: number;
    signatures?: string[];
    // UPDATED: Now accepts a Range Handler
    onSelectRange: (start: number, end: number) => void;
}

const FileTree: React.FC<Props> = ({ file, fileSize = 0, signatures = [], onSelectRange }) => {
    if (!file) return <div className="p-4 text-gray-500" style={{ padding: '20px', color: '#555', fontSize: '0.8rem' }}>No File Loaded</div>;

    // Mock Structures (In v4.0, this comes from the WASM Parser)
    const headerSize = 1024; // Fake header
    const payloadStart = 1024;

    return (
        <div className="file-tree" style={{ padding: '10px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-mono)', marginBottom: '10px' }}>
                <ChevronDown size={14} />
                <Folder size={14} style={{ marginLeft: '5px', color: 'var(--accent-blue)' }} />
                <span style={{ marginLeft: '5px' }}>{file.name}</span>
            </div>

            <div style={{ marginLeft: '12px', borderLeft: '1px solid #333', paddingLeft: '12px' }}>
                {/* HEADER NODE */}
                <div
                    className="tree-node"
                    onClick={() => onSelectRange(0, headerSize)}
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginTop: '5px', color: '#ccc' }}
                >
                    <FileCode size={12} style={{ color: 'var(--accent-cyan)' }} />
                    <span style={{ marginLeft: '8px' }}>Header</span>
                    <span style={{ marginLeft: 'auto', color: '#555', fontSize: '0.7rem' }}>0x000</span>
                </div>

                {/* PAYLOAD NODE */}
                <div
                    className="tree-node"
                    onClick={() => onSelectRange(payloadStart, fileSize)}
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginTop: '8px', color: '#ccc' }}
                >
                    <Binary size={12} style={{ color: 'var(--accent-red)' }} />
                    <span style={{ marginLeft: '8px' }}>Data_Section</span>
                    <span style={{ marginLeft: 'auto', color: '#555', fontSize: '0.7rem' }}>0x400</span>
                </div>

                {/* ANOMALY NODE (Mock) */}
                <div
                    className="tree-node"
                    onClick={() => onSelectRange(fileSize - 2048, fileSize)}
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginTop: '8px', color: '#ccc' }}
                >
                    <Box size={12} style={{ color: '#ffcc00' }} />
                    <span style={{ marginLeft: '8px' }}>Overlay</span>
                    <span style={{ marginLeft: 'auto', color: '#555', fontSize: '0.7rem' }}>EOF</span>
                </div>

                {/* Detected Signatures (Preserved) */}
                {signatures.length > 0 && (
                    <div style={{ marginTop: '15px' }}>
                        <div style={{ color: '#555', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '5px' }}>
                            Signatures ({signatures.length})
                        </div>
                        {signatures.map((sig, i) => (
                            <div key={i} className="tree-node" style={{ color: '#888', paddingLeft: '8px', fontSize: '0.8rem' }}>
                                {sig}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileTree;
