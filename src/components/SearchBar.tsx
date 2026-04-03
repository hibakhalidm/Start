import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Search, X, ChevronDown, ChevronRight, Loader, AlertTriangle } from 'lucide-react';
import type { SearchMatch } from '../types/analysis';
import type { SearchMode } from '../workers/searchWorker';

interface SearchBarProps {
    fileData: Uint8Array | null;
    onMatchesChange: (matches: SearchMatch[]) => void;
    onJump: (offset: number, length: number) => void;
}

const PLACEHOLDER: Record<SearchMode, string> = {
    REGEX: 'e.g.  \\b\\d{1,3}(\\.\\d{1,3}){3}\\b  or  [\\x20-\\x7e]{6,}',
    HEX:   'e.g.  4D 5A ?? ?? 50 45  or  \\x89PNG',
    ASCII: 'e.g.  kernel32.dll  or  PASSWORD',
};

const MODE_COLORS: Record<SearchMode, string> = {
    REGEX: '#c084fc',   // purple
    HEX:   '#f59e0b',   // amber
    ASCII: '#34d399',   // emerald
};

const SearchBar: React.FC<SearchBarProps> = ({ fileData, onMatchesChange, onJump }) => {
    const [expanded, setExpanded] = useState(false);
    const [pattern, setPattern] = useState('');
    const [mode, setMode] = useState<SearchMode>('HEX');
    const [matches, setMatches] = useState<SearchMatch[]>([]);
    const [truncated, setTruncated] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeIdx, setActiveIdx] = useState<number | null>(null);

    const workerRef = useRef<Worker | null>(null);

    // Spin up the worker once
    useEffect(() => {
        const w = new Worker(new URL('../workers/searchWorker.ts', import.meta.url), { type: 'module' });
        workerRef.current = w;
        return () => w.terminate();
    }, []);

    const clearResults = useCallback(() => {
        setMatches([]);
        setTruncated(false);
        setError(null);
        setActiveIdx(null);
        onMatchesChange([]);
    }, [onMatchesChange]);

    const handleSearch = useCallback(() => {
        if (!fileData || !workerRef.current || pattern.trim() === '') return;

        setIsSearching(true);
        setError(null);
        setMatches([]);
        setActiveIdx(null);
        onMatchesChange([]);

        // Clone buffer so we can transfer without detaching React's copy
        const clone = fileData.buffer.slice(0);

        workerRef.current.onmessage = (e) => {
            setIsSearching(false);
            const data = e.data;
            if (data.success) {
                setMatches(data.matches);
                setTruncated(data.truncated);
                onMatchesChange(data.matches);
            } else {
                setError(data.error);
            }
        };

        workerRef.current.onerror = (err) => {
            setIsSearching(false);
            setError(err.message ?? 'Worker error');
        };

        workerRef.current.postMessage({ buffer: clone, pattern, mode }, [clone]);
    }, [fileData, pattern, mode, onMatchesChange]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSearch();
    };

    const jumpTo = (idx: number) => {
        const m = matches[idx];
        if (!m) return;
        setActiveIdx(idx);
        onJump(m.offset, m.length);
    };

    const navigateMatch = (dir: 1 | -1) => {
        if (matches.length === 0) return;
        const next = activeIdx === null
            ? (dir === 1 ? 0 : matches.length - 1)
            : (activeIdx + dir + matches.length) % matches.length;
        jumpTo(next);
    };

    const modeColor = MODE_COLORS[mode];

    return (
        <div style={{
            background: '#080c10',
            borderBottom: '1px solid #1a2030',
            flexShrink: 0,
            transition: 'all 0.25s ease',
        }}>
            {/* ── Collapsed header row ── */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: '36px',
                    padding: '0 12px',
                    gap: '10px',
                    cursor: 'pointer',
                    userSelect: 'none',
                }}
                onClick={() => setExpanded(p => !p)}
            >
                <Search size={13} color={expanded ? modeColor : '#555'} />
                <span style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    letterSpacing: '1.5px',
                    color: expanded ? modeColor : '#555',
                    transition: 'color 0.2s',
                }}>
                    PATTERN SEARCH
                </span>

                {matches.length > 0 && (
                    <span style={{
                        background: '#ff00cc22',
                        border: '1px solid #ff00cc66',
                        color: '#ff00cc',
                        borderRadius: '10px',
                        padding: '1px 8px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        letterSpacing: '0.5px',
                    }}>
                        {matches.length}{truncated ? '+' : ''} HIT{matches.length !== 1 ? 'S' : ''}
                    </span>
                )}
                {isSearching && <Loader size={12} color="#f59e0b" className="spin-icon" />}

                <div style={{ marginLeft: 'auto' }}>
                    {expanded ? <ChevronDown size={13} color="#555" /> : <ChevronRight size={13} color="#555" />}
                </div>
            </div>

            {/* ── Expanded body ── */}
            {expanded && (
                <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

                    {/* Mode tabs */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {(['HEX', 'REGEX', 'ASCII'] as SearchMode[]).map(m => (
                            <button
                                key={m}
                                onClick={() => { setMode(m); clearResults(); }}
                                style={{
                                    padding: '3px 10px',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    letterSpacing: '1px',
                                    border: `1px solid ${mode === m ? MODE_COLORS[m] : '#2a2a40'}`,
                                    borderRadius: '3px',
                                    background: mode === m ? `${MODE_COLORS[m]}18` : 'transparent',
                                    color: mode === m ? MODE_COLORS[m] : '#555',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {m}
                            </button>
                        ))}
                    </div>

                    {/* Input row */}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            background: '#0d1117',
                            border: `1px solid ${error ? '#ff4444' : '#1e2a3a'}`,
                            borderRadius: '5px',
                            padding: '0 10px',
                            gap: '8px',
                            transition: 'border-color 0.2s',
                        }}>
                            <input
                                id="search-pattern-input"
                                type="text"
                                value={pattern}
                                onChange={e => setPattern(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={PLACEHOLDER[mode]}
                                disabled={!fileData || isSearching}
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: '#e0e8f0',
                                    fontSize: '12px',
                                    fontFamily: 'monospace',
                                    padding: '7px 0',
                                    caretColor: modeColor,
                                }}
                            />
                            {pattern && (
                                <X
                                    size={13}
                                    color="#444"
                                    style={{ cursor: 'pointer', flexShrink: 0 }}
                                    onClick={() => { setPattern(''); clearResults(); }}
                                />
                            )}
                        </div>

                        {/* SCAN button */}
                        <button
                            id="search-scan-btn"
                            onClick={handleSearch}
                            disabled={!fileData || isSearching || pattern.trim() === ''}
                            style={{
                                padding: '7px 16px',
                                background: (fileData && !isSearching && pattern.trim())
                                    ? `linear-gradient(135deg, ${modeColor}33, ${modeColor}18)`
                                    : '#111',
                                border: `1px solid ${(fileData && pattern.trim()) ? modeColor : '#2a2a40'}`,
                                color: (fileData && !isSearching && pattern.trim()) ? modeColor : '#444',
                                borderRadius: '5px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                letterSpacing: '1px',
                                cursor: (fileData && !isSearching && pattern.trim()) ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {isSearching
                                ? <><Loader size={12} className="spin-icon" /> SCANNING</>
                                : <><Search size={12} /> SCAN</>
                            }
                        </button>
                    </div>

                    {/* Error banner */}
                    {error && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: '#ff444411', border: '1px solid #ff444444',
                            borderRadius: '4px', padding: '5px 10px',
                            fontSize: '11px', color: '#ff6666',
                        }}>
                            <AlertTriangle size={12} />
                            {error}
                        </div>
                    )}

                    {/* Truncation warning */}
                    {truncated && (
                        <div style={{
                            fontSize: '10px', color: '#f59e0b',
                            background: '#f59e0b11', border: '1px solid #f59e0b33',
                            borderRadius: '3px', padding: '4px 8px',
                        }}>
                            ⚠ Showing first 500 of many matches — refine your pattern for precision.
                        </div>
                    )}

                    {/* Nav + results list */}
                    {matches.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {/* Prev/Next navigator */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '10px', color: '#555' }}>
                                    {activeIdx !== null ? `${activeIdx + 1} / ${matches.length}` : `${matches.length} match${matches.length !== 1 ? 'es' : ''}`}
                                </span>
                                <button onClick={() => navigateMatch(-1)} style={navBtnStyle}>◀ PREV</button>
                                <button onClick={() => navigateMatch(1)} style={navBtnStyle}>NEXT ▶</button>
                            </div>

                            {/* Scrollable result rows */}
                            <div style={{
                                maxHeight: '160px',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                borderRadius: '4px',
                                border: '1px solid #1a2030',
                            }}>
                                {matches.map((m, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => jumpTo(idx)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '5px 10px',
                                            cursor: 'pointer',
                                            background: activeIdx === idx ? '#ff00cc15' : 'transparent',
                                            borderLeft: `2px solid ${activeIdx === idx ? '#ff00cc' : 'transparent'}`,
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => {
                                            if (activeIdx !== idx)
                                                (e.currentTarget as HTMLDivElement).style.background = '#ffffff08';
                                        }}
                                        onMouseLeave={e => {
                                            if (activeIdx !== idx)
                                                (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                                        }}
                                    >
                                        {/* Offset badge */}
                                        <span style={{
                                            fontFamily: 'monospace',
                                            fontSize: '10px',
                                            color: activeIdx === idx ? '#ff00cc' : '#f59e0b',
                                            minWidth: '80px',
                                            flexShrink: 0,
                                        }}>
                                            0x{m.offset.toString(16).toUpperCase().padStart(8, '0')}
                                        </span>

                                        {/* Hex preview */}
                                        <span style={{
                                            fontFamily: 'monospace',
                                            fontSize: '10px',
                                            color: '#8899aa',
                                            flex: 1,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {m.preview}
                                        </span>

                                        {/* Length */}
                                        <span style={{
                                            fontSize: '9px',
                                            color: '#3a4a5a',
                                            flexShrink: 0,
                                        }}>
                                            +{m.length}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Inline spinner keyframe (injected once) */}
            <style>{`
                @keyframes cifad-spin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
                .spin-icon { animation: cifad-spin 0.8s linear infinite; }
            `}</style>
        </div>
    );
};

const navBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: '1px solid #2a2a40',
    color: '#666',
    borderRadius: '3px',
    padding: '2px 8px',
    fontSize: '10px',
    cursor: 'pointer',
    letterSpacing: '0.5px',
};

export default SearchBar;
