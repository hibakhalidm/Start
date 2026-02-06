import React, { useRef, useEffect } from 'react';

interface Props {
    entropyMap: number[]; // 1D array of entropy values (0.0 - 8.0)
    onScroll: (percentage: number) => void;
    currentPercent: number; // 0.0 - 1.0
}

const SemanticScrollbar: React.FC<Props> = ({ entropyMap, onScroll, currentPercent }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // DRAW THE ENTROPY MAP
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || entropyMap.length === 0) return;

        const { width, height } = canvas;
        ctx.clearRect(0, 0, width, height);

        // Draw density lines
        const step = height / entropyMap.length;

        entropyMap.forEach((val, i) => {
            const y = i * step;
            // Color Logic: Red = Encrypted (>7.0), Blue = Text (<4.0), Grey = Data
            if (val > 7.0) ctx.fillStyle = '#ff2a2a';
            else if (val < 4.0) ctx.fillStyle = '#3b82f6';
            else ctx.fillStyle = '#333';

            ctx.fillRect(0, y, width, Math.ceil(step));
        });

    }, [entropyMap]);

    // HANDLE INTERACTION (Click & Drag)
    const handleInteraction = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const percent = Math.min(1, Math.max(0, y / rect.height));
        onScroll(percent);
    };

    return (
        <div
            ref={containerRef}
            className="semantic-scrollbar"
            style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                background: '#0a0a0f',
                cursor: 'pointer'
            }}
            onMouseDown={(e) => {
                if (e.buttons === 1) handleInteraction(e);
            }}
            onMouseMove={(e) => {
                if (e.buttons === 1) handleInteraction(e);
            }}
        >
            {/* The Visualization */}
            <canvas
                ref={canvasRef}
                width={24}
                height={800} // Fixed render height, CSS scales it
                style={{ width: '100%', height: '100%', display: 'block' }}
            />

            {/* The "Thumb" (Current Position Indicator) */}
            <div style={{
                position: 'absolute',
                top: `${currentPercent * 100}%`,
                left: 0,
                right: 0,
                height: '40px',
                border: '2px solid var(--accent-cyan)',
                background: 'rgba(0, 240, 255, 0.2)',
                transform: 'translateY(-50%)',
                pointerEvents: 'none' // Let clicks pass through to canvas
            }} />
        </div>
    );
};

export default SemanticScrollbar;