import React from 'react';
import DeckGL from '@deck.gl/react';
import { BitmapLayer, ScatterplotLayer } from '@deck.gl/layers';
import { HilbertCurve } from '../utils/hilbert';

interface RadarProps {
    matrix: Uint8Array;
    highlightOffset: number | null;
    hilbert: HilbertCurve;
    onJump: (offset: number) => void; // NEW PROP
}

const Radar: React.FC<RadarProps> = ({ matrix, highlightOffset, hilbert, onJump }) => {
    const width = 512;
    const height = 512;

    const layers: any[] = [
        new BitmapLayer({
            id: 'hilbert-bitmap',
            image: { width, height, data: matrix },
            bounds: [0, 0, width, height],
            pickable: true, // ENABLE CLICKING
            onClick: (info) => {
                if (info.bitmapPixel) {
                    const [x, y] = info.bitmapPixel;
                    const offset = hilbert.xyToOffset(x, y);
                    onJump(offset);
                }
            }
        })
    ];

    // THE RETICLE (Now strictly tied to WebGL coordinates)
    if (highlightOffset !== null) {
        const [x, y] = hilbert.offsetToXY(highlightOffset);
        layers.push(
            new ScatterplotLayer({
                id: 'reticle',
                data: [{ position: [x + 0.5, y + 0.5] }],
                getPosition: (d: any) => d.position,
                getFillColor: [0, 0, 0, 0],
                getLineColor: [0, 240, 255, 255], // Neon Cyan
                getLineWidth: 2,
                stroked: true,
                radiusScale: 1,
                radiusMinPixels: 4,
                radiusMaxPixels: 30,
                getRadius: 10
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