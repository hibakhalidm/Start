import React, { forwardRef, useState, useEffect, useRef, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';

interface HexViewProps {
    data: Uint8Array | null;
    selectionRange: { start: number, end: number } | null;
    onSelectRange: (start: number, end: number) => void;
    onByteEdit?: (offset: number, newByte: number) => void;
}

const HexView = forwardRef<any, HexViewProps>(({ data, selectionRange, onSelectRange, onByteEdit }, ref) => {
    const listRef = useRef<List>(null);

    const [editOffset, setEditOffset] = useState<number | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => ({
        scrollToItem: (index: number, align?: string) => {
            if (listRef.current) listRef.current.scrollToItem(index, align);
        }
    }));

    useEffect(() => {
        if (editOffset !== null && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editOffset]);

    if (!data || data.length === 0) return null;

    const rowCount = Math.ceil(data.length / 16);

    const handleCommitEdit = () => {
        if (editOffset !== null && onByteEdit) {
            const parsed = parseInt(editValue, 16);
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 255) {
                onByteEdit(editOffset, parsed);
            }
        }
        setEditOffset(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleCommitEdit();
        if (e.key === 'Escape') setEditOffset(null);
    };

    // CORE FIX: Bundle all state into a context object so react-window knows when to redraw rows
    const contextData = useMemo(() => ({
        buffer: data,
        selectionRange,
        editOffset,
        editValue
    }), [data, selectionRange, editOffset, editValue]);

    // Update Row to destructure from 'data.context' instead of global scope
    const Row = ({ index, style, data: context }: { index: number, style: React.CSSProperties, data: any }) => {
        const { buffer, selectionRange, editOffset, editValue } = context;

        const offset = index * 16;
        const chunk = buffer.slice(offset, offset + 16);

        // Build the ASCII string securely from the freshly updated buffer
        let asciiStr = '';
        for (let i = 0; i < chunk.length; i++) {
            const charCode = chunk[i];
            if (charCode >= 32 && charCode <= 126) asciiStr += String.fromCharCode(charCode);
            else asciiStr += '.';
        }

        return (
            <div style={{ ...style, display: 'flex', fontFamily: 'monospace', fontSize: '0.85rem', color: '#aaa', padding: '0 10px', alignItems: 'center' }}>
                <div style={{ width: '80px', color: '#555', userSelect: 'none' }}>
                    {offset.toString(16).padStart(8, '0').toUpperCase()}
                </div>

                <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                    {Array.from(chunk).map((byte: any, i: number) => {
                        const byteOffset = offset + i;
                        const isSelected = selectionRange && byteOffset >= selectionRange.start && byteOffset < selectionRange.end;
                        const isEditing = editOffset === byteOffset;

                        return (
                            <div
                                key={i}
                                onDoubleClick={() => {
                                    setEditOffset(byteOffset);
                                    setEditValue(byte.toString(16).padStart(2, '0').toUpperCase());
                                }}
                                onClick={() => onSelectRange(byteOffset, byteOffset + 1)}
                                style={{
                                    width: '20px', textAlign: 'center', cursor: 'pointer', borderRadius: '2px',
                                    background: isSelected ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
                                    color: isSelected ? '#fff' : (byte === 0 ? '#444' : 'var(--accent-cyan)'),
                                    position: 'relative'
                                }}
                            >
                                {isEditing ? (
                                    <input
                                        ref={inputRef}
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value.replace(/[^0-9A-Fa-f]/gi, '').slice(0, 2))}
                                        onBlur={handleCommitEdit}
                                        onKeyDown={handleKeyDown}
                                        style={{
                                            position: 'absolute', top: -2, left: -2, width: '24px', height: '20px',
                                            background: '#fff', color: '#000', border: 'none', outline: 'none',
                                            textAlign: 'center', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 10
                                        }}
                                    />
                                ) : (
                                    byte.toString(16).padStart(2, '0').toUpperCase()
                                )}
                            </div>
                        );
                    })}
                </div>

                <div style={{ width: '140px', color: '#888', letterSpacing: '1px', borderLeft: '1px solid #222', paddingLeft: '10px' }}>
                    {asciiStr}
                </div>
            </div>
        );
    };

    return (
        <div style={{ flex: 1, height: '100%', background: '#0a0a0c', overflow: 'hidden' }}>
            <List
                ref={listRef}
                height={1000}
                itemCount={rowCount}
                itemSize={24}
                width="100%"
                style={{ overflowX: 'hidden' }}
                itemData={contextData} // <--- The Fix
            >
                {Row}
            </List>
        </div>
    );
});

export default HexView;