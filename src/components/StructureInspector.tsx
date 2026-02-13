import React, { useState } from 'react';
import { Info, Ruler, Hash, Copy, Eye, Check, ArrowRight } from 'lucide-react';
import { TlvNode } from '../types/analysis';
import { getTagInfo } from '../utils/tag_dictionary';

interface Props {
    node: TlvNode | null;
    fileData: Uint8Array | null;
    onFocus?: (start: number, end: number) => void;
}

const StructureInspector: React.FC<Props> = ({ node, fileData, onFocus }) => {
    const [copied, setCopied] = useState<string | null>(null);

    if (!node || !fileData) {
        return (
            <div style={{ padding: '40px 20px', color: '#555', textAlign: 'center', fontStyle: 'italic', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <Info size={32} style={{ opacity: 0.3 }} />
                <div>Select a component to inspect.</div>
            </div>
        );
    }

    const info = getTagInfo(node.tag);

    // Calculate Value Range
    const valueStart = node.offset + node.tag_length + node.value_length_len;
    const valueEnd = valueStart + node.value_length;
    const valueBytes = fileData.slice(valueStart, valueEnd);

    // 1. RAW INPUT PREVIEW (Limit to 32 bytes for UI)
    const rawHex = Array.from(valueBytes.slice(0, 32))
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ') + (valueBytes.length > 32 ? ' ...' : '');

    // 2. DECODED OUTPUT
    let decodedValue = "Binary Data";
    let isText = false;

    if (node.tag === 0x02 && valueBytes.length <= 8) { // Integer
        const hex = Array.from(valueBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        const intVal = parseInt(hex, 16);
        decodedValue = intVal.toLocaleString();
    } else if ([0x04, 0x13, 0x0C, 0x17].includes(node.tag)) { // Strings
        const text = new TextDecoder().decode(valueBytes);
        if (/^[\x20-\x7E]*$/.test(text)) {
            decodedValue = `"${text}"`; // Add quotes to emphasize it's a string
            isText = true;
        }
    } else if (node.is_container) {
        decodedValue = `[Container] ${node.children.length} items`;
    }

    const handleCopy = (text: string, type: string) => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#eee', fontFamily: 'var(--font-mono)', height: '100%' }}>

            {/* HEADER */}
            <div style={{ borderBottom: '1px solid #333', paddingBottom: '12px' }}>
                <div style={{ fontSize: '10px', color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '4px' }}>COMPONENT TYPE</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {info.name}
                        <span style={{ fontSize: '0.7rem', color: '#888', background: '#222', padding: '2px 6px', borderRadius: '4px' }}>
                            0x{node.tag ? node.tag.toString(16).toUpperCase() : '??'}
                        </span>
                    </div>
                    {onFocus && (
                        <button onClick={() => onFocus(node.offset, valueEnd)} title="Focus in Matrix" style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer' }}>
                            <Eye size={16} />
                        </button>
                    )}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '4px', fontStyle: 'italic' }}>{info.description}</div>
            </div>

            {/* TRANSFORMATION DISPLAY */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                {/* INPUT BOX */}
                <div>
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>RAW BYTES (INPUT)</div>
                    <div style={{
                        background: '#151515', border: '1px solid #333', borderRadius: '4px', padding: '8px',
                        fontSize: '0.8rem', color: '#aaa', wordBreak: 'break-all'
                    }}>
                        {rawHex}
                    </div>
                </div>

                {/* ARROW */}
                <div style={{ display: 'flex', justifyContent: 'center', color: '#444' }}>
                    <ArrowRight size={14} />
                </div>

                {/* OUTPUT BOX */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--accent-cyan)' }}>DECODED (OUTPUT)</span>
                        <button onClick={() => handleCopy(decodedValue, 'dec')} style={{ background: 'none', border: 'none', color: copied === 'dec' ? '#0f0' : '#555', cursor: 'pointer', fontSize: '10px' }}>
                            {copied === 'dec' ? 'COPIED' : 'COPY'}
                        </button>
                    </div>
                    <div style={{
                        background: '#111', border: '1px solid var(--accent-cyan)', borderRadius: '4px', padding: '10px',
                        fontSize: '0.9rem', color: isText ? '#fff' : 'var(--accent-green)', fontWeight: 'bold',
                        wordBreak: 'break-all'
                    }}>
                        {decodedValue}
                    </div>
                </div>
            </div>

            {/* METRICS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: 'auto' }}>
                <div style={{ background: '#1a1a1a', padding: '8px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.65rem', color: '#666' }}>OFFSET</div>
                    <div style={{ fontSize: '0.8rem' }}>0x{node.offset.toString(16).toUpperCase()}</div>
                </div>
                <div style={{ background: '#1a1a1a', padding: '8px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.65rem', color: '#666' }}>LENGTH</div>
                    <div style={{ fontSize: '0.8rem' }}>{node.value_length} B</div>
                </div>
            </div>
        </div>
    );
};

export default StructureInspector;
