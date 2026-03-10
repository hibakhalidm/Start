import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
// FIX: Set a default empty array so data.length never crashes
const AutocorrelationGraph = ({ data = [], onJump }) => {
    const canvasRef = useRef(null);
    const [hoverPos, setHoverPos] = useState(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || data.length === 0)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        const rect = canvas.parentElement?.getBoundingClientRect();
        if (rect) {
            canvas.width = rect.width;
            canvas.height = rect.height;
        }
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);
        const maxVal = Math.max(...data, 1);
        const stepX = width / data.length;
        // 1. Draw Background Grid Lines
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        // 2. Draw The Continuous Line Graph
        ctx.beginPath();
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';
        for (let i = 0; i < data.length; i++) {
            const x = i * stepX;
            const normalizedY = (data[i] / maxVal) * (height * 0.8);
            const y = height - normalizedY - 10;
            if (i === 0)
                ctx.moveTo(x, y);
            else
                ctx.lineTo(x, y);
        }
        ctx.stroke();
        // 3. Add a subtle glow/fill under the line
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(0, 240, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 240, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
        // 4. Draw Hover Crosshair and Node
        if (hoverPos && hoverPos.index < data.length) {
            const currentX = hoverPos.index * stepX;
            const normalizedY = (data[hoverPos.index] / maxVal) * (height * 0.8);
            const currentY = height - normalizedY - 10;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.moveTo(currentX, 0);
            ctx.lineTo(currentX, height);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(currentX, currentY, 4, 0, 2 * Math.PI);
            ctx.fillStyle = '#00ff9d';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.stroke();
        }
    }, [data, hoverPos]);
    const handleMouseMove = (e) => {
        if (!canvasRef.current || data.length === 0)
            return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const index = Math.floor((x / rect.width) * data.length);
        const safeIndex = Math.max(0, Math.min(index, data.length - 1));
        setHoverPos({
            x: e.clientX,
            index: safeIndex,
            value: data[safeIndex]
        });
    };
    // NEW: Click Handler
    const handleMouseClick = () => {
        if (hoverPos && onJump) {
            onJump(hoverPos.index);
        }
    };
    if (!data || data.length === 0) {
        return (_jsxs("div", { style: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3, color: '#888', fontSize: '0.75rem', gap: '8px' }, children: [_jsx(Activity, { size: 24 }), " No correlation data computed."] }));
    }
    return (_jsxs("div", { style: { position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#050505' }, children: [_jsx("canvas", { ref: canvasRef, onMouseMove: handleMouseMove, onClick: handleMouseClick, onMouseLeave: () => setHoverPos(null), style: { width: '100%', height: '100%', display: 'block', cursor: 'crosshair' } }), hoverPos && (_jsxs("div", { style: {
                    position: 'absolute', top: '10px', left: '10px', background: 'rgba(10, 10, 12, 0.9)',
                    border: '1px solid #333', padding: '6px 10px', borderRadius: '4px',
                    color: '#ccc', fontSize: '10px', fontFamily: 'monospace', backdropFilter: 'blur(4px)',
                    pointerEvents: 'none', zIndex: 10
                }, children: [_jsx("div", { style: { marginBottom: '4px', color: '#888' }, children: "SIGNAL METRICS" }), _jsxs("div", { children: ["LAG/OFFSET: ", _jsx("span", { style: { color: '#fff' }, children: hoverPos.index })] }), _jsxs("div", { children: ["CORRELATION: ", _jsx("span", { style: { color: 'var(--accent-cyan)' }, children: hoverPos.value.toFixed(4) })] })] }))] }));
};
export default AutocorrelationGraph;
//# sourceMappingURL=AutocorrelationGraph.js.map