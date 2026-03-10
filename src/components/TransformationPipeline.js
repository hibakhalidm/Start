import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { Settings2, FileWarning, Download, FileText, Clipboard, CheckCircle } from 'lucide-react';
import { generateIntelReport, downloadReport } from '../utils/reportBuilder';
const TransformationPipeline = ({ selectedBytes, fileData, fileObj, analysisResult, detectedStandard, }) => {
    const [operation, setOperation] = useState('hex');
    const [xorKey, setXorKey] = useState('AA');
    const [copied, setCopied] = useState(false);
    const [generating, setGenerating] = useState(false);
    // 1. Compute the actual binary transformation
    const transformedData = useMemo(() => {
        if (!selectedBytes || selectedBytes.length === 0)
            return null;
        try {
            if (operation === 'hex')
                return new Uint8Array(selectedBytes);
            if (operation === 'xor') {
                const key = parseInt(xorKey, 16);
                if (isNaN(key))
                    return null;
                const out = new Uint8Array(selectedBytes.length);
                for (let i = 0; i < selectedBytes.length; i++)
                    out[i] = selectedBytes[i] ^ key;
                return out;
            }
            if (operation === 'swap16') {
                const out = new Uint8Array(selectedBytes.length);
                for (let i = 0; i < selectedBytes.length; i += 2) {
                    if (i + 1 < selectedBytes.length) {
                        out[i] = selectedBytes[i + 1];
                        out[i + 1] = selectedBytes[i];
                    }
                    else {
                        out[i] = selectedBytes[i];
                    }
                }
                return out;
            }
        }
        catch (e) {
            return null;
        }
        return null;
    }, [selectedBytes, operation, xorKey]);
    // 2. Format for UI Display
    const resultText = useMemo(() => {
        if (!transformedData)
            return 'Transformation Error / Invalid Key';
        return Array.from(transformedData)
            .map(b => b.toString(16).padStart(2, '0').toUpperCase())
            .join(' ');
    }, [transformedData]);
    // 3. Isolated Payload Export (binary .bin)
    const handleExportPayload = () => {
        if (!transformedData)
            return;
        const blob = new Blob([transformedData], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CIFAD_Payload_${operation}_${Date.now()}.bin`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
    };
    // 4. Intelligence Report Generation
    const handleGenReport = async () => {
        if (!analysisResult || !fileObj)
            return;
        setGenerating(true);
        try {
            const markdown = generateIntelReport({
                fileName: fileObj.name,
                fileSize: fileObj.size,
                analysisTimestamp: new Date().toISOString(),
                result: analysisResult,
                standard: detectedStandard ?? null,
            }, fileData ?? undefined);
            downloadReport(markdown, fileObj.name);
        }
        finally {
            setGenerating(false);
        }
    };
    // 5. Copy current hex output to clipboard
    const handleCopyHex = async () => {
        if (!resultText)
            return;
        await navigator.clipboard.writeText(resultText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    const canGenReport = !!(analysisResult && fileObj);
    if (!selectedBytes) {
        return (_jsxs("div", { style: { color: '#555', fontSize: '0.8rem', fontStyle: 'italic', display: 'flex', flexDirection: 'column', gap: '12px' }, children: [_jsx("div", { children: "Select bytes in the matrix to apply transformations." }), canGenReport && (_jsxs("button", { onClick: handleGenReport, disabled: generating, style: {
                        background: generating ? 'rgba(0,255,157,0.05)' : 'rgba(0,255,157,0.1)',
                        color: '#00ff9d',
                        border: '1px solid #00ff9d',
                        padding: '8px 12px',
                        fontSize: '0.8rem',
                        borderRadius: '4px',
                        cursor: generating ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: 'fit-content',
                        transition: 'all 0.2s ease',
                    }, children: [_jsx(FileText, { size: 14 }), generating ? 'COMPILING REPORT...' : 'GEN INTEL REPORT (.md)'] }))] }));
    }
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }, children: [_jsxs("div", { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', background: '#111', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }, children: [_jsx(Settings2, { size: 14, color: "var(--accent-cyan)" }), _jsxs("select", { value: operation, onChange: (e) => setOperation(e.target.value), style: { background: '#000', color: '#fff', border: '1px solid #333', padding: '4px', fontSize: '0.8rem', borderRadius: '2px' }, children: [_jsx("option", { value: "hex", children: "Raw Hex (No Op)" }), _jsx("option", { value: "xor", children: "XOR Decrypt" }), _jsx("option", { value: "swap16", children: "Endian Swap (16-bit)" })] }), operation === 'xor' && (_jsx("input", { type: "text", value: xorKey, onChange: (e) => setXorKey(e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 2)), placeholder: "Key", style: { width: '40px', background: '#000', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan)', padding: '4px', fontSize: '0.8rem', textAlign: 'center' } })), _jsxs("div", { style: { marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }, children: [_jsx("button", { onClick: handleCopyHex, title: "Copy hex to clipboard", style: { background: 'rgba(255,255,255,0.05)', color: copied ? '#00ff9d' : '#888', border: '1px solid #333', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }, children: copied ? _jsxs(_Fragment, { children: [_jsx(CheckCircle, { size: 12 }), " COPIED"] }) : _jsxs(_Fragment, { children: [_jsx(Clipboard, { size: 12 }), " COPY"] }) }), _jsxs("button", { onClick: handleExportPayload, title: "Download binary payload", style: { background: 'rgba(0, 240, 255, 0.1)', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan)', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }, children: [_jsx(Download, { size: 12 }), " EXPORT PAYLOAD"] }), _jsxs("button", { onClick: handleGenReport, disabled: !canGenReport || generating, title: canGenReport ? 'Generate Markdown intelligence report' : 'Requires a fully analysed file', style: {
                                    background: canGenReport ? 'rgba(0,255,157,0.1)' : 'rgba(255,255,255,0.03)',
                                    color: canGenReport ? '#00ff9d' : '#444',
                                    border: `1px solid ${canGenReport ? '#00ff9d' : '#333'}`,
                                    padding: '4px 8px',
                                    fontSize: '0.75rem',
                                    borderRadius: '2px',
                                    cursor: canGenReport ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.2s ease',
                                }, children: [_jsx(FileText, { size: 12 }), " ", generating ? 'COMPILING...' : 'GEN INTEL REPORT'] })] })] }), selectedBytes.length > 16 && (_jsxs("div", { style: { fontSize: '0.7rem', color: '#888', display: 'flex', alignItems: 'center', gap: '4px' }, children: [_jsx(FileWarning, { size: 12 }), " Live preview applied. Export to save binary payload."] })), _jsx("div", { style: { flex: 1, overflow: 'auto', background: '#080808', border: '1px solid #1a1a1a', padding: '10px', fontFamily: 'monospace', fontSize: '0.85rem', color: '#00ff9d', wordBreak: 'break-all', lineHeight: '1.5' }, children: resultText })] }));
};
export default TransformationPipeline;
//# sourceMappingURL=TransformationPipeline.js.map