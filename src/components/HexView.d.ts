import React from 'react';
import { Align } from 'react-window';
export interface HexViewRef {
    scrollToItem: (index: number, align?: Align) => void;
    scrollToOffset: (offset: number) => void;
}
interface HexViewProps {
    data: Uint8Array | null;
    selectionRange: {
        start: number;
        end: number;
    } | null;
    hoverRange?: {
        start: number;
        end: number;
    } | null;
    stride?: number;
    onSelect: (start: number, end: number) => void;
    onScroll?: (offset: number) => void;
    onEditByte?: (offset: number, newByte: number) => void;
}
declare const HexView: React.ForwardRefExoticComponent<HexViewProps & React.RefAttributes<HexViewRef>>;
export default HexView;
//# sourceMappingURL=HexView.d.ts.map