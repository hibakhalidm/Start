import React, { useRef } from 'react';

interface Props {
    entropyMap: number[];
    onScroll: (percent: number) => void;
    currentPercent: number;
    visiblePercent?: number;
}

const SemanticScrollbar: React.FC<Props> = ({ entropyMap, onScroll, currentPercent, visiblePercent = 0.05 }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top;
        onScroll(Math.max(0, Math.min(1, y / rect.height)));
    };

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', background: '#050505', cursor: 'crosshair', borderLeft: '1px solid #333' }} onMouseDown={handleMouseDown}>
            {entropyMap.map((val, i) => {
                // val 0.0 (Low Entropy) -> Deep Blue
                // val 1.0 (High Entropy) -> Bright White/Cyan
                const r = Math.floor(val * 200);
                const g = Math.floor(val * 255);
                const b = Math.floor(150 + val * 105);
                return (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            top: `${(i / entropyMap.length) * 100}%`,
                            left: 0, right: 0,
                            height: `${100 / entropyMap.length}%`,
                            background: `rgb(${r}, ${g}, ${b})`,
                            boxShadow: val > 0.8 ? `0 0 5px rgba(0, 240, 255, ${val})` : 'none'
                        }}
                    />
                );
            })}
            <div style={{
                position: 'absolute',
                top: `${currentPercent * 100}%`,
                left: 0, right: 0,
                height: `${Math.max(visiblePercent * 100, 2)}%`,
                border: '2px solid #fff',
                background: 'rgba(255, 255, 255, 0.2)',
                boxShadow: '0 0 10px #00f0ff',
                zIndex: 10,
                pointerEvents: 'none'
            }} />
        </div>
    );
};

export default SemanticScrollbar;