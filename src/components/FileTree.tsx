import React, { useState } from 'react';
import { Folder, FileCode, Binary, ChevronDown, ChevronRight, Fingerprint } from 'lucide-react';

interface Props {
    file: File | null;
    signatures: string[];
    onNodeSelect: (offset: number) => void;
}

const FileTree: React.FC<Props> = ({ file, signatures, onNodeSelect }) => {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ 'root': true, 'sigs': true });

    if (!file) return <div className="p-4 text-gray-500" style={{ padding: '20px', color: '#555' }}>NO FILE LOADED</div>;

    const toggle = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="file-tree" style={{ padding: '10px', fontSize: '0.85rem' }}>
            {/* Root Node */}
            <div
                onClick={() => toggle('root')}
                style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary)', marginBottom: '5px', cursor: 'pointer' }}
            >
                {expanded['root'] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Folder size={14} style={{ marginLeft: '5px', color: 'var(--accent-blue)' }} />
                <span style={{ marginLeft: '5px', fontWeight: 'bold' }}>{file.name}</span>
            </div>

            {expanded['root'] && (
                <div style={{ marginLeft: '12px', borderLeft: '1px solid #333', paddingLeft: '12px' }}>
                    {/* Metadata */}
                    <div style={{ marginBottom: '10px' }}>
                        <div style={{ color: '#777', fontSize: '0.75rem', marginBottom: '2px' }}>SIZE</div>
                        <div style={{ color: '#ccc' }}>{(file.size / 1024).toFixed(2)} KB</div>
                    </div>

                    {/* Signatures Folder */}
                    <div
                        onClick={() => toggle('sigs')}
                        style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary)', marginBottom: '5px', cursor: 'pointer' }}
                    >
                        {expanded['sigs'] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <Fingerprint size={14} style={{ marginLeft: '5px', color: 'var(--accent-red)' }} />
                        <span style={{ marginLeft: '5px' }}>Signatures</span>
                    </div>

                    {expanded['sigs'] && (
                        <div style={{ marginLeft: '12px', borderLeft: '1px solid #333', paddingLeft: '12px' }}>
                            {signatures.length > 0 ? (
                                signatures.map((sig, idx) => (
                                    <div key={idx} style={{ padding: '2px 0', color: 'var(--accent-cyan)' }}>
                                        {sig}
                                    </div>
                                ))
                            ) : (
                                <div style={{ color: '#555', fontStyle: 'italic' }}>None Detected</div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FileTree;
