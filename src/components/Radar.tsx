import React from 'react';
import DeckGL from '@deck.gl/react';
import { BitmapLayer, ScatterplotLayer } from '@deck.gl/layers';
import { HilbertCurve } from '../utils/hilbert';

interface RadarProps {
    matrix: Uint8Array;
    highlightOffset: number | null; // Hover (Reticle)
    selectionRange: { start: number, end: number } | null; // Selection (Highlight)
    hilbert: HilbertCurve;
    onJump: (offset: number) => void;
}

const Radar: React.FC<RadarProps> = ({ matrix, highlightOffset, selectionRange, hilbert, onJump }) => {
    const width = 512;
    const height = 512;

    const layers: any[] = [
        // 1. The Heatmap
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

    // 2. Selection Highlight (New!)
    if (selectionRange) {
        // We map a few points from the range to visualize it
        // (Optimized: Just showing start point for now, could be expanded to full path)
        const [x, y] = hilbert.offsetToXY(selectionRange.start);
        layers.push(
            new ScatterplotLayer({
                id: 'selection',
                data: [{ position: [x + 0.5, y + 0.5] }],
                getPosition: (d: any) => d.position,
                getFillColor: [0, 240, 255, 100], // Cyan Glow
                getLineColor: [0, 240, 255, 255],
                stroked: true,
                radiusScale: 1,
                radiusMinPixels: 4,
                getRadius: 15
            })
        );
    }

    // 3. Hover Reticle (Existing)
    if (highlightOffset !== null) {
        const [x, y] = hilbert.offsetToXY(highlightOffset);
        layers.push(
            new ScatterplotLayer({
                id: 'reticle',
                data: [{ position: [x + 0.5, y + 0.5] }],
                getPosition: (d: any) => d.position,
                getFillColor: [0, 0, 0, 0],
                getLineColor: [255, 255, 255, 200], // White crosshair
                stroked: true,
                radiusMinPixels: 2,
                getRadius: 5
            })
        );
    }

    return (
        <div style={{ width: '100%', height: '100%', background: '#000' }}>
            <DeckGL
                initialViewState={{ target: [width / 2, height / 2, 0], zoom: 0, minZoom: -2, maxZoom: 10 }}
                controller={true}
                layers={layers}
                getCursor={() => 'crosshair'}
            />
        </div>
    );
};

export default Radar;