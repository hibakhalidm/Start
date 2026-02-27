import React, { useState } from 'react';
import { Terminal, Copy, Check, Activity } from 'lucide-react'; // Added Activity Icon
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
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
                <Terminal size={32} strokeWidth={1} />
                <div style={{ marginTop: 10, fontSize: '0.7rem', letterSpacing: '1px' }}>AWAITING SELECTION</div>
            </div>
        );
    }

    const info = getTagInfo(node.tag);
    const valueStart = node.offset + node.tag_length + node.value_length_len;
    const valueEnd = valueStart + node.value_length;
    const valueBytes = fileData.slice(valueStart, valueEnd);

    const rawHex = Array.from(valueBytes.slice(0, 64)).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

    let decodedValue = "BINARY PAYLOAD";
    let isText = false;

    if (node.tag === 0x02 && valueBytes.length <= 8) {
        decodedValue = parseInt(Array.from(valueBytes).map(b => b.toString(16).padStart(2, '0')).join(''), 16).toLocaleString();
    } else if ([0x04, 0x13, 0x0C, 0x17].includes(node.tag)) {
        const text = new TextDecoder().decode(valueBytes);
        if (/^[\x20-\x7E]*$/.test(text)) { decodedValue = text; isText = true; }
    } else if (node.is_container) {
        decodedValue = `[CONTAINER] ${node.children.length} SUB-ITEMS`;
    }

    // --- NEW: INTELLIGENCE ENGINE (ANALYTICAL CONCLUSION) ---
    let conclusion = "";
    if (node.is_container) {
        conclusion = `STRUCTURAL CONTAINER: Encapsulates ${node.children.length} nested records. Used for hierarchical grouping.`;
    } else if (isText) {
        conclusion = `PLAINTEXT METADATA: Payload resolves to human-readable ASCII string. High confidence of configuration or identification data.`;
    } else if (node.tag === 0x02) {
        conclusion = `QUANTITATIVE METRIC: Interpreted as an Integer flag or counter.`;
    } else {
        // Calculate local entropy just for this specific payload block
        let entropy = 0;
        const freqs = new Array(256).fill(0);
        for (let i = 0; i < valueBytes.length; i++) freqs[valueBytes[i]]++;
        for (let i = 0; i < 256; i++) {
            if (freqs[i] > 0) {
                const p = freqs[i] / valueBytes.length;
                entropy -= p * Math.log2(p);
            }
        }

        if (entropy > 7.5 && valueBytes.length > 32) {
            conclusion = `HIGH ENTROPY (${entropy.toFixed(2)} bits/byte): Data appears mathematically random. High probability of encryption (e.g., AES) or compression. Use pipeline below.`;
        } else {
            conclusion = `RAW BINARY (${entropy.toFixed(2)} bits/byte): Unstructured machine data or proprietary encoding.`;
        }
    }

    const handleCopy = () => { navigator.clipboard.writeText(decodedValue); setCopied('dec'); setTimeout(() => setCopied(null), 2000); };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
            {/* MINIMAL HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ fontSize: '1.1rem', color: '#fff', letterSpacing: '-0.5px' }}>{info.name}</div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px', fontSize: '0.7rem', color: '#666' }}>
                        <span>TAG: <span style={{ color: 'var(--accent-cyan)' }}>0x{node.tag.toString(16).toUpperCase()}</span></span>
                        <span>OFFSET: <span style={{ color: '#aaa' }}>0x{node.offset.toString(16).toUpperCase()}</span></span>
                        <span>LEN: <span style={{ color: '#aaa' }}>{node.value_length}B</span></span>
                    </div>
                </div>
                {onFocus && (
                    <button onClick={() => onFocus(node.offset, valueEnd)} style={{ background: 'transparent', border: '1px solid #333', color: '#888', padding: '4px 8px', fontSize: '0.65rem', cursor: 'pointer' }}>
                        LOCATE
                    </button>
                )}
            </div>

            {/* DESCRIPTION */}
            <div style={{ fontSize: '0.8rem', color: '#888', lineHeight: '1.4' }}>{info.description}</div>

            {/* NEW: FORENSIC CONCLUSION BOX */}
            <div style={{ background: 'rgba(0, 255, 157, 0.05)', borderLeft: '2px solid #00ff9d', padding: '10px 12px' }}>
                <div style={{ fontSize: '0.65rem', color: '#00ff9d', letterSpacing: '1px', marginBottom: '4px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={12} /> FORENSIC CONCLUSION
                </div>
                <div style={{ fontSize: '0.75rem', color: '#eee', lineHeight: '1.5' }}>
                    {conclusion}
                </div>
            </div>

            {/* TERMINAL READOUT */}
            <div style={{ flex: 1, background: '#080808', border: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', minHeight: '100px' }}>
                <div style={{ padding: '8px 12px', background: '#111', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: '#555', letterSpacing: '1px' }}>DECODED OUTPUT</span>
                    <button onClick={handleCopy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#00ff9d' : '#555' }}>
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                </div>

                <div style={{ padding: '15px', fontSize: '0.85rem', color: isText ? '#ddd' : 'var(--accent-cyan)', whiteSpace: 'pre-wrap', flex: 1 }}>
                    {decodedValue}
                </div>

                <div style={{ padding: '10px 15px', borderTop: '1px dotted #222', fontSize: '0.7rem', color: '#444', wordSpacing: '2px' }}>
                    {rawHex} {valueBytes.length > 64 && '...'}
                </div>
            </div>
        </div>
    );
};
export default StructureInspector;
