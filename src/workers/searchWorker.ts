// src/workers/searchWorker.ts
/// <reference lib="webworker" />

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

const MAX_MATCHES = 500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a human-readable hex+ascii snippet around a match */
function buildPreview(bytes: Uint8Array, offset: number, length: number): string {
    const SNIP = 8;
    const start = Math.max(0, offset);
    const end = Math.min(bytes.length, start + Math.min(length, SNIP));
    const hexPart = Array.from(bytes.subarray(start, end))
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
    const asciiPart = Array.from(bytes.subarray(start, end))
        .map(b => (b >= 0x20 && b < 0x7f) ? String.fromCharCode(b) : '.')
        .join('');
    return `${hexPart}  |${asciiPart}|`;
}

/** Decode bytes as Latin-1 (1:1 byte→char, preserves all 256 values) */
function toLatin1String(bytes: Uint8Array): string {
    // Build in chunks to avoid stack overflow on large files
    const CHUNK = 65536;
    let result = '';
    for (let i = 0; i < bytes.length; i += CHUNK) {
        result += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return result;
}

// ---------------------------------------------------------------------------
// REGEX mode
// ---------------------------------------------------------------------------
function scanRegex(bytes: Uint8Array, pattern: string): { matches: SearchMatch[]; truncated: boolean } {
    let re: RegExp;
    try {
        re = new RegExp(pattern, 'g');
    } catch {
        throw new Error(`Invalid regex: ${pattern}`);
    }

    const text = toLatin1String(bytes);
    const matches: SearchMatch[] = [];
    let m: RegExpExecArray | null;
    let truncated = false;

    while ((m = re.exec(text)) !== null) {
        const offset = m.index;
        const length = m[0].length || 1; // avoid infinite loop on zero-length match
        matches.push({
            offset,
            length,
            preview: buildPreview(bytes, offset, length),
        });
        if (matches.length >= MAX_MATCHES) { truncated = true; break; }
        // Advance past zero-length matches
        if (length === 0) re.lastIndex++;
    }

    return { matches, truncated };
}

// ---------------------------------------------------------------------------
// HEX mode  (e.g. "4D 5A ?? ?? 50 45")
// ---------------------------------------------------------------------------
interface HexToken {
    type: 'byte' | 'wildcard';
    value?: number;
}

function parseHexPattern(pattern: string): HexToken[] {
    // Accept: "4D5A??5045", "4D 5A ?? 50 45", "\x4D\x5A", mixed
    const normalized = pattern
        .replace(/\\x([0-9a-fA-F]{2})/g, '$1 ')  // \xNN → NN
        .replace(/[^0-9a-fA-F?]/g, ' ')           // strip non-hex
        .trim();

    const tokens: HexToken[] = [];
    const parts = normalized.split(/\s+/).filter(Boolean);
    for (const part of parts) {
        if (part === '??' || part === '?') {
            tokens.push({ type: 'wildcard' });
        } else {
            // might be 2-char token "4D" or longer "4D5A" — split into bytes
            if (part.length % 2 !== 0) throw new Error(`Odd-length hex token: "${part}"`);
            for (let i = 0; i < part.length; i += 2) {
                const byte = parseInt(part.slice(i, i + 2), 16);
                tokens.push({ type: 'byte', value: byte });
            }
        }
    }
    if (tokens.length === 0) throw new Error('Empty hex pattern');
    return tokens;
}

function scanHex(bytes: Uint8Array, pattern: string): { matches: SearchMatch[]; truncated: boolean } {
    const tokens = parseHexPattern(pattern);
    const matches: SearchMatch[] = [];
    let truncated = false;
    const limit = bytes.length - tokens.length + 1;

    outer: for (let i = 0; i < limit; i++) {
        for (let j = 0; j < tokens.length; j++) {
            const tok = tokens[j];
            if (tok.type === 'byte' && bytes[i + j] !== tok.value) continue outer;
        }
        matches.push({
            offset: i,
            length: tokens.length,
            preview: buildPreview(bytes, i, tokens.length),
        });
        if (matches.length >= MAX_MATCHES) { truncated = true; break; }
    }

    return { matches, truncated };
}

// ---------------------------------------------------------------------------
// ASCII mode  (plain printable-ASCII substring search)
// ---------------------------------------------------------------------------
function scanAscii(bytes: Uint8Array, pattern: string): { matches: SearchMatch[]; truncated: boolean } {
    if (pattern.length === 0) throw new Error('Empty ASCII pattern');

    // Build byte array from plain ASCII
    const needle = Uint8Array.from(pattern.split('').map(c => c.charCodeAt(0) & 0xff));
    const matches: SearchMatch[] = [];
    let truncated = false;
    const limit = bytes.length - needle.length + 1;
    const first = needle[0];

    for (let i = 0; i < limit; i++) {
        if (bytes[i] !== first) continue;
        let ok = true;
        for (let j = 1; j < needle.length; j++) {
            if (bytes[i + j] !== needle[j]) { ok = false; break; }
        }
        if (ok) {
            matches.push({
                offset: i,
                length: needle.length,
                preview: buildPreview(bytes, i, needle.length),
            });
            if (matches.length >= MAX_MATCHES) { truncated = true; break; }
            i += needle.length - 1; // skip past match
        }
    }

    return { matches, truncated };
}

// ---------------------------------------------------------------------------
// Worker message handler
// ---------------------------------------------------------------------------
self.onmessage = (e: MessageEvent<SearchRequest>) => {
    const { buffer, pattern, mode } = e.data;
    try {
        if (!pattern || pattern.trim() === '') {
            self.postMessage({ success: true, matches: [], truncated: false });
            return;
        }

        const bytes = new Uint8Array(buffer);
        let result: { matches: SearchMatch[]; truncated: boolean };

        if (mode === 'REGEX') result = scanRegex(bytes, pattern.trim());
        else if (mode === 'HEX') result = scanHex(bytes, pattern.trim());
        else result = scanAscii(bytes, pattern.trim());

        self.postMessage({ success: true, ...result });
    } catch (err: any) {
        self.postMessage({ success: false, error: err.message ?? 'Unknown scan error' });
    }
};
