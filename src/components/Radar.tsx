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

    // 2. Selection Highlight (Improved)
    if (selectionRange) {
        // Calculate points for Start and End to draw a line or region
        const startXY = hilbert.offsetToXY(selectionRange.start);
        const endXY = hilbert.offsetToXY(selectionRange.end);

        layers.push(
            new ScatterplotLayer({
                id: 'selection-start',
                data: [{ position: [startXY[0] + 0.5, startXY[1] + 0.5] }],
                getPosition: (d: any) => d.position,
                getFillColor: [0, 240, 255, 255], // Solid Cyan
                getRadius: 4
            }),
            new ScatterplotLayer({
                id: 'selection-end',
                data: [{ position: [endXY[0] + 0.5, endXY[1] + 0.5] }],
                getPosition: (d: any) => d.position,
                getFillColor: [255, 40, 40, 255], // Red for End
                getRadius: 4
            })
            // Ideally, we would draw a PathLayer between these points, 
            // but Hilbert curves are discontinuous in 2D space, 
            // so just showing start/end is a good step 1.
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