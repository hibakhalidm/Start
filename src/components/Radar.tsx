import React, { useRef, useEffect, useState } from 'react';
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

    // De-couple heavy state from render loop to improve speed
    const [hoverPos, setHoverPos] = useState<{ x: number, y: number, offset: number | null }>({ x: -1, y: -1, offset: null });
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !matrix || matrix.length === 0) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const size = 512;
        canvas.width = size; canvas.height = size;
        let animationFrameId: number;

        const render = () => {
            const imgData = ctx.createImageData(size, size);
            const data = imgData.data;

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

            // Draw Crosshair
            if (hoverPos.offset !== null) {
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(hoverPos.x, 0); ctx.lineTo(hoverPos.x, size);
                ctx.moveTo(0, hoverPos.y); ctx.lineTo(size, hoverPos.y);
                ctx.stroke();
            }
        };
        animationFrameId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animationFrameId);
    }, [matrix, entropyMap, selectionRange, hoverPos, hilbert]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();

        // Exact pixel mapping fix
        const x = Math.floor(((e.clientX - rect.left) / rect.width) * 512);
        const y = Math.floor(((e.clientY - rect.top) / rect.height) * 512);

        if (x >= 0 && x < 512 && y >= 0 && y < 512) {
            try {
                const offset = hilbert.xy2d(x, y);
                // Only update state if offset changes (Performance Fix!)
                if (offset !== hoverPos.offset) {
                    setHoverPos({ x, y, offset });
                }
            } catch (e) { }
        }
    };

    const handleMouseClick = () => {
        if (hoverPos.offset !== null && hoverPos.offset < matrix.length) {
            onJump(hoverPos.offset);
            onSelectRange(hoverPos.offset, hoverPos.offset + 16);
        }
    };

    const hoverEntropy = hoverPos.offset !== null && entropyMap && entropyMap.length > hoverPos.offset ? entropyMap[hoverPos.offset].toFixed(2) : '0.00';
    const hoverByteHex = hoverPos.offset !== null && matrix && hoverPos.offset < matrix.length ? matrix[hoverPos.offset].toString(16).padStart(2, '0').toUpperCase() : '00';

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#050505', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 100 }}>
                <button onClick={() => setZoom(prev => Math.min(prev + 1, 8))} style={btnStyle}><ZoomIn size={14} /></button>
                <button onClick={() => setZoom(prev => Math.max(prev - 1, 1))} style={btnStyle}><ZoomOut size={14} /></button>
                <button onClick={() => setZoom(1)} style={btnStyle}><Maximize size={14} /></button>
            </div>

            <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(5, 5, 5, 0.9)', padding: '6px 10px', borderRadius: '4px', fontSize: '10px', zIndex: 100, border: '1px solid #333', fontFamily: 'monospace', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ color: '#aaa' }}>
                    OFFSET: <span style={{ color: '#fff' }}>{hoverPos.offset !== null ? `0x${hoverPos.offset.toString(16).toUpperCase()}` : '---'}</span>
                </div>
                <div style={{ color: '#aaa' }}>
                    BYTE: <span style={{ color: 'var(--accent-cyan)' }}>{hoverPos.offset !== null ? `0x${hoverByteHex}` : '--'}</span>
                </div>
                <div style={{ color: '#aaa' }}>
                    ENTROPY: <span style={{ color: Number(hoverEntropy) > 7.5 ? '#00ff9d' : 'var(--accent-blue)' }}>{hoverPos.offset !== null ? `${hoverEntropy} bits` : '---'}</span>
                </div>
            </div>

            <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <canvas
                    ref={canvasRef} onMouseMove={handleMouseMove} onClick={handleMouseClick}
                    onMouseLeave={() => setHoverPos({ x: -1, y: -1, offset: null })}
                    style={{ width: `${zoom * 100}%`, minWidth: '100%', maxWidth: `${zoom * 512}px`, aspectRatio: '1 / 1', imageRendering: 'pixelated', cursor: 'crosshair', display: 'block' }}
                />
            </div>
        </div>
    );
};
const btnStyle = { background: 'rgba(15, 15, 17, 0.9)', border: '1px solid #333', color: '#ccc', borderRadius: '4px', padding: '6px', cursor: 'pointer' };
export default Radar;