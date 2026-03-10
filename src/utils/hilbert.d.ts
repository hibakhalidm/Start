/**
 * Utility for Hilbert Curve calculations.
 * Used to map 1D file offsets to 2D coordinates for the Radar view.
 * Must run in the UI thread for 60fps sync.
 */
export declare class HilbertCurve {
    private readonly size;
    private readonly order;
    constructor(order?: number);
    /**
     * Converts a 1D offset to 2D [x, y] coordinates.
     * @param offset The index along the curve.
     * @returns [x, y] coordinates.
     */
    offsetToXY(offset: number): [number, number];
    /**
     * Converts 2D [x, y] coordinates to a 1D offset.
     * @param x The x coordinate.
     * @param y The y coordinate.
     * @returns The offset along the curve.
     */
    xyToOffset(x: number, y: number): number;
    private rotate;
}
//# sourceMappingURL=hilbert.d.ts.map