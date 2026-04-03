import type { SearchMatch } from '../types/analysis';
export type SearchMode = 'REGEX' | 'HEX' | 'ASCII';
export interface SearchRequest {
    buffer: ArrayBuffer;
    pattern: string;
    mode: SearchMode;
}
export interface SearchResponseOk {
    success: true;
    matches: SearchMatch[];
    truncated: boolean;
}
export interface SearchResponseErr {
    success: false;
    error: string;
}
export type SearchResponse = SearchResponseOk | SearchResponseErr;
//# sourceMappingURL=searchWorker.d.ts.map