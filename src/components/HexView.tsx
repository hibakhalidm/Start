import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { FixedSizeList as List, ListOnItemsRenderedProps } from 'react-window';

interface HexViewProps {
    window: { start: number; data: Uint8Array } | null;
    totalFileSize: number;
    onScroll: (offset: number) => void;
    onSelect: (start: number, end: number) => void;
    selectionRange: { start: number, end: number } | null;
}

export interface HexViewRef {
    scrollToOffset: (offset: number) => void;
}

const HexView = forwardRef<HexViewRef, HexViewProps>((props, ref) => {
    const listRef = useRef<List>(null);
    const bytesPerRow = 16;
    const rowCount = Math.ceil(props.totalFileSize / bytesPerRow);

    // Internal Selection State (for dragging)
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<number | null>(null);

    // Allow parent to control scrolling
    useImperativeHandle(ref, () => ({
        scrollToOffset: (offset: number) => {
            const rowIndex = Math.floor(offset / bytesPerRow);
            listRef.current?.scrollToItem(rowIndex, 'center');
        }
    }));

    // Debounce scroll notifications
    const handleItemsRendered = ({ visibleStartIndex }: ListOnItemsRenderedProps) => {
        const visibleOffset = visibleStartIndex * bytesPerRow;
        props.onScroll(visibleOffset);
    };

    // --- MOUSE HANDLERS ---
    const handleByteDown = (offset: number) => {
        setIsDragging(true);
        setDragStart(offset);
        props.onSelect(offset, offset);
    };

    const handleByteEnter = (offset: number) => {
        if (isDragging && dragStart !== null) {
            const start = Math.min(dragStart, offset);
            const end = Math.max(dragStart, offset);
            props.onSelect(start, end);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setDragStart(null);
    };

    // --- ROW RENDERER (Inline to access handlers) ---
    const Row = ({ index, style }: any) => {
        const { window, selectionRange } = props;
        const fileOffset = index * bytesPerRow;

        let rowData: { val: number, offset: number }[] | null = null;

        if (window) {
            const relativeOffset = fileOffset - window.start;
            if (relativeOffset >= 0 && relativeOffset < window.data.length) {
                const end = Math.min(relativeOffset + bytesPerRow, window.data.length);
                const chunk = window.data.subarray(relativeOffset, end);
                rowData = Array.from(chunk).map((val, i) => ({
                    val,
                    offset: fileOffset + i
                }));
            }
        }

        if (!rowData) {
            return (
                <div style={{ ...style, fontFamily: 'var(--font-mono)', fontSize: '13px', display: 'flex', alignItems: 'center', opacity: 0.3, userSelect: 'none' }}>
                    <span style={{ color: '#555', marginRight: '16px', minWidth: '80px' }}>
                        {fileOffset.toString(16).padStart(8, '0').toUpperCase()}
                    </span>
                    <span>................................................</span>
                </div>
            );
        }

        return (
            <div style={{ ...style, fontFamily: 'var(--font-mono)', fontSize: '13px', display: 'flex', alignItems: 'center', userSelect: 'none' }}>
                {/* Offset */}
                <span style={{ color: '#555', marginRight: '16px', minWidth: '80px' }}>
                    {fileOffset.toString(16).padStart(8, '0').toUpperCase()}
                </span>

                {/* Hex Bytes */}
                <div style={{ display: 'flex', marginRight: '16px', minWidth: '350px' }}>
                    {rowData.map(({ val, offset }) => {
                        const isSelected = selectionRange && offset >= selectionRange.start && offset <= selectionRange.end;
                        return (
                            <span
                                key={offset}
                                onMouseDown={() => handleByteDown(offset)}
                                onMouseEnter={() => handleByteEnter(offset)}
                                onMouseUp={handleMouseUp}
                                style={{
                                    marginRight: '6px',
                                    color: isSelected ? '#000' : '#a5b3ce',
                                    background: isSelected ? 'var(--accent-cyan)' : 'transparent',
                                    cursor: 'pointer',
                                    padding: '0 2px',
                                    borderRadius: '2px'
                                }}
                            >
                                {val.toString(16).padStart(2, '0').toUpperCase()}
                            </span>
                        );
                    })}
                </div>

                {/* ASCII Preview */}
                <div style={{ display: 'flex', opacity: 0.8 }}>
                    {rowData.map(({ val, offset }) => {
                        const char = (val > 31 && val < 127) ? String.fromCharCode(val) : '.';
                        const isSelected = selectionRange && offset >= selectionRange.start && offset <= selectionRange.end;
                        return (
                            <span key={offset} style={{
                                color: isSelected ? 'var(--accent-cyan)' : '#555',
                                fontWeight: isSelected ? 'bold' : 'normal'
                            }}>
                                {char}
                            </span>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div onMouseLeave={handleMouseUp} style={{ height: '100%', width: '100%' }}>
            <List
                ref={listRef}
                height={400}
                itemCount={rowCount}
                itemSize={24}
                width="100%"
                itemData={props} // Force re-render on props change
                className="hex-view-list"
                onItemsRendered={handleItemsRendered}
                style={{ overflowX: 'hidden' }}
            >
                {Row}
            </List>
        </div>
    );
});

export default HexView;