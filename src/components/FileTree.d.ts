import React from 'react';
import { TlvNode } from '../types/analysis';
import { DetectedStandard } from '../utils/standards';
interface Props {
    file: File | null;
    fileSize?: number;
    structures?: TlvNode[];
    standard?: DetectedStandard | null;
    selectionOffset?: number | null;
    onSelectRange: (start: number, end: number) => void;
    onHoverRange: (range: {
        start: number;
        end: number;
    } | null) => void;
    onNodeSelect?: (node: TlvNode) => void;
}
declare const FileTree: React.FC<Props>;
export default FileTree;
//# sourceMappingURL=FileTree.d.ts.map