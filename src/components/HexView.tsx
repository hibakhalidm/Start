import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';

interface HexViewProps {
    data: Uint8Array;
    onScroll: (offset: number) => void;
}

export interface HexViewRef {
    scrollToOffset: (offset: number) => void;
}

const Row = ({ index, style, data }: any) => {
    const bytesPerRow = 16;
    const offset = index * bytesPerRow;
    // Safety check for end of file
    if (offset >= data.length) return null;

    const slice = data.subarray(offset, Math.min(offset + bytesPerRow, data.length));
    const hex = Array.from(slice).map((b: number) => b.toString(16).padStart(2, '0')).join(' ');

    // Simple ASCII Preview (replace non-printables with '.')
    const ascii = Array.from(slice).map((b: number) => (b > 31 && b < 127) ? String.fromCharCode(b) : '.').join('');

    return (
        <div style={{ ...style, fontFamily: 'var(--font-mono)', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
            {/* Offset */}
            <span style={{ color: '#555', marginRight: '16px', minWidth: '80px', userSelect: 'none' }}>
                {offset.toString(16).padStart(8, '0').toUpperCase()}
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

const HexView = forwardRef<HexViewRef, HexViewProps>(({ data, onScroll }, ref) => {
    const listRef = useRef<List>(null);
    const bytesPerRow = 16;
    const rowCount = Math.ceil(data.length / bytesPerRow);

    // Allow parent (App.tsx) to control scrolling
    useImperativeHandle(ref, () => ({
        scrollToOffset: (offset: number) => {
            const rowIndex = Math.floor(offset / bytesPerRow);
            listRef.current?.scrollToItem(rowIndex, 'center');
        }
    }));

    return (
        <List
            ref={listRef}
            height={400} // Controlled by parent flex container
            itemCount={rowCount}
            itemSize={24} // Dense row height
            width="100%"
            itemData={data}
            className="hex-view-list"
            onItemsRendered={({ visibleStartIndex }) => {
                onScroll(visibleStartIndex * bytesPerRow);
            }}
            style={{ overflowX: 'hidden' }}
        >
            {Row}
        </List>
    );
});

export default HexView;