import React from 'react';
import type { SearchMatch } from '../types/analysis';
interface SearchBarProps {
    fileData: Uint8Array | null;
    onMatchesChange: (matches: SearchMatch[]) => void;
    onJump: (offset: number, length: number) => void;
}
declare const SearchBar: React.FC<SearchBarProps>;
export default SearchBar;
//# sourceMappingURL=SearchBar.d.ts.map