import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { forwardRef, useState, useEffect, useRef, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
const HexView = forwardRef(({ data, selectionRange, hoverRange, stride = 16, onSelect, onScroll, onEditByte }, ref) => {
    const listRef = useRef(null);
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const [editOffset, setEditOffset] = useState(null);
    const [editValue, setEditValue] = useState('');
    // ResizeObserver-driven height — starts at 600 as a safe default
    const [containerHeight, setContainerHeight] = useState(600);
    // ── ResizeObserver: track the panel height in real time ──────────────────
    useEffect(() => {
        const el = containerRef.current;
        if (!el)
            return;
        const ro = new ResizeObserver((entries) => {
            const h = entries[0]?.contentRect.height;
            if (h && h > 0)
                setContainerHeight(h);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    // ── imperative scroll API ─────────────────────────────────────────────────
    React.useImperativeHandle(ref, () => ({
        scrollToItem: (index, align) => listRef.current?.scrollToItem(index, align),
        scrollToOffset: (offset) => listRef.current?.scrollToItem(Math.floor(offset / stride), 'center'),
    }));
    // ── focus the inline editor whenever editOffset changes ─────────────────
    useEffect(() => {
        if (editOffset !== null) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [editOffset]);
    if (!data || data.length === 0)
        return null;
    const rowCount = Math.ceil(data.length / stride);
    const handleCommitEdit = () => {
        if (editOffset !== null && onEditByte) {
            const parsed = parseInt(editValue, 16);
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 255) {
                onEditByte(editOffset, parsed);
            }
        }
        setEditOffset(null);
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter')
            handleCommitEdit();
        if (e.key === 'Escape')
            setEditOffset(null);
    };
    // ── Bundle all row-rendering state into a stable context object ───────────
    // This is the key pattern for react-window: without itemData, rows don't
    // re-render when selection/edit state changes.
    const contextData = useMemo(() => ({
        buffer: data,
        selectionRange,
        hoverRange,
        stride,
        editOffset,
        editValue,
        onSelect,
    }), [data, selectionRange, hoverRange, stride, editOffset, editValue, onSelect]);
    // ── Virtualised row renderer ──────────────────────────────────────────────
    const Row = ({ index, style, data: ctx }) => {
        const { buffer, selectionRange, editOffset, editValue, stride, hoverRange, onSelect } = ctx;
        const offset = index * stride;
        const chunk = buffer.slice(offset, offset + stride);
        let asciiStr = '';
        for (let i = 0; i < chunk.length; i++) {
            const c = chunk[i];
            asciiStr += (c >= 32 && c <= 126) ? String.fromCharCode(c) : '.';
        }
        return (_jsxs("div", { style: { ...style, display: 'flex', fontFamily: 'monospace', fontSize: '0.85rem', color: '#aaa', padding: '0 10px', alignItems: 'center' }, children: [_jsx("div", { style: { width: '80px', color: '#555', userSelect: 'none' }, children: offset.toString(16).padStart(8, '0').toUpperCase() }), _jsx("div", { style: { display: 'flex', gap: '6px', flex: 1 }, children: Array.from(chunk).map((byte, i) => {
                        const byteOffset = offset + i;
                        const isSelected = selectionRange
                            && byteOffset >= selectionRange.start
                            && byteOffset < selectionRange.end;
                        const isEditing = editOffset === byteOffset;
                        return (_jsx("div", { onDoubleClick: () => {
                                setEditOffset(byteOffset);
                                setEditValue(byte.toString(16).padStart(2, '0').toUpperCase());
                            }, onClick: () => onSelect && onSelect(byteOffset, byteOffset + 1), style: {
                                width: '20px', textAlign: 'center', cursor: 'pointer',
                                borderRadius: '2px',
                                background: isSelected ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
                                color: isSelected ? '#fff' : (byte === 0 ? '#444' : 'var(--accent-cyan)'),
                                position: 'relative',
                            }, children: isEditing ? (_jsx("input", { ref: inputRef, value: editValue, onChange: e => setEditValue(e.target.value.replace(/[^0-9A-Fa-f]/gi, '').slice(0, 2)), onBlur: handleCommitEdit, onKeyDown: handleKeyDown, style: {
                                    position: 'absolute', top: -2, left: -2,
                                    width: '24px', height: '20px',
                                    background: '#fff', color: '#000',
                                    border: 'none', outline: 'none',
                                    textAlign: 'center', fontSize: '0.85rem',
                                    fontWeight: 'bold', zIndex: 10,
                                } })) : (byte.toString(16).padStart(2, '0').toUpperCase()) }, i));
                    }) }), _jsx("div", { style: { width: '140px', color: '#888', letterSpacing: '1px', borderLeft: '1px solid #222', paddingLeft: '10px' }, children: asciiStr })] }));
    };
    return (_jsx("div", { ref: containerRef, style: { flex: 1, height: '100%', background: '#0a0a0c', overflow: 'hidden' }, children: _jsx(List, { ref: listRef, height: containerHeight, itemCount: rowCount, itemSize: 24, width: "100%", style: { overflowX: 'hidden' }, itemData: contextData, onScroll: onScroll ? ({ scrollOffset }) => onScroll(scrollOffset) : undefined, children: Row }) }));
});
export default HexView;
//# sourceMappingURL=HexView.js.map