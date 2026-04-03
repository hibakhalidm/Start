import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useEffect, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
const Radar = ({ matrix, entropyMap, highlightOffset, selectionRange, searchMatches, activeMatchOffset, hilbert, onJump, onSelectRange, onHover }) => {
    const canvasRef = useRef(null);
    const uiCanvasRef = useRef(null); // NEW UI CANVAS
    const containerRef = useRef(null);
    // UI State (Decoupled from Canvas Render)
    const [hoverPos, setHoverPos] = useState(null);
    const [zoom, setZoom] = useState(1);
    // CORE FIX: Only re-render the heavy Canvas Matrix when the actual binary data changes!
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !matrix || matrix.length === 0)
            return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx)
            return;
        const size = 512;
        canvas.width = size;
        canvas.height = size;
        const imgData = ctx.createImageData(size, size);
        const data = imgData.data;
        // Base black background
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 10;
            data[i + 1] = 10;
            data[i + 2] = 10;
            data[i + 3] = 255;
        }
        const maxLen = Math.min(matrix.length, size * size);
        for (let i = 0; i < maxLen; i++) {
            const entropyVal = (entropyMap && i < entropyMap.length) ? entropyMap[i] : undefined;
            const matrixVal = matrix[i];
            const entropy = entropyVal !== undefined ? (entropyVal / 8.0) : (matrixVal !== undefined ? matrixVal / 255 : 0);
            try {
                const [x, y] = hilbert.offsetToXY(i);
                if (x >= 0 && x < size && y >= 0 && y < size) {
                    const idx = (y * size + x) * 4;
                    data[idx] = 0;
                    data[idx + 1] = Math.floor(Math.pow(entropy, 2) * 255);
                    data[idx + 2] = Math.floor(50 + entropy * 205);
                    data[idx + 3] = 255;
                }
            }
            catch (e) { }
        }
        ctx.putImageData(imgData, 0, 0);
        // Draw Selection Overlay (cyan)
        if (selectionRange) {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
            const maxSel = Math.min(selectionRange.end, maxLen);
            for (let i = selectionRange.start; i < maxSel; i++) {
                try {
                    const [x, y] = hilbert.offsetToXY(i);
                    ctx.fillRect(x, y, 1, 1);
                }
                catch (e) { }
            }
        }
        // Draw Search Match Overlay (magenta)
        if (searchMatches && searchMatches.length > 0) {
            for (const match of searchMatches) {
                const isActive = activeMatchOffset !== undefined && activeMatchOffset !== null && match.offset === activeMatchOffset;
                ctx.fillStyle = isActive ? 'rgba(255, 0, 204, 1.0)' : 'rgba(255, 0, 204, 0.6)';
                const matchEnd = Math.min(match.offset + match.length, maxLen);
                for (let i = match.offset; i < matchEnd; i++) {
                    try {
                        const [x, y] = hilbert.offsetToXY(i);
                        ctx.fillRect(x, y, isActive ? 2 : 1, isActive ? 2 : 1);
                    }
                    catch (e) { }
                }
            }
        }
    }, [matrix, entropyMap, selectionRange, searchMatches, activeMatchOffset, hilbert]);
    // NEW: Render the lightweight crosshair only on the transparent UI canvas
    useEffect(() => {
        const canvas = uiCanvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx)
            return;
        const size = 512;
        canvas.width = size;
        canvas.height = size;
        // Clear previous frame
        ctx.clearRect(0, 0, size, size);
        if (hoverPos) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillRect(hoverPos.x, 0, 1, size);
            ctx.fillRect(0, hoverPos.y, size, 1);
        }
    }, [hoverPos]);
    const handleMouseMove = (e) => {
        if (!canvasRef.current)
            return;
        const rect = canvasRef.current.getBoundingClientRect();
        // Ensure boundaries are strictly clamped to avoid Hilbert math crashes
        let rawX = ((e.clientX - rect.left) / rect.width) * 512;
        let rawY = ((e.clientY - rect.top) / rect.height) * 512;
        const x = Math.max(0, Math.min(511, Math.floor(rawX)));
        const y = Math.max(0, Math.min(511, Math.floor(rawY)));
        try {
            const offset = hilbert.xyToOffset(Math.floor(x), Math.floor(y));
            // Only trigger state update if the actual offset changes
            if (!hoverPos || hoverPos.offset !== offset) {
                setHoverPos({ x, y, offset });
            }
        }
        catch (e) {
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
    const entropyVal = (hoverOffset !== null && entropyMap && hoverOffset < entropyMap.length) ? entropyMap[hoverOffset] : undefined;
    const matrixVal = (hoverOffset !== null && matrix && hoverOffset < matrix.length) ? matrix[hoverOffset] : undefined;
    const hoverEntropy = entropyVal !== undefined ? entropyVal.toFixed(2) : '0.00';
    const hoverByteHex = matrixVal !== undefined ? matrixVal.toString(16).padStart(2, '0').toUpperCase() : '00';
    return (_jsxs("div", { style: { width: '100%', height: '100%', position: 'relative', background: '#050505', overflow: 'hidden' }, children: [_jsxs("div", { style: { position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 100 }, children: [_jsx("button", { onClick: () => setZoom(prev => Math.min(prev + 1, 8)), style: btnStyle, children: _jsx(ZoomIn, { size: 14 }) }), _jsx("button", { onClick: () => setZoom(prev => Math.max(prev - 1, 1)), style: btnStyle, children: _jsx(ZoomOut, { size: 14 }) }), _jsx("button", { onClick: () => setZoom(1), style: btnStyle, children: _jsx(Maximize, { size: 14 }) })] }), _jsxs("div", { style: { position: 'absolute', bottom: 10, left: 10, background: 'rgba(5, 5, 5, 0.9)', padding: '6px 10px', borderRadius: '4px', fontSize: '10px', zIndex: 100, border: '1px solid #333', fontFamily: 'monospace', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', gap: '4px', pointerEvents: 'none' }, children: [_jsxs("div", { style: { color: '#aaa' }, children: ["OFFSET: ", _jsx("span", { style: { color: '#fff' }, children: hoverOffset !== null ? `0x${hoverOffset.toString(16).toUpperCase()}` : '---' })] }), _jsxs("div", { style: { color: '#aaa' }, children: ["BYTE: ", _jsx("span", { style: { color: 'var(--accent-cyan)' }, children: hoverOffset !== null ? `0x${hoverByteHex}` : '--' })] }), _jsxs("div", { style: { color: '#aaa' }, children: ["ENTROPY: ", _jsx("span", { style: { color: Number(hoverEntropy) > 7.5 ? '#00ff9d' : 'var(--accent-blue)' }, children: hoverOffset !== null ? `${hoverEntropy} bits` : '---' })] })] }), _jsx("div", { ref: containerRef, style: { width: '100%', height: '100%', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsxs("div", { style: { position: 'relative', width: `${zoom * 100}%`, minWidth: '100%', maxWidth: `${zoom * 512}px`, aspectRatio: '1 / 1' }, children: [_jsx("canvas", { ref: canvasRef, style: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' } }), _jsx("canvas", { ref: uiCanvasRef, onMouseMove: handleMouseMove, onClick: handleMouseClick, onMouseLeave: () => setHoverPos(null), style: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated', cursor: 'crosshair', zIndex: 10 } })] }) })] }));
};
const btnStyle = { background: 'rgba(15, 15, 17, 0.9)', border: '1px solid #333', color: '#ccc', borderRadius: '4px', padding: '6px', cursor: 'pointer' };
export default Radar;
//# sourceMappingURL=Radar.js.map