import React, { useRef, useEffect } from 'react';

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
        const percent = Math.max(0, Math.min(1, y / rect.height));
        onScroll(percent);
    };

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', background: '#050505', cursor: 'crosshair', borderLeft: '1px solid #333' }} onMouseDown={handleMouseDown}>
            {/* HEATMAP LAYER */}
            {entropyMap.map((val, i) => {
                // val is 0.0 (low entropy) to 1.0 (high entropy)
                // FIX: Use HSL for accurate representation
                // 0.0 -> Dark Blue (Structure/Nulls)
                // 1.0 -> Bright Cyan/White (Encrypted/Compressed)

                const lightness = 10 + (val * 60); // 10% to 70% lightness
                const color = `hsl(180, 100%, ${lightness}%)`;

                return (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            top: `${(i / entropyMap.length) * 100}%`,
                            left: 0, right: 0,
                            height: `${100 / entropyMap.length}%`,
                            background: color,
                            opacity: 0.8 // slight transparency to blend
                        }}
                    />
                );
            })}

            {/* INTERACTIVE CYAN BOX */}
            <div
                style={{
                    position: 'absolute',
                    top: `${currentPercent * 100}%`,
                    left: 0, right: 0,
                    height: `${Math.max(visiblePercent * 100, 2)}%`,
                    border: '2px solid #fff',
                    background: 'rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 0 8px rgba(255,255,255,0.8)',
                    zIndex: 10,
                    pointerEvents: 'none',
                    transition: 'top 0.05s linear'
                }}
            />
        </div>
    );
};

export default SemanticScrollbar;