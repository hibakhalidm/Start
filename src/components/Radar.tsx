import React from 'react';
import DeckGL from '@deck.gl/react';
import { BitmapLayer, ScatterplotLayer } from '@deck.gl/layers';
import { HilbertCurve } from '../utils/hilbert';

interface RadarProps {
    matrix: Uint8Array;
    highlightOffset: number | null;
    selectionRange: { start: number, end: number } | null;
    hilbert: HilbertCurve;
    onJump: (offset: number) => void;
}

const Radar: React.FC<RadarProps> = ({ matrix, highlightOffset, selectionRange, hilbert, onJump }) => {
    const width = 512;
    const height = 512;

    // Helper to get XY
    const getXY = (offset: number) => {
        const [x, y] = hilbert.offsetToXY(offset);
        return [x + 0.5, y + 0.5]; // Center in pixel
    };

    const layers: any[] = [
        // 1. Base Heatmap
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

    // 2. Selection Range (Start/End Markers)
    if (selectionRange) {
        layers.push(
            new ScatterplotLayer({
                id: 'selection-markers',
                data: [
                    { pos: getXY(selectionRange.start), color: [0, 240, 255, 255] }, // Cyan Start
                    { pos: getXY(selectionRange.end), color: [255, 40, 40, 255] }    // Red End
                ],
                getPosition: (d: any) => d.pos,
                getFillColor: (d: any) => d.color,
                getRadius: 5,
                radiusMinPixels: 3,
                updateTriggers: {
                    data: selectionRange // FORCE UPDATE
                }
            })
        );
    }

    // 3. The "Cyan Box" (Current Viewport Reticle)
    if (highlightOffset !== null) {
        layers.push(
            new ScatterplotLayer({
                id: 'reticle',
                data: [{ pos: getXY(highlightOffset) }],
                getPosition: (d: any) => d.pos,
                getFillColor: [0, 0, 0, 0],
                getLineColor: [0, 240, 255, 255],
                getLineWidth: 2,
                stroked: true,
                radiusScale: 1,
                radiusMinPixels: 10, // Make it VISIBLE
                radiusMaxPixels: 50,
                getRadius: 20,
                // Animation loop to create "Pulse" effect
                parameters: {
                    depthTest: false
                },
                updateTriggers: {
                    getPosition: highlightOffset // FORCE UPDATE
                }
            })
        );
    }

    return (
        <DeckGL
            initialViewState={{ target: [width / 2, height / 2, 0], zoom: 0, minZoom: -2, maxZoom: 10 }}
            controller={true}
            layers={layers}
            getCursor={() => 'crosshair'}
            style={{ background: '#000' }}
        />
    );
};

export default Radar;