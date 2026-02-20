import React, { useState, useMemo } from 'react';
import { Settings2, FileWarning } from 'lucide-react';

interface Props {
    selectedBytes: Uint8Array | null;
}

const TransformationPipeline: React.FC<Props> = ({ selectedBytes }) => {
    const [operation, setOperation] = useState<'hex' | 'xor' | 'swap16'>('hex');
    const [xorKey, setXorKey] = useState<string>('AA');

    // PIPELINE ENGINE
    const resultText = useMemo(() => {
        if (!selectedBytes || selectedBytes.length === 0) return "No data selected.";

        try {
            if (operation === 'hex') {
                return Array.from(selectedBytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
            }

            if (operation === 'xor') {
                const key = parseInt(xorKey, 16);
                if (isNaN(key)) return "Invalid XOR Key";
                return Array.from(selectedBytes)
                    .map(b => (b ^ key).toString(16).padStart(2, '0').toUpperCase())
                    .join(' ');
            }

            if (operation === 'swap16') {
                const swapped = new Uint8Array(selectedBytes.length);
                for (let i = 0; i < selectedBytes.length; i += 2) {
                    if (i + 1 < selectedBytes.length) {
                        swapped[i] = selectedBytes[i + 1];
                        swapped[i + 1] = selectedBytes[i];
                    } else {
                        swapped[i] = selectedBytes[i]; // Handle odd length
                    }
                }
                return Array.from(swapped).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
            }
        } catch (e) {
            return "Transformation Error";
        }
        return "";
    }, [selectedBytes, operation, xorKey]);

    if (!selectedBytes) {
        return <div style={{ color: '#555', fontSize: '0.8rem', fontStyle: 'italic' }}>Select bytes in the matrix to apply transformations.</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>

            {/* CONTROLS (THE "EDITOR") */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#111', padding: '8px', borderRadius: '4px', border: '1px solid #333' }}>
                <Settings2 size={14} color="var(--accent-cyan)" />
                <select
                    value={operation}
                    onChange={(e) => setOperation(e.target.value as 'hex' | 'xor' | 'swap16')}
                    style={{ background: '#000', color: '#fff', border: '1px solid #444', padding: '4px', fontSize: '0.8rem', borderRadius: '2px', outline: 'none' }}
                >
                    <option value="hex">Raw Hex (No Op)</option>
                    <option value="xor">XOR Decrypt</option>
                    <option value="swap16">Endian Swap (16-bit)</option>
                </select>

                {operation === 'xor' && (
                    <input
                        type="text"
                        value={xorKey}
                        onChange={(e) => setXorKey(e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 2))}
                        placeholder="Key (Hex)"
                        style={{ width: '60px', background: '#000', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan)', padding: '4px', fontSize: '0.8rem', textAlign: 'center' }}
                    />
                )}
            </div>

            {/* ENCRYPTION WARNING */}
            {selectedBytes.length > 16 && (
                <div style={{ fontSize: '0.7rem', color: '#888', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FileWarning size={12} /> Apply transforms to test potential decryption.
                </div>
            )}

            {/* RESULT */}
            <div style={{
                flex: 1, overflow: 'auto', background: '#080808', border: '1px solid #222', borderRadius: '4px',
                padding: '10px', fontFamily: 'monospace', fontSize: '0.85rem', color: '#00ff9d', wordBreak: 'break-all', lineHeight: '1.5'
            }}>
                {resultText}
            </div>
        </div>
    );
};

export default TransformationPipeline;
