import React, { useState, useEffect, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { BitmapLayer, ScatterplotLayer } from '@deck.gl/layers';
import { HilbertCurve } from '../utils/hilbert';
import { Box, Activity } from 'lucide-react'; // Icons for views

interface RadarProps {
    matrix: Uint8Array;      // 2D Data (512x512)
    entropyMap: number[];    // 1D Data (Linear)
    highlightOffset: number | null;
    selectionRange: { start: number, end: number } | null;
    hilbert: HilbertCurve;
    onJump: (offset: number) => void;
}

const Radar: React.FC<RadarProps> = ({
    matrix,
    entropyMap,
    highlightOffset,
    selectionRange,
    hilbert,
    onJump
}) => {
    const [viewMode, setViewMode] = useState<'HILBERT' | 'LINEAR'>('HILBERT');
    const containerRef = useRef<HTMLDivElement>(null);

    // --- VIEW 1: HILBERT (DECK.GL) ---
    const getHilbertLayers = () => {
        const width = 512;
        const height = 512;
        const layers: any[] = [
            new BitmapLayer({
                id: 'hilbert-bitmap',
                image: { width, height, data: matrix },
                bounds: [0, 0, width, height],
                pickable: true,
                onClick: (info: any) => {
                    if (info.bitmapPixel) {
                        const [x, y] = info.bitmapPixel;
                        onJump(hilbert.xyToOffset(x, y));
                    }
                }
            })
        ];

        // Selection Markers (Start/End)
        if (selectionRange) {
            const startXY = hilbert.offsetToXY(selectionRange.start);
            const endXY = hilbert.offsetToXY(selectionRange.end);
            layers.push(
                new ScatterplotLayer({
                    id: 'markers',
                    data: [
                        { pos: [startXY[0] + 0.5, startXY[1] + 0.5], color: [0, 240, 255, 255] },
                        { pos: [endXY[0] + 0.5, endXY[1] + 0.5], color: [255, 40, 40, 255] }
                    ],
                    getPosition: (d: any) => d.pos,
                    getFillColor: (d: any) => d.color,
                    getRadius: 6,
                    updateTriggers: {
                        data: selectionRange // FORCE UPDATE
                    }
                })
            );
        }

        // Reticle
        if (highlightOffset !== null) {
            const [x, y] = hilbert.offsetToXY(highlightOffset);
            layers.push(new ScatterplotLayer({
                id: 'reticle',
                data: [{ pos: [x + 0.5, y + 0.5] }],
                getPosition: (d: any) => d.pos,
                getFillColor: [0, 0, 0, 0],
                getLineColor: [0, 240, 255],
                stroked: true,
                radiusMinPixels: 10,
                getRadius: 20,
                updateTriggers: {
                    getPosition: highlightOffset // FORCE UPDATE
                }
            }));
        }

        return layers;
    };

    // --- VIEW 2: LINEAR (CANVAS) ---
    const LinearView = () => {
        const canvasRef = useRef<HTMLCanvasElement>(null);

        useEffect(() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx) return;

            // Simple resize observer or just use bounding rect
            const { width, height } = canvas.getBoundingClientRect();
            // prevent 0 size
            if (width === 0 || height === 0) return;

            canvas.width = width;
            canvas.height = height;

            ctx.clearRect(0, 0, width, height);

            if (entropyMap.length === 0) return;

            // Draw Entropy
            const step = width / entropyMap.length;
            // Optimisation: if step is too small, we might want to group? 
            // But for now, simple drawing.

            entropyMap.forEach((val, i) => {
                const x = i * step;
                // Color Map (Same as Scrollbar)
                if (val > 7.0) ctx.fillStyle = '#ff2a2a'; // Encrypted
                else if (val < 4.8) ctx.fillStyle = '#3b82f6'; // Text
                else ctx.fillStyle = '#1a1a20'; // Base

                // Draw full height bar
                // Ensure at least 1px width if step is tiny? 
                // Actually if step < 1, we are overdrawing. Canvas handles it "okay" by blending or last-wins.
                ctx.fillRect(Math.floor(x), 0, Math.ceil(Math.max(1, step)), height);
            });

            // Draw Selection Overlay
            if (selectionRange && entropyMap.length > 0) {
                // Assuming entropy map covers the whole file size somewhat linearly?
                // The entropy map usually has fewer points than bytes. 
                // We need to map byte-range to map-index-range?
                // Actually `entropyMap` here is likely chunks. 
                // Assuming 1 item in entropyMap = 1 Chunk (e.g. 1024 bytes) or is it per byte?
                // In `useAnalysisEngine`, it comes from WASM. Usually it is downsampled.
                // Let's assume proportional mapping to width for now.

                // However, we don't have totalFileSize passed here explicitly to normalize?
                // Wait, we do not have totalFileSize prop. We HAVE to assume entropyMap maps 0..1 of the file.

                const totalItems = entropyMap.length;
                // But wait, selectionRange is in BYTES. entropyMap is in... blocks?
                // If we don't know the block size, we can't map accurately.
                // BUT, `onJump` expects a byte offset.
                // Let's assume the App passes us `entropyMap` fully populated for the file.
                // We will approximate: 
                // startX = (selectionRange.start / (MAX_BYTES)) * width.
                // We don't have MAX_BYTES.
                // Let's rely on the previous implementation detail: 
                // "entropyMap" from analysis usually covers the whole file. 
                // We might need to know the Total File Size or assume some density?

                // In the user's provided code:
                // const offset = Math.floor(percent * (entropyMap.length * 256));
                // This implies 1 entropy unit = 256 bytes? 
                // Let's stick to the User's provided snippet logic for `onClick`, 
                // but for rendering selection we need to be careful.

                // If we don't have fileSize, we can't accurately draw the selection box relative to 0..1 
                // unless we assume entropyMap correlates to file size via that 256 factor OR 
                // we just accept consistent ratio.

                // FIX: For now, I will use `entropyMap.length * 256` as the estimated file size 
                // to be consistent with the `onClick` handler provided by the user.
                const estimatedTotalSize = entropyMap.length * 256;

                if (estimatedTotalSize > 0) {
                    const startX = (selectionRange.start / estimatedTotalSize) * width;
                    const endX = (selectionRange.end / estimatedTotalSize) * width;
                    const selectionWidth = Math.max(2, endX - startX);

                    ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
                    ctx.fillRect(startX, 0, selectionWidth, height);
                    ctx.strokeStyle = '#00f0ff';
                    ctx.strokeRect(startX, 0, selectionWidth, height);
                }
            }

        }, [entropyMap, selectionRange]);

        return (
            <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    // User code assumption: 1 entropy unit = 256 bytes (approx block size of analysis?)
                    const offset = Math.floor(percent * (entropyMap.length * 256));
                    onJump(offset);
                }}
            />
        );
    };

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>

            {/* HEADER TOOLBAR */}
            <div style={{
                height: '32px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center',
                padding: '0 10px', justifyContent: 'space-between', background: '#0a0a0f'
            }}>
                <span style={{ fontSize: '10px', color: '#555', letterSpacing: '1px' }}>GLOBAL RADAR</span>
                <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                        onClick={() => setViewMode('HILBERT')}
                        title="2D Hilbert Map"
                        style={{
                            background: viewMode === 'HILBERT' ? 'var(--accent-cyan)' : 'transparent',
                            border: '1px solid #333', padding: '2px', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <Box size={14} color={viewMode === 'HILBERT' ? '#000' : '#888'} />
                    </button>
                    <button
                        onClick={() => setViewMode('LINEAR')}
                        title="1D Linear Timeline"
                        style={{
                            background: viewMode === 'LINEAR' ? 'var(--accent-cyan)' : 'transparent',
                            border: '1px solid #333', padding: '2px', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <Activity size={14} color={viewMode === 'LINEAR' ? '#000' : '#888'} />
                    </button>
                </div>
            </div>

            {/* MAIN VIEWPORT */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                {viewMode === 'HILBERT' ? (
                    <DeckGL
                        initialViewState={{ target: [256, 256, 0], zoom: 0, minZoom: -2, maxZoom: 10 }}
                        controller={true}
                        layers={getHilbertLayers()}
                        getCursor={() => 'crosshair'}
                        style={{ background: '#000' }} // Ensure black background
                    />
                ) : (
                    <LinearView />
                )}
            </div>
        </div>
    );
};

export default Radar;