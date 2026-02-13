import React, { useState } from 'react';
import { Info, Ruler, Hash, Copy, Eye, Check } from 'lucide-react';
import { TlvNode } from '../types/analysis';
import { getTagInfo } from '../utils/tag_dictionary';

interface Props {
    node: TlvNode | null;
    fileData: Uint8Array | null;
    onFocus?: (start: number, end: number) => void; // Capability to jump to location
}

const StructureInspector: React.FC<Props> = ({ node, fileData, onFocus }) => {
    const [copied, setCopied] = useState<string | null>(null);

    if (!node || !fileData) {
        return (
            <div style={{ padding: '40px 20px', color: '#555', textAlign: 'center', fontStyle: 'italic', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <Info size={32} style={{ opacity: 0.3 }} />
                <div>Select a component in the Tree or Hex View to inspect details.</div>
            </div>
        );
    }

    const info = getTagInfo(node.tag);

    // Calculate Value Range
    const valueStart = node.offset + node.tag_length + node.value_length_len;
    const valueEnd = valueStart + node.value_length;
    // Safety
    const safeEnd = Math.min(valueEnd, fileData.length);
    const valueBytes = fileData.slice(valueStart, safeEnd);

    // Smart Decoding
    let valuePreview = "Binary Data";
    let isText = false;

    if (node.tag === 0x02 && valueBytes.length <= 8) { // Integer
        if (valueBytes.length > 0) {
            const hex = Array.from(valueBytes).map(b => b.toString(16).padStart(2, '0')).join('');
            const intVal = parseInt(hex, 16);
            valuePreview = intVal.toLocaleString();
        } else {
            valuePreview = "0";
        }
    } else if ([0x04, 0x13, 0x0C, 0x17].includes(node.tag)) { // Strings/Time
        const text = new TextDecoder().decode(valueBytes);
        // Clean non-printable chars
        if (/^[\x20-\x7E]*$/.test(text)) {
            valuePreview = text;
            isText = true;
        } else {
            // Show hex preview if binary
            valuePreview = Array.from(valueBytes.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' ') + (valueBytes.length > 32 ? '...' : '');
        }
    } else if (node.is_container) {
        valuePreview = `${node.children ? node.children.length : 0} nested items`;
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
                <div style={{ fontSize: '10px', color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>COMPONENT TYPE</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {info.name}
                        <span style={{ fontSize: '0.7rem', color: '#888', background: '#222', padding: '2px 6px', borderRadius: '4px' }}>
                            0x{node.tag ? node.tag.toString(16).toUpperCase() : '??'}
                        </span>
                    </div>
                    {onFocus && (
                        <button
                            onClick={() => onFocus(node.offset, valueEnd)}
                            title="Focus in Matrix"
                            style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer' }}
                        >
                            <Eye size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* EXPLANATION */}
            <div style={{ background: 'rgba(0, 240, 255, 0.05)', borderLeft: '3px solid var(--accent-cyan)', padding: '12px', fontSize: '0.85rem', color: '#ccc', lineHeight: '1.4' }}>
                {info.description}
            </div>

            {/* METRICS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div className="metric-box" style={{ background: '#1a1a1a', padding: '10px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#666', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}><Hash size={10} /> OFFSET</div>
                    <div style={{ fontSize: '0.9rem', color: '#fff' }}>0x{node.offset.toString(16).toUpperCase()}</div>
                </div>
                <div className="metric-box" style={{ background: '#1a1a1a', padding: '10px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#666', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}><Ruler size={10} /> LENGTH</div>
                    <div style={{ fontSize: '0.9rem', color: '#fff' }}>{node.value_length} Bytes</div>
                </div>
            </div>

            {/* CONTENT VIEWER */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '10px', color: '#777', textTransform: 'uppercase' }}>DECODED VALUE</span>
                    <button
                        onClick={() => handleCopy(valuePreview, 'val')}
                        style={{ background: 'none', border: 'none', color: copied === 'val' ? '#0f0' : '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}
                    >
                        {copied === 'val' ? <Check size={12} /> : <Copy size={12} />} {copied === 'val' ? 'COPIED' : 'COPY'}
                    </button>
                </div>

                <div style={{
                    background: '#111', border: '1px solid #333', borderRadius: '4px', padding: '12px',
                    fontSize: '0.85rem', color: node.is_container ? '#666' : (isText ? '#fff' : 'var(--accent-green)'),
                    fontFamily: isText ? 'sans-serif' : 'var(--font-mono)',
                    wordBreak: 'break-all', overflow: 'auto', flex: 1,
                    lineHeight: '1.5'
                }}>
                    {valuePreview}
                </div>
            </div>
        </div>
    );
};

export default StructureInspector;
