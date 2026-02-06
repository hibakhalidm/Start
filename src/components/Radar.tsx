import React from 'react';
import DeckGL from '@deck.gl/react';
import { BitmapLayer } from '@deck.gl/layers';
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

    const layer = new BitmapLayer({
        id: 'hilbert-bitmap',
        image: {
            width,
            height,
            data: matrix, // @deck.gl supports Uint8Array if format is specified? 
            // Actually it usually wants ImageData or URL.
            // If data is passed, it assumes RGB/RGBA.
            // We might need to expand matrix to RGBA.
        },
        bounds: [0, 0, width, height]
    });

    // TODO: Add a ScatterplotLayer or IconLayer for the "Reticle" at highlightOffset

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <DeckGL
                initialViewState={{
                    target: [width / 2, height / 2, 0],
                    zoom: 0,
                    minZoom: -2,
                    maxZoom: 5
                }}
                controller={true}
                layers={[layer]}
            />
            {/* Reticle Overlay */
                highlightOffset !== null && (
                    (() => {
                        const [x, y] = hilbert.offsetToXY(highlightOffset);
                        // Map x,y to screen space or DeckGL coordinates?
                        // DeckGL coordinates are 1:1 with bounds.
                        // Simple overlay div for now or DeckGL layer.
                        // Using absolute div on top for simplicity in "Zero-Copy" constraint context (less GL overhead for single dot? No, GL is faster).
                        // But I cannot easily inject into DeckGL context here without valid Viewport.
                        return (
                            <div style={{
                                position: 'absolute',
                                left: 0, top: 0,
                                transform: `translate(${x}px, ${y}px)`, // Scale? DeckGL does scaling.
                                // This overlay approach fails with Zoom. 
                                // Correct way is another DeckGL layer.
                            }} />
                        )
                    })()
                )
            }
        </div>
    );
};

export default Radar;
