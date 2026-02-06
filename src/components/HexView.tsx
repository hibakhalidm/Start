import React from 'react';
import { FixedSizeList as List } from 'react-window';

interface HexViewProps {
    data: Uint8Array;
    onScroll: (offset: number) => void;
}

const Row = ({ index, style, data }: { index: number, style: React.CSSProperties, data: Uint8Array }) => {
    const bytesPerRow = 16;
    const offset = index * bytesPerRow;
    const slice = data.subarray(offset, Math.min(offset + bytesPerRow, data.length));

    // Format: Offset | Hex Bytes | ASCII
    const hex = Array.from(slice).map(b => b.toString(16).padStart(2, '0')).join(' ');
    // const ascii = ...

    return (
        <div style={{ ...style, fontFamily: 'monospace', fontSize: '14px', display: 'flex' }}>
            <span style={{ color: '#888', marginRight: '10px', minWidth: '80px' }}>
                {offset.toString(16).padStart(8, '0').toUpperCase()}
            </span>
            <span style={{ color: '#cfc', marginRight: '10px' }}>
                {hex}
            </span>
        </div>
    );
};

const HexView: React.FC<HexViewProps> = ({ data, onScroll }) => {
    const bytesPerRow = 16;
    const rowCount = Math.ceil(data.length / bytesPerRow);

    return (
        <List
            height={800} // Parent height?
            itemCount={rowCount}
            itemSize={24}
            width="100%"
            itemData={data}
            onItemsRendered={({ visibleStartIndex }) => {
                onScroll(visibleStartIndex * bytesPerRow);
            }}
        >
            {Row}
        </List>
    );
};

export default HexView;
