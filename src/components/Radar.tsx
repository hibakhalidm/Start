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
}

const Radar: React.FC<RadarProps> = ({ matrix, highlightOffset, selectionRange, hilbert, onJump }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [hoverPos, setHoverPos] = useState<{ x: number, y: number } | null>(null);
    const [hoverOffset, setHoverOffset] = useState<number | null>(null);

    // Zoom Multiplier (1 = 100%, 2 = 200%, etc.)
    const [zoom, setZoom] = useState(1);

    // THE RENDER ENGINE
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false }); // Optimize performance
        if (!ctx) return;

        const size = 512;
        canvas.width = size;
        canvas.height = size;

        let animationFrameId: number;

        const render = () => {
            const imgData = ctx.createImageData(size, size);
            const data = imgData.data;

            // 1. Paint the Hilbert matrix
            for (let i = 0; i < matrix.length; i++) {
                const entropy = matrix[i] / 255;
                const idx = i * 4;

                // Forensic Thermal Gradient
                data[idx] = 0;     // R
                data[idx + 1] = Math.floor(Math.pow(entropy, 2) * 255); // G
                data[idx + 2] = Math.floor(50 + entropy * 205); // B
                data[idx + 3] = 255; // Alpha
            }
            ctx.putImageData(imgData, 0, 0);

            // 2. Paint Selection Path (Cyan)
            if (selectionRange) {
                ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
                for (let i = selectionRange.start; i < selectionRange.end; i++) {
                    if (i >= matrix.length) break;
                    const { x, y } = hilbert.d2xy(i);
                    ctx.fillRect(x, y, 1, 1);
                }
            }

            // 3. Paint Hover Crosshair (White)
            if (hoverPos) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(hoverPos.x, 0); ctx.lineTo(hoverPos.x, size);
                ctx.moveTo(0, hoverPos.y); ctx.lineTo(size, hoverPos.y);
                ctx.stroke();
            }
        };

        // requestAnimationFrame guarantees the DOM is ready before painting
        animationFrameId = requestAnimationFrame(render);

        return () => cancelAnimationFrame(animationFrameId);

    }, [matrix, selectionRange, hoverPos, hilbert]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();

        // Core Fix: Calculate accurate X/Y based on the physical rendered size vs internal size
        const scaleX = 512 / rect.width;
        const scaleY = 512 / rect.height;

        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);

        if (x >= 0 && x < 512 && y >= 0 && y < 512) {
            setHoverPos({ x, y });
            setHoverOffset(hilbert.xy2d(x, y));
        }
    };

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 1, 8));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 1, 1));
    const handleResetZoom = () => setZoom(1);

    return (
        // 1. OUTER WRAPPER (Strict boundaries, no scrolling here)
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#050505', overflow: 'hidden' }}>

            {/* 2. STRICTLY POSITIONED CONTROLS (Will NEVER disappear/scroll away) */}
            <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 100 }}>
                <button onClick={handleZoomIn} style={btnStyle} title="Zoom In"><ZoomIn size={14} /></button>
                <button onClick={handleZoomOut} style={btnStyle} title="Zoom Out"><ZoomOut size={14} /></button>
                <button onClick={handleResetZoom} style={btnStyle} title="Reset Size"><Maximize size={14} /></button>
            </div>

            {/* 3. FLOATING INFO OVERLAY */}
            <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.8)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', color: '#00f0ff', zIndex: 100, border: '1px solid #222', fontFamily: 'monospace' }}>
                {hoverOffset !== null ? `OFFSET: 0x${hoverOffset.toString(16).toUpperCase()}` : 'SCANNING MATRIX...'}
                <span style={{ marginLeft: 8, color: '#888' }}>{zoom}x</span>
            </div>

            {/* 4. SCROLLABLE INNER VIEWPORT */}
            <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <canvas
                    ref={canvasRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => { setHoverPos(null); setHoverOffset(null); }}
                    onClick={() => hoverOffset !== null && onJump(hoverOffset)}
                    style={{
                        // Core Fix: Use responsive width percentages instead of transform: scale()
                        width: `${zoom * 100}%`,
                        minWidth: '100%',     // Ensures it fills the panel initially
                        maxWidth: `${zoom * 512}px`, // Caps the max native resolution
                        aspectRatio: '1 / 1',
                        imageRendering: 'pixelated', // Keeps it sharp when zoomed
                        cursor: 'crosshair',
                        display: 'block',
                        boxShadow: '0 0 20px rgba(0, 240, 255, 0.05)'
                    }}
                />
            </div>
        </div>
    );
};

const btnStyle = {
    background: 'rgba(15, 15, 17, 0.9)',
    border: '1px solid #333',
    color: '#ccc',
    borderRadius: '4px',
    padding: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
    transition: 'all 0.2s'
};

export default Radar;