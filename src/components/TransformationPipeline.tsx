import React, { useState, useMemo } from 'react';

interface Props {
    selectedBytes: Uint8Array | null;
}

const TransformationPipeline: React.FC<Props> = ({ selectedBytes }) => {
    const [operations, setOperations] = useState<string[]>([]);

    // 1. SIMULATE PIPELINE (MVP: Just XOR for now)
    const processedData = useMemo(() => {
        if (!selectedBytes) return null;
        if (operations.length === 0) return selectedBytes;

        // Apply operations (Mock logic for v3.0)
        return selectedBytes.map(b => b ^ 0xFF); // Example: Simple XOR
    }, [selectedBytes, operations]);

    // Helper to render preview
    const renderPreview = (data: Uint8Array | null) => {
        if (!data) return <span style={{ color: '#555' }}>No Selection</span>;
        const preview = Array.from(data.slice(0, 32)); // Show first 32 bytes
        const hex = preview.map(b => b.toString(16).padStart(2, '0')).join(' ');
        return (
            <div>
                <div style={{ fontFamily: 'monospace', color: 'var(--accent-blue)', fontSize: '0.8rem' }}>{hex} {data.length > 32 ? '...' : ''}</div>
                <div style={{ fontFamily: 'monospace', color: '#fff', fontSize: '0.8rem', opacity: 0.7 }}>
                    {preview.map(b => (b > 31 && b < 127 ? String.fromCharCode(b) : '.')).join('')}
                </div>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* INPUT PREVIEW */}
            <div style={{ padding: '15px', borderBottom: '1px solid #333', background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '5px', textTransform: 'uppercase' }}>Pipeline Input</div>
                {renderPreview(selectedBytes)}
            </div>

            {/* OPERATIONS LIST */}
            <div style={{ flex: 1, padding: '15px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>OPERATIONS</span>
                    <button
                        onClick={() => setOperations([...operations, 'XOR 0xFF'])}
                        style={{
                            background: 'var(--accent-cyan)', color: '#000', border: 'none',
                            fontSize: '0.7rem', padding: '2px 8px', cursor: 'pointer', fontWeight: 'bold'
                        }}
                    >
                        + ADD XOR
                    </button>
                </div>

                {operations.map((op, i) => (
                    <div key={i} style={{
                        background: '#1a1a20', padding: '8px', marginBottom: '5px',
                        borderLeft: '2px solid var(--accent-cyan)', fontSize: '0.8rem'
                    }}>
                        {op}
                        <button
                            onClick={() => setOperations(operations.filter((_, idx) => idx !== i))}
                            style={{ float: 'right', background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            {/* OUTPUT PREVIEW */}
            <div style={{ padding: '15px', borderTop: '1px solid #333', background: 'rgba(0, 240, 255, 0.05)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', marginBottom: '5px', textTransform: 'uppercase' }}>Result</div>
                {renderPreview(processedData)}
            </div>
        </div>
    );
};

export default TransformationPipeline;
