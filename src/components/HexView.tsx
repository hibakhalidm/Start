import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { FixedSizeList as List, ListOnItemsRenderedProps } from 'react-window';

interface HexViewProps {
    window: { start: number; data: Uint8Array } | null;
    totalFileSize: number;
    onScroll: (offset: number) => void;
}

export interface HexViewRef {
    scrollToOffset: (offset: number) => void;
}

const Row = ({ index, style, data }: { index: number; style: React.CSSProperties; data: HexViewProps }) => {
    const { window } = data;
    const bytesPerRow = 16;
    const fileOffset = index * bytesPerRow;

    // Check if this row is within our loaded window
    let rowData: Uint8Array | null = null;

    if (window) {
        const relativeOffset = fileOffset - window.start;
        if (relativeOffset >= 0 && relativeOffset < window.data.length) {
            // We have data for this row
            const end = Math.min(relativeOffset + bytesPerRow, window.data.length);
            rowData = window.data.subarray(relativeOffset, end);
        }
    }

    // Render Logic
    if (!rowData) {
        // Placeholder for unloaded chunks
        return (
            <div style={{ ...style, fontFamily: 'var(--font-mono)', fontSize: '13px', display: 'flex', alignItems: 'center', opacity: 0.3 }}>
                <span style={{ color: '#555', marginRight: '16px', minWidth: '80px' }}>
                    {fileOffset.toString(16).padStart(8, '0').toUpperCase()}
                </span>
                <span>................................................</span>
            </div>
        );
    }

    const hex = Array.from(rowData).map((b: number) => b.toString(16).padStart(2, '0')).join(' ');
    // Simple ASCII Preview
    const ascii = Array.from(rowData).map((b: number) => (b > 31 && b < 127) ? String.fromCharCode(b) : '.').join('');

    return (
        <div style={{ ...style, fontFamily: 'var(--font-mono)', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
            {/* Offset */}
            <span style={{ color: '#555', marginRight: '16px', minWidth: '80px', userSelect: 'none' }}>
                {fileOffset.toString(16).padStart(8, '0').toUpperCase()}
            </span>
            {/* Hex */}
            <span style={{ color: '#a5b3ce', marginRight: '16px', minWidth: '350px' }}>
                {hex}
            </span>
            {/* ASCII */}
            <span style={{ color: 'var(--accent-cyan)', opacity: 0.8 }}>
                {ascii}
            </span>
        </div>
    );
};

const HexView = forwardRef<HexViewRef, HexViewProps>((props, ref) => {
    const listRef = useRef<List>(null);
    const bytesPerRow = 16;
    const rowCount = Math.ceil(props.totalFileSize / bytesPerRow);

    // Allow parent to control scrolling
    useImperativeHandle(ref, () => ({
        scrollToOffset: (offset: number) => {
            const rowIndex = Math.floor(offset / bytesPerRow);
            listRef.current?.scrollToItem(rowIndex, 'center');
        }
    }));

    // Debounce scroll notifications to parent to avoid spamming file slices
    const handleItemsRendered = ({ visibleStartIndex }: ListOnItemsRenderedProps) => {
        const visibleOffset = visibleStartIndex * bytesPerRow;
        props.onScroll(visibleOffset);
    };

    return (
        <List
            ref={listRef}
            height={400} // Parent should control sizing via flex, but fixed for now
            itemCount={rowCount}
            itemSize={24}
            width="100%"
            itemData={props} // Pass props (including window) to Row
            className="hex-view-list"
            onItemsRendered={handleItemsRendered}
            style={{ overflowX: 'hidden' }}
        >
            {Row}
        </List>
    );
});

export default HexView;