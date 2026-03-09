import React, { useRef, useEffect, useState, useMemo } from 'react';
import { HilbertCurve } from '../utils/hilbert';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface RadarProps {
    matrix: Uint8Array;
    entropyMap: number[];
    highlightOffset: number | null;
    selectionRange: { start: number, end: number } | null;
    hilbert: HilbertCurve;
    onJump: (offset: number) => void;
    onSelectRange: (start: number, end: number) => void;
}

const Radar: React.FC<RadarProps> = ({ matrix, entropyMap, highlightOffset, selectionRange, hilbert, onJump, onSelectRange }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // UI State (Decoupled from Canvas Render)
    const [hoverPos, setHoverPos] = useState<{ x: number, y: number, offset: number | null } | null>(null);
    const [zoom, setZoom] = useState(1);

    // CORE FIX: Only re-render the heavy Canvas Matrix when the actual binary data changes!
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !matrix || matrix.length === 0) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const size = 512;
        canvas.width = size;
        canvas.height = size;

        const imgData = ctx.createImageData(size, size);
        const data = imgData.data;

        // Base black background
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 10; data[i + 1] = 10; data[i + 2] = 10; data[i + 3] = 255;
        }

        const maxLen = Math.min(matrix.length, size * size);
        for (let i = 0; i < maxLen; i++) {
            const entropy = (entropyMap && entropyMap.length > i) ? (entropyMap[i] / 8.0) : (matrix[i] / 255);
            try {
                const { x, y } = hilbert.d2xy(i);
                if (x >= 0 && x < size && y >= 0 && y < size) {
                    const idx = (y * size + x) * 4;
                    data[idx] = 0;
                    data[idx + 1] = Math.floor(Math.pow(entropy, 2) * 255);
                    data[idx + 2] = Math.floor(50 + entropy * 205);
                    data[idx + 3] = 255;
                }
            } catch (e) { }
        }
        ctx.putImageData(imgData, 0, 0);

        // Draw Selection Overlay
        if (selectionRange) {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
            const maxSel = Math.min(selectionRange.end, maxLen);
            for (let i = selectionRange.start; i < maxSel; i++) {
                try {
                    const { x, y } = hilbert.d2xy(i);
                    ctx.fillRect(x, y, 1, 1);
                } catch (e) { }
            }
        }
    }, [matrix, entropyMap, selectionRange, hilbert]); // Notice hoverPos is REMOVED!

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();

        // Ensure boundaries are strictly clamped to avoid Hilbert math crashes
        let rawX = ((e.clientX - rect.left) / rect.width) * 512;
        let rawY = ((e.clientY - rect.top) / rect.height) * 512;

        const x = Math.max(0, Math.min(511, Math.floor(rawX)));
        const y = Math.max(0, Math.min(511, Math.floor(rawY)));

        try {
            const offset = hilbert.xy2d(x, y);
            // Only trigger state update if the actual offset changes
            if (!hoverPos || hoverPos.offset !== offset) {
                setHoverPos({ x, y, offset });
            }
        } catch (e) {
            setHoverPos(null);
        }
    };

    const handleMouseClick = () => {
        if (hoverPos && hoverPos.offset !== null && hoverPos.offset < matrix.length) {
            onJump(hoverPos.offset);
            onSelectRange(hoverPos.offset, hoverPos.offset + 16);
        }
    };

    // Safe Lookups for Tooltip
    const hoverOffset = hoverPos?.offset ?? null;
    const hoverEntropy = (hoverOffset !== null && entropyMap && hoverOffset < entropyMap.length) ? entropyMap[hoverOffset].toFixed(2) : '0.00';
    const hoverByteHex = (hoverOffset !== null && matrix && hoverOffset < matrix.length) ? matrix[hoverOffset].toString(16).padStart(2, '0').toUpperCase() : '00';

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#050505', overflow: 'hidden' }}>

            {/* CONTROLS */}
            <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 100 }}>
                <button onClick={() => setZoom(prev => Math.min(prev + 1, 8))} style={btnStyle}><ZoomIn size={14} /></button>
                <button onClick={() => setZoom(prev => Math.max(prev - 1, 1))} style={btnStyle}><ZoomOut size={14} /></button>
                <button onClick={() => setZoom(1)} style={btnStyle}><Maximize size={14} /></button>
            </div>

            {/* TOOLTIP OVERLAY */}
            <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(5, 5, 5, 0.9)', padding: '6px 10px', borderRadius: '4px', fontSize: '10px', zIndex: 100, border: '1px solid #333', fontFamily: 'monospace', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', gap: '4px', pointerEvents: 'none' }}>
                <div style={{ color: '#aaa' }}>OFFSET: <span style={{ color: '#fff' }}>{hoverOffset !== null ? `0x${hoverOffset.toString(16).toUpperCase()}` : '---'}</span></div>
                <div style={{ color: '#aaa' }}>BYTE: <span style={{ color: 'var(--accent-cyan)' }}>{hoverOffset !== null ? `0x${hoverByteHex}` : '--'}</span></div>
                <div style={{ color: '#aaa' }}>ENTROPY: <span style={{ color: Number(hoverEntropy) > 7.5 ? '#00ff9d' : 'var(--accent-blue)' }}>{hoverOffset !== null ? `${hoverEntropy} bits` : '---'}</span></div>
            </div>

            {/* SCROLLABLE VIEWPORT */}
            <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

                <div style={{ position: 'relative', width: `${zoom * 100}%`, minWidth: '100%', maxWidth: `${zoom * 512}px`, aspectRatio: '1 / 1' }}>

                    {/* The Heavy Canvas */}
                    <canvas
                        ref={canvasRef}
                        style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }}
                    />

                    {/* The Lightweight CSS Crosshair Overlay */}
                    <div
                        onMouseMove={handleMouseMove}
                        onClick={handleMouseClick}
                        onMouseLeave={() => setHoverPos(null)}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'crosshair', zIndex: 10 }}
                    >
                        {hoverPos && (
                            <>
                                {/* Vertical Line (Now perfectly locking to pixels mathematically) */}
                                <div style={{ position: 'absolute', top: 0, left: `${(hoverPos.x / 512) * 100}%`, width: `${(1 / 512) * 100}%`, height: '100%', background: 'rgba(255,255,255,0.7)', pointerEvents: 'none' }} />
                                {/* Horizontal Line (Perfect scaling for Zoom level) */}
                                <div style={{ position: 'absolute', top: `${(hoverPos.y / 512) * 100}%`, left: 0, width: '100%', height: `${(1 / 512) * 100}%`, background: 'rgba(255,255,255,0.7)', pointerEvents: 'none' }} />
                            </>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};
const btnStyle = { background: 'rgba(15, 15, 17, 0.9)', border: '1px solid #333', color: '#ccc', borderRadius: '4px', padding: '6px', cursor: 'pointer' };
export default Radar;