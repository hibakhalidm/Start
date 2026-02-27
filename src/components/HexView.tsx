import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { FixedSizeList as List } from 'react-window';

interface HexViewProps {
    data: Uint8Array;
    stride?: number;
    onScroll: (offset: number) => void;
    onSelect: (start: number, end: number) => void;
    selectionRange: { start: number, end: number } | null;
    hoverRange?: { start: number, end: number } | null; // <--- NEW
    onEditByte?: (index: number, newByte: number) => void;
}

export interface HexViewRef { scrollToOffset: (offset: number) => void; }

const HexView = forwardRef<HexViewRef, HexViewProps>(({
    data, stride = 16, onScroll, onSelect, selectionRange, hoverRange, onEditByte
}, ref) => {
    const listRef = useRef<List>(null);
    const rowCount = Math.ceil(data.length / stride);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<number | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    useImperativeHandle(ref, () => ({
        scrollToOffset: (offset: number) => {
            const rowIndex = Math.floor(offset / stride);
            listRef.current?.scrollToItem(rowIndex, 'center');
        }
    }));

    const handleByteDown = (index: number) => { setIsDragging(true); setDragStart(index); onSelect(index, index); };
    const handleByteEnter = (index: number) => { if (isDragging && dragStart !== null) onSelect(Math.min(dragStart, index), Math.max(dragStart, index)); };
    const handleMouseUp = () => { setIsDragging(false); setDragStart(null); };

    const handleDoubleClick = (idx: number, val: number) => {
        setEditingIndex(idx);
        setEditValue(val.toString(16).padStart(2, '0').toUpperCase());
    };

    const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
        if (e.key === 'Enter') {
            const newByte = parseInt(editValue, 16);
            if (!isNaN(newByte) && newByte >= 0 && newByte <= 255) {
                if (onEditByte) onEditByte(idx, newByte);
            }
            setEditingIndex(null);
        } else if (e.key === 'Escape') {
            setEditingIndex(null);
        }
    };

    const Row = ({ index, style }: any) => {
        const offset = index * stride;
        if (offset >= data.length) return null;

        const rowData = [];
        for (let i = 0; i < stride; i++) {
            const byteIndex = offset + i;
            if (byteIndex >= data.length) break;
            rowData.push({ val: data[byteIndex], idx: byteIndex });
        }

        const asciiData = rowData.map(({ val }) => {
            return (val >= 32 && val <= 126) ? String.fromCharCode(val) : '.';
        }).join('');

        return (
            <div style={{ ...style, fontFamily: 'var(--font-mono)', fontSize: '13px', display: 'flex', alignItems: 'center', userSelect: 'none' }}>
                <span style={{ color: '#555', marginRight: '16px', minWidth: '80px' }}>{offset.toString(16).padStart(8, '0').toUpperCase()}</span>
                <div style={{ display: 'flex', marginRight: '16px', flexWrap: 'nowrap' }}>
                    {rowData.map(({ val, idx }) => {
                        const isSelected = selectionRange && idx >= selectionRange.start && idx <= selectionRange.end;
                        const isHovered = !isSelected && hoverRange && idx >= hoverRange.start && idx < hoverRange.end; // <--- GHOST LOGIC
                        const isEditing = editingIndex === idx;

                        if (isEditing) {
                            return (
                                <input
                                    key={idx}
                                    autoFocus
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value.replace(/[^0-9A-Fa-f]/gi, '').slice(0, 2))}
                                    onKeyDown={(e) => handleEditKeyDown(e, idx)}
                                    onBlur={() => setEditingIndex(null)}
                                    style={{
                                        width: '18px', marginRight: '6px', textAlign: 'center', background: '#fff',
                                        color: '#000', border: 'none', padding: '0',
                                        fontFamily: 'var(--font-mono)', fontSize: '13px', outline: 'none'
                                    }}
                                />
                            );
                        }

                        return (
                            <span
                                key={idx} onMouseDown={() => handleByteDown(idx)} onMouseEnter={() => handleByteEnter(idx)} onMouseUp={handleMouseUp}
                                onDoubleClick={() => handleDoubleClick(idx, val)}
                                style={{
                                    marginRight: '6px', display: 'inline-block', width: '18px', textAlign: 'center',
                                    color: isSelected ? '#000' : (isHovered ? 'var(--accent-cyan)' : '#a5b3ce'),
                                    background: isSelected ? 'var(--accent-cyan)' : (isHovered ? 'rgba(0, 240, 255, 0.1)' : 'transparent'),
                                    border: isHovered ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid transparent', // <--- GHOST BORDER
                                    cursor: 'pointer', padding: '0', borderRadius: '2px'
                                }}
                            >
                                {val.toString(16).padStart(2, '0').toUpperCase()}
                            </span>
                        );
                    })}
                </div>
                {/* ASCII SIDEBAR */}
                <div style={{ color: '#666', borderLeft: '1px solid #333', paddingLeft: '16px', marginLeft: 'auto', whiteSpace: 'pre', minWidth: '150px' }}>
                    {asciiData}
                </div>
            </div>
        );
    };

    return (
        <div onMouseLeave={handleMouseUp} style={{ height: '100%', width: '100%' }}>
            <List ref={listRef} height={600} itemCount={rowCount} itemSize={24} width="100%" onItemsRendered={({ visibleStartIndex }: { visibleStartIndex: number }) => onScroll(visibleStartIndex * stride)}>
                {Row}
            </List>
        </div>
    );
});

export default HexView;