import React from 'react';
import { HilbertCurve } from '../utils/hilbert';
interface RadarProps {
    matrix: Uint8Array;
    entropyMap: number[];
    highlightOffset: number | null;
    selectionRange: {
        start: number;
        end: number;
    } | null;
    hilbert: HilbertCurve;
    onJump: (offset: number) => void;
    onSelectRange: (start: number, end: number) => void;
    onHover?: (offset: number | null) => void;
}
declare const Radar: React.FC<RadarProps>;
export default Radar;
//# sourceMappingURL=Radar.d.ts.map