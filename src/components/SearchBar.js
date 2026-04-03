import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useCallback, useEffect } from 'react';
import { Search, X, ChevronDown, ChevronRight, Loader, AlertTriangle } from 'lucide-react';
const PLACEHOLDER = {
    REGEX: 'e.g.  \\b\\d{1,3}(\\.\\d{1,3}){3}\\b  or  [\\x20-\\x7e]{6,}',
    HEX: 'e.g.  4D 5A ?? ?? 50 45  or  \\x89PNG',
    ASCII: 'e.g.  kernel32.dll  or  PASSWORD',
};
const MODE_COLORS = {
    REGEX: '#c084fc', // purple
    HEX: '#f59e0b', // amber
    ASCII: '#34d399', // emerald
};
const SearchBar = ({ fileData, onMatchesChange, onJump }) => {
    const [expanded, setExpanded] = useState(false);
    const [pattern, setPattern] = useState('');
    const [mode, setMode] = useState('HEX');
    const [matches, setMatches] = useState([]);
    const [truncated, setTruncated] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState(null);
    const [activeIdx, setActiveIdx] = useState(null);
    const workerRef = useRef(null);
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
        if (!fileData || !workerRef.current || pattern.trim() === '')
            return;
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
            }
            else {
                setError(data.error);
            }
        };
        workerRef.current.onerror = (err) => {
            setIsSearching(false);
            setError(err.message ?? 'Worker error');
        };
        workerRef.current.postMessage({ buffer: clone, pattern, mode }, [clone]);
    }, [fileData, pattern, mode, onMatchesChange]);
    const handleKeyDown = (e) => {
        if (e.key === 'Enter')
            handleSearch();
    };
    const jumpTo = (idx) => {
        const m = matches[idx];
        if (!m)
            return;
        setActiveIdx(idx);
        onJump(m.offset, m.length);
    };
    const navigateMatch = (dir) => {
        if (matches.length === 0)
            return;
        const next = activeIdx === null
            ? (dir === 1 ? 0 : matches.length - 1)
            : (activeIdx + dir + matches.length) % matches.length;
        jumpTo(next);
    };
    const modeColor = MODE_COLORS[mode];
    return (_jsxs("div", { style: {
            background: '#080c10',
            borderBottom: '1px solid #1a2030',
            flexShrink: 0,
            transition: 'all 0.25s ease',
        }, children: [_jsxs("div", { style: {
                    display: 'flex',
                    alignItems: 'center',
                    height: '36px',
                    padding: '0 12px',
                    gap: '10px',
                    cursor: 'pointer',
                    userSelect: 'none',
                }, onClick: () => setExpanded(p => !p), children: [_jsx(Search, { size: 13, color: expanded ? modeColor : '#555' }), _jsx("span", { style: {
                            fontSize: '10px',
                            fontWeight: 'bold',
                            letterSpacing: '1.5px',
                            color: expanded ? modeColor : '#555',
                            transition: 'color 0.2s',
                        }, children: "PATTERN SEARCH" }), matches.length > 0 && (_jsxs("span", { style: {
                            background: '#ff00cc22',
                            border: '1px solid #ff00cc66',
                            color: '#ff00cc',
                            borderRadius: '10px',
                            padding: '1px 8px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            letterSpacing: '0.5px',
                        }, children: [matches.length, truncated ? '+' : '', " HIT", matches.length !== 1 ? 'S' : ''] })), isSearching && _jsx(Loader, { size: 12, color: "#f59e0b", className: "spin-icon" }), _jsx("div", { style: { marginLeft: 'auto' }, children: expanded ? _jsx(ChevronDown, { size: 13, color: "#555" }) : _jsx(ChevronRight, { size: 13, color: "#555" }) })] }), expanded && (_jsxs("div", { style: { padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }, children: [_jsx("div", { style: { display: 'flex', gap: '4px' }, children: ['HEX', 'REGEX', 'ASCII'].map(m => (_jsx("button", { onClick: () => { setMode(m); clearResults(); }, style: {
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
                            }, children: m }, m))) }), _jsxs("div", { style: { display: 'flex', gap: '6px', alignItems: 'center' }, children: [_jsxs("div", { style: {
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: '#0d1117',
                                    border: `1px solid ${error ? '#ff4444' : '#1e2a3a'}`,
                                    borderRadius: '5px',
                                    padding: '0 10px',
                                    gap: '8px',
                                    transition: 'border-color 0.2s',
                                }, children: [_jsx("input", { id: "search-pattern-input", type: "text", value: pattern, onChange: e => setPattern(e.target.value), onKeyDown: handleKeyDown, placeholder: PLACEHOLDER[mode], disabled: !fileData || isSearching, style: {
                                            flex: 1,
                                            background: 'transparent',
                                            border: 'none',
                                            outline: 'none',
                                            color: '#e0e8f0',
                                            fontSize: '12px',
                                            fontFamily: 'monospace',
                                            padding: '7px 0',
                                            caretColor: modeColor,
                                        } }), pattern && (_jsx(X, { size: 13, color: "#444", style: { cursor: 'pointer', flexShrink: 0 }, onClick: () => { setPattern(''); clearResults(); } }))] }), _jsx("button", { id: "search-scan-btn", onClick: handleSearch, disabled: !fileData || isSearching || pattern.trim() === '', style: {
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
                                }, children: isSearching
                                    ? _jsxs(_Fragment, { children: [_jsx(Loader, { size: 12, className: "spin-icon" }), " SCANNING"] })
                                    : _jsxs(_Fragment, { children: [_jsx(Search, { size: 12 }), " SCAN"] }) })] }), error && (_jsxs("div", { style: {
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: '#ff444411', border: '1px solid #ff444444',
                            borderRadius: '4px', padding: '5px 10px',
                            fontSize: '11px', color: '#ff6666',
                        }, children: [_jsx(AlertTriangle, { size: 12 }), error] })), truncated && (_jsx("div", { style: {
                            fontSize: '10px', color: '#f59e0b',
                            background: '#f59e0b11', border: '1px solid #f59e0b33',
                            borderRadius: '3px', padding: '4px 8px',
                        }, children: "\u26A0 Showing first 500 of many matches \u2014 refine your pattern for precision." })), matches.length > 0 && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx("span", { style: { fontSize: '10px', color: '#555' }, children: activeIdx !== null ? `${activeIdx + 1} / ${matches.length}` : `${matches.length} match${matches.length !== 1 ? 'es' : ''}` }), _jsx("button", { onClick: () => navigateMatch(-1), style: navBtnStyle, children: "\u25C0 PREV" }), _jsx("button", { onClick: () => navigateMatch(1), style: navBtnStyle, children: "NEXT \u25B6" })] }), _jsx("div", { style: {
                                    maxHeight: '160px',
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px',
                                    borderRadius: '4px',
                                    border: '1px solid #1a2030',
                                }, children: matches.map((m, idx) => (_jsxs("div", { onClick: () => jumpTo(idx), style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '5px 10px',
                                        cursor: 'pointer',
                                        background: activeIdx === idx ? '#ff00cc15' : 'transparent',
                                        borderLeft: `2px solid ${activeIdx === idx ? '#ff00cc' : 'transparent'}`,
                                        transition: 'background 0.15s',
                                    }, onMouseEnter: e => {
                                        if (activeIdx !== idx)
                                            e.currentTarget.style.background = '#ffffff08';
                                    }, onMouseLeave: e => {
                                        if (activeIdx !== idx)
                                            e.currentTarget.style.background = 'transparent';
                                    }, children: [_jsxs("span", { style: {
                                                fontFamily: 'monospace',
                                                fontSize: '10px',
                                                color: activeIdx === idx ? '#ff00cc' : '#f59e0b',
                                                minWidth: '80px',
                                                flexShrink: 0,
                                            }, children: ["0x", m.offset.toString(16).toUpperCase().padStart(8, '0')] }), _jsx("span", { style: {
                                                fontFamily: 'monospace',
                                                fontSize: '10px',
                                                color: '#8899aa',
                                                flex: 1,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }, children: m.preview }), _jsxs("span", { style: {
                                                fontSize: '9px',
                                                color: '#3a4a5a',
                                                flexShrink: 0,
                                            }, children: ["+", m.length] })] }, idx))) })] }))] })), _jsx("style", { children: `
                @keyframes cifad-spin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
                .spin-icon { animation: cifad-spin 0.8s linear infinite; }
            ` })] }));
};
const navBtnStyle = {
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
//# sourceMappingURL=SearchBar.js.map