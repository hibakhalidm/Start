import React from 'react';
import { TlvNode } from '../types/analysis';
interface Props {
    node: TlvNode | null;
    fileData: Uint8Array | null;
    selectionRange?: {
        start: number;
        end: number;
    } | null;
    onFocus?: (start: number, end: number) => void;
}
declare const StructureInspector: React.FC<Props>;
export default StructureInspector;
//# sourceMappingURL=StructureInspector.d.ts.map