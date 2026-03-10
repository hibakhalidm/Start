import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from 'react';
import { Terminal, Activity, Database, Clock, Hash } from 'lucide-react';
import { getTagInfo } from '../utils/tag_dictionary';
const StructureInspector = ({ node, fileData, selectionRange, onFocus }) => {
    const [copied, setCopied] = useState(null);
    const [payloadHash, setPayloadHash] = useState('COMPUTING...');
    // 1. Core Data Extraction (Supports BOTH Nodes and Raw Selections)
    const { valueBytes, info, valueStart, valueEnd } = useMemo(() => {
        if (!fileData)
            return { valueBytes: new Uint8Array(), info: null, valueStart: 0, valueEnd: 0 };
        if (node) {
            const info = getTagInfo(node.tag);
            const start = node.offset + node.tag_length + node.value_length_len;
            const end = start + node.value_length;
            return { valueBytes: fileData.slice(start, end), info, valueStart: start, valueEnd: end };
        }
        if (selectionRange && selectionRange.start !== selectionRange.end) {
            return {
                valueBytes: fileData.slice(selectionRange.start, selectionRange.end),
                info: { name: "RAW SELECTION", description: "Ad-hoc byte highlighting." },
                valueStart: selectionRange.start,
                valueEnd: selectionRange.end
            };
        }
        return { valueBytes: new Uint8Array(), info: null, valueStart: 0, valueEnd: 0 };
    }, [node, fileData, selectionRange]);
    useEffect(() => {
        if (valueBytes.length === 0)
            return;
        crypto.subtle.digest('SHA-256', valueBytes).then(hashBuffer => {
            const hashHex = Array.from(new Uint8Array(hashBuffer))
                .map(b => b.toString(16).padStart(2, '0')).join('');
            setPayloadHash(hashHex);
        });
    }, [valueBytes]);
    if (!info || valueBytes.length === 0) {
        return (_jsxs("div", { style: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }, children: [_jsx(Terminal, { size: 32, strokeWidth: 1 }), _jsx("div", { style: { marginTop: 10, fontSize: '0.7rem', letterSpacing: '1px' }, children: "AWAITING SELECTION" })] }));
    }
    const rawHex = Array.from(valueBytes.slice(0, 64)).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    let isText = false;
    let decodedText = "BINARY PAYLOAD";
    if (node && [0x04, 0x13, 0x0C, 0x17].includes(node.tag)) {
        const text = new TextDecoder().decode(valueBytes);
        if (/^[\x20-\x7E]*$/.test(text)) {
            decodedText = text;
            isText = true;
        }
    }
    else if (node && node.is_container) {
        decodedText = `[CONTAINER] ${node.children.length} SUB-ITEMS`;
    }
    else {
        // Try decoding raw selection as text anyway
        const text = new TextDecoder('utf-8', { fatal: false }).decode(valueBytes);
        if (/^[\x20-\x7E\n\r\t]+$/.test(text)) {
            decodedText = text;
            isText = true;
        }
    }
    const dataView = new DataView(valueBytes.buffer, valueBytes.byteOffset, valueBytes.byteLength);
    const matrix = { int16: "-", int32: "-", float32: "-", timestamp: "-" };
    try {
        if (valueBytes.length >= 2)
            matrix.int16 = dataView.getInt16(0, false).toLocaleString();
        if (valueBytes.length >= 4) {
            const i32 = dataView.getInt32(0, false);
            matrix.int32 = i32.toLocaleString();
            matrix.float32 = dataView.getFloat32(0, false).toPrecision(5);
            if (i32 > 946684800 && i32 < 1893456000) {
                matrix.timestamp = new Date(i32 * 1000).toISOString().replace('.000Z', ' UTC');
            }
        }
    }
    catch (e) { /* Ignore dataview bounds errors */ }
    let conclusion = "";
    if (node && node.is_container)
        conclusion = `STRUCTURAL CONTAINER: Encapsulates ${node.children.length} nested records.`;
    else if (isText)
        conclusion = `PLAINTEXT METADATA: High confidence human-readable string.`;
    else if (matrix.timestamp !== "-")
        conclusion = `TEMPORAL ARTIFACT: Valid Unix Epoch Timestamp detected.`;
    else {
        let entropy = 0;
        const freqs = new Array(256).fill(0);
        for (let i = 0; i < valueBytes.length; i++)
            freqs[valueBytes[i]]++;
        for (let i = 0; i < 256; i++) {
            if (freqs[i] > 0) {
                const p = freqs[i] / valueBytes.length;
                entropy -= p * Math.log2(p);
            }
        }
        if (entropy > 7.5 && valueBytes.length > 32)
            conclusion = `HIGH ENTROPY (${entropy.toFixed(2)} bits/byte): Likely encrypted or compressed.`;
        else
            conclusion = `RAW BINARY (${entropy.toFixed(2)} bits/byte): Unstructured machine data.`;
    }
    const handleCopy = (text) => { navigator.clipboard.writeText(text); setCopied('val'); setTimeout(() => setCopied(null), 2000); };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '15px', height: '100%', overflowY: 'auto', paddingRight: '5px' }, children: [_jsx("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }, children: _jsxs("div", { children: [_jsx("div", { style: { fontSize: '1.1rem', color: '#fff', letterSpacing: '-0.5px' }, children: info.name }), _jsxs("div", { style: { display: 'flex', gap: '10px', marginTop: '6px', fontSize: '0.7rem', color: '#666' }, children: [node && _jsxs("span", { children: ["TAG: ", _jsxs("span", { style: { color: 'var(--accent-cyan)' }, children: ["0x", node.tag.toString(16).toUpperCase()] })] }), _jsxs("span", { children: ["OFFSET: ", _jsxs("span", { style: { color: '#aaa' }, children: ["0x", valueStart.toString(16).toUpperCase()] })] }), _jsxs("span", { children: ["LEN: ", _jsxs("span", { style: { color: '#aaa' }, children: [valueBytes.length, "B"] })] })] })] }) }), _jsxs("div", { style: { background: 'rgba(0, 255, 157, 0.05)', borderLeft: '2px solid #00ff9d', padding: '10px 12px' }, children: [_jsxs("div", { style: { fontSize: '0.65rem', color: '#00ff9d', letterSpacing: '1px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx(Activity, { size: 12 }), " CONCLUSION"] }), _jsx("div", { style: { fontSize: '0.75rem', color: '#eee', lineHeight: '1.5' }, children: conclusion })] }), (!node || !node.is_container) && valueBytes.length > 0 && (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }, children: [_jsx(MatrixCell, { label: "INT 16 (BE)", value: matrix.int16, icon: _jsx(Database, { size: 10 }) }), _jsx(MatrixCell, { label: "INT 32 (BE)", value: matrix.int32, icon: _jsx(Database, { size: 10 }) }), _jsx(MatrixCell, { label: "FLOAT 32", value: matrix.float32, icon: _jsx(Database, { size: 10 }) }), _jsx(MatrixCell, { label: "TIMESTAMP", value: matrix.timestamp, icon: _jsx(Clock, { size: 10 }), highlight: matrix.timestamp !== "-" })] })), (!node || !node.is_container) && valueBytes.length > 0 && (_jsxs("div", { style: { background: '#0a0a0c', border: '1px solid #1a1a1a', padding: '8px 10px', borderRadius: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', color: '#555', fontSize: '0.65rem' }, children: [_jsx(Hash, { size: 12 }), " SHA-256"] }), _jsxs("div", { style: { fontSize: '0.7rem', color: '#888', fontFamily: 'monospace', userSelect: 'all' }, children: [payloadHash.substring(0, 16), "...", payloadHash.substring(payloadHash.length - 8)] })] })), _jsxs("div", { style: { flex: 1, background: '#080808', border: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', minHeight: '100px' }, children: [_jsx("div", { style: { padding: '8px 12px', background: '#111', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: _jsx("span", { style: { fontSize: '0.65rem', color: '#555', letterSpacing: '1px' }, children: "ASCII / TEXT" }) }), _jsx("div", { style: { padding: '10px 12px', fontSize: '0.85rem', color: isText ? '#ddd' : 'var(--accent-cyan)', whiteSpace: 'pre-wrap' }, children: decodedText }), _jsxs("div", { style: { padding: '10px 12px', borderTop: '1px dotted #222', fontSize: '0.7rem', color: '#444', wordSpacing: '2px', fontFamily: 'monospace' }, children: [rawHex, " ", valueBytes.length > 64 && '...'] })] })] }));
};
const MatrixCell = ({ label, value, icon, highlight = false }) => (_jsxs("div", { style: { background: '#0a0a0c', border: `1px solid ${highlight ? '#eebb00' : '#1a1a1a'}`, padding: '6px 8px', borderRadius: '2px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.6rem', color: highlight ? '#eebb00' : '#555', marginBottom: '2px' }, children: [icon, " ", label] }), _jsx("div", { style: { fontSize: '0.75rem', color: value === "-" ? '#333' : '#ccc', fontFamily: 'monospace' }, children: value })] }));
export default StructureInspector;
//# sourceMappingURL=StructureInspector.js.map