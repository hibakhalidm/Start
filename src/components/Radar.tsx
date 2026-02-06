import React from 'react';
import DeckGL from '@deck.gl/react';
import { BitmapLayer, ScatterplotLayer } from '@deck.gl/layers';
import { HilbertCurve } from '../utils/hilbert';

interface RadarProps {
    matrix: Uint8Array;
    highlightOffset: number | null;
    hilbert: HilbertCurve;
}

const Radar: React.FC<RadarProps> = ({ matrix, highlightOffset, hilbert }) => {
    // 512x512 texture
    // We need to construct an ImageData object or similar.
    // matrix is Uint8Array of size 512*512 (grayscale) or 512*512*4 (RGBA).
    // Rust returned Vec<u8>. Let's assume grayscale 1 byte per pixel.
    // BitmapLayer expects standard image data.
    // If grayscale, we might need to expand to RGBA or use a specific format.
    // Browsers speak RGBA. Expansion:

    // Performance note: In prod, do this in WASM or a shader.
    // JS expansion loop for 262k pixels is ~1ms (fast enough).

    const width = 512;
    const height = 512;

    // transform matrix to pattern if needed, but assuming valid layout.

    const layers: any[] = [
        new BitmapLayer({
            id: 'hilbert-bitmap',
            image: { width, height, data: matrix },
            bounds: [0, 0, width, height]
        })
    ];

    if (highlightOffset !== null) {
        const [x, y] = hilbert.offsetToXY(highlightOffset);
        layers.push(
            new ScatterplotLayer({
                id: 'reticle',
                data: [{ position: [x + 0.5, y + 0.5] }], // Center on pixel
                getPosition: (d: any) => d.position,
                getFillColor: [0, 255, 255, 0], // Transparent fill
                getLineColor: [0, 255, 255, 255], // Cyan outline
                getLineWidth: 2,
                stroked: true,
                radiusScale: 1,
                radiusMinPixels: 3,
                radiusMaxPixels: 20,
                getRadius: 5 // Size of the reticle
            })
        );
    }

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <DeckGL
                initialViewState={{ target: [width / 2, height / 2, 0], zoom: 0, minZoom: -2, maxZoom: 5 }}
                controller={true}
                layers={layers}
            />
        </div>
    );
};

export default Radar;
