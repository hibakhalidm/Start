import React from 'react';
import { Info, Ruler, Hash, FileText } from 'lucide-react';
import { TlvNode } from '../types/analysis';
import { getTagInfo } from '../utils/tag_dictionary';

interface Props {
    node: TlvNode | null;
    fileData: Uint8Array | null;
}

const StructureInspector: React.FC<Props> = ({ node, fileData }) => {
    if (!node || !fileData) {
        return (
            <div style={{ padding: '20px', color: '#555', textAlign: 'center', fontStyle: 'italic' }}>
                Select a component in the Tree to inspect details.
            </div>
        );
    }

    // 1. Get Knowledge
    const info = getTagInfo(node.tag);

    // 2. Decode Value (Smart Preview)
    let valuePreview = "Binary Data";
    const valueStart = node.offset + node.tag_length + node.value_length_len;
    const valueEnd = valueStart + node.value_length;
    // Safety check for bounds
    if (valueEnd <= fileData.length) {
        const valueBytes = fileData.slice(valueStart, valueEnd);

        if (node.tag === 0x02 && valueBytes.length <= 8) { // Integer
            // Simple hex-to-int for display
            if (valueBytes.length > 0) {
                const hex = Array.from(valueBytes).map(b => b.toString(16).padStart(2, '0')).join('');
                valuePreview = `${parseInt(hex, 16).toLocaleString()}`;
            } else {
                valuePreview = "0";
            }
        } else if (node.tag === 0x04 || node.tag === 0x13 || node.tag === 0x0C) { // String
            // Attempt ASCII decode
            const text = new TextDecoder().decode(valueBytes);
            // Only show if it looks printable
            if (/^[\x20-\x7E]*$/.test(text)) {
                valuePreview = `"${text}"`;
            } else {
                valuePreview = "Binary / Encrypted Payload";
            }
        } else if (node.is_container) {
            valuePreview = `${node.children ? node.children.length : 0} nested items`;
        }
    } else {
        valuePreview = "Data out of bounds (Truncated file?)";
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#eee', fontFamily: 'var(--font-mono)' }}>

            {/* HEADER */}
            <div style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                <div style={{ fontSize: '10px', color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '1px' }}>COMPONENT TYPE</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {info.name} <span style={{ fontSize: '0.8rem', color: '#666', background: '#222', padding: '2px 6px', borderRadius: '4px' }}>0x{node.tag.toString(16).toUpperCase()}</span>
                </div>
            </div>

            {/* EXPLANATION CARD */}
            <div style={{ background: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '6px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', color: 'var(--accent-cyan)' }}>
                    <Info size={14} />
                    <span style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>WHAT IT SAYS</span>
                </div>
                <div style={{ fontSize: '0.85rem', lineHeight: '1.4', color: '#ccc' }}>
                    {info.description}
                </div>
            </div>

            {/* TECHNICAL DETAILS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: '#1a1a1a', padding: '8px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#777', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Hash size={10} /> OFFSET
                    </div>
                    <div style={{ fontSize: '0.9rem' }}>0x{node.offset.toString(16).toUpperCase()}</div>
                </div>
                <div style={{ background: '#1a1a1a', padding: '8px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#777', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Ruler size={10} /> SIZE
                    </div>
                    <div style={{ fontSize: '0.9rem' }}>{node.tag_length + node.value_length_len + node.value_length} B</div>
                </div>
            </div>

            {/* CONTENT PREVIEW */}
            <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '10px', color: '#777', marginBottom: '6px', textTransform: 'uppercase' }}>Decoded Content</div>
                <div style={{
                    background: '#111', border: '1px solid #333', borderRadius: '4px', padding: '12px',
                    fontSize: '0.9rem', color: node.is_container ? '#888' : 'var(--accent-green)',
                    wordBreak: 'break-all', maxHeight: '150px', overflow: 'auto'
                }}>
                    {valuePreview}
                </div>
            </div>
        </div>
    );
};

export default StructureInspector;
