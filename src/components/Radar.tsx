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
    const [hoverPos, setHoverPos] = useState<{ x: number, y: number } | null>(null);
    const [hoverOffset, setHoverOffset] = useState<number | null>(null);
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

            // SAFETY CLAMP: Ensure we never draw more pixels than the Hilbert matrix supports
            const maxLen = Math.min(matrix.length, size * size);
            for (let i = 0; i < maxLen; i++) {
                const entropy = (entropyMap && entropyMap[i] !== undefined) ? (entropyMap[i] / 8.0) : (matrix[i] / 255);

                try {
                    const { x, y } = hilbert.d2xy(i);
                    // Boundary safety
                    if (x >= 0 && x < size && y >= 0 && y < size) {
                        const idx = (y * size + x) * 4;
                        data[idx] = 0;
                        data[idx + 1] = Math.floor(Math.pow(entropy, 2) * 255);
                        data[idx + 2] = Math.floor(50 + entropy * 205);
                        data[idx + 3] = 255;
                    }
                } catch (e) { /* Ignore out of bounds */ }
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

            if (hoverPos) {
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
        const scaleX = 512 / rect.width;
        const scaleY = 512 / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);

        if (x >= 0 && x < 512 && y >= 0 && y < 512) {
            setHoverPos({ x, y });
            try { setHoverOffset(hilbert.xy2d(x, y)); } catch (e) { }
        }
    };

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#050505', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 100 }}>
                <button onClick={() => setZoom(prev => Math.min(prev + 1, 8))} style={btnStyle}><ZoomIn size={14} /></button>
                <button onClick={() => setZoom(prev => Math.max(prev - 1, 1))} style={btnStyle}><ZoomOut size={14} /></button>
                <button onClick={() => setZoom(1)} style={btnStyle}><Maximize size={14} /></button>
            </div>
            <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <canvas
                    ref={canvasRef} onMouseMove={handleMouseMove}
                    onClick={() => { if (hoverOffset !== null) { onJump(hoverOffset); onSelectRange(hoverOffset, hoverOffset + 16); } }}
                    onMouseLeave={() => { setHoverPos(null); setHoverOffset(null); }}
                    style={{ width: `${zoom * 100}%`, minWidth: '100%', maxWidth: `${zoom * 512}px`, aspectRatio: '1 / 1', imageRendering: 'pixelated', cursor: 'crosshair', display: 'block' }}
                />
            </div>
        </div>
    );
};
const btnStyle = { background: 'rgba(15, 15, 17, 0.9)', border: '1px solid #333', color: '#ccc', borderRadius: '4px', padding: '6px', cursor: 'pointer' };
export default Radar;