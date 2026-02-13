import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { FixedSizeList as List } from 'react-window';

interface HexViewProps {
    data: Uint8Array;
    stride?: number; // <-- Dynamic Width
    onScroll: (offset: number) => void;
    onSelect: (start: number, end: number) => void;
    selectionRange: { start: number, end: number } | null;
}

export interface HexViewRef {
    scrollToOffset: (offset: number) => void;
}

const HexView = forwardRef<HexViewRef, HexViewProps>(({
    data, stride = 16, onScroll, onSelect, selectionRange
}, ref) => {
    const listRef = useRef<List>(null);
    const rowCount = Math.ceil(data.length / stride);

    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<number | null>(null);

    useImperativeHandle(ref, () => ({
        scrollToOffset: (offset: number) => {
            const rowIndex = Math.floor(offset / stride);
            listRef.current?.scrollToItem(rowIndex, 'center');
        }
    }));

    const handleByteDown = (index: number) => { setIsDragging(true); setDragStart(index); onSelect(index, index); };
    const handleByteEnter = (index: number) => {
        if (isDragging && dragStart !== null) {
            onSelect(Math.min(dragStart, index), Math.max(dragStart, index));
        }
    };
    const handleMouseUp = () => { setIsDragging(false); setDragStart(null); };

    const Row = ({ index, style }: any) => {
        const offset = index * stride;
        if (offset >= data.length) return null;

        const rowData = [];
        for (let i = 0; i < stride; i++) {
            const byteIndex = offset + i;
            if (byteIndex >= data.length) break;
            rowData.push({ val: data[byteIndex], idx: byteIndex });
        }

        return (
            <div style={{ ...style, fontFamily: 'var(--font-mono)', fontSize: '13px', display: 'flex', alignItems: 'center', userSelect: 'none' }}>
                <span style={{ color: '#555', marginRight: '16px', minWidth: '80px' }}>
                    {offset.toString(16).padStart(8, '0').toUpperCase()}
                </span>

                <div style={{ display: 'flex', marginRight: '16px', flexWrap: 'nowrap' }}>
                    {rowData.map(({ val, idx }) => {
                        const isSelected = selectionRange && idx >= selectionRange.start && idx <= selectionRange.end;
                        return (
                            <span
                                key={idx} onMouseDown={() => handleByteDown(idx)} onMouseEnter={() => handleByteEnter(idx)} onMouseUp={handleMouseUp}
                                style={{
                                    marginRight: '6px', color: isSelected ? '#000' : '#a5b3ce',
                                    background: isSelected ? 'var(--accent-cyan)' : 'transparent',
                                    cursor: 'pointer', padding: '0 2px', borderRadius: '2px'
                                }}
                            >
                                {val.toString(16).padStart(2, '0').toUpperCase()}
                            </span>
                        );
                    })}
                </div>
                {stride <= 32 && (
                    <div style={{ display: 'flex', opacity: 0.8 }}>
                        {rowData.map(({ val, idx }) => {
                            const isSelected = selectionRange && idx >= selectionRange.start && idx <= selectionRange.end;
                            return (
                                <span key={idx} style={{ color: isSelected ? 'var(--accent-cyan)' : '#555', fontWeight: isSelected ? 'bold' : 'normal' }}>
                                    {(val > 31 && val < 127) ? String.fromCharCode(val) : '.'}
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div onMouseLeave={handleMouseUp} style={{ height: '100%', width: '100%' }}>
            <List
                ref={listRef} height={600} itemCount={rowCount} itemSize={24} width="100%"
                onItemsRendered={({ visibleStartIndex }) => onScroll(visibleStartIndex * stride)}
            >
                {Row}
            </List>
        </div>
    );
});

export default HexView;