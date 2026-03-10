/**
 * Utility for Hilbert Curve calculations.
 * Used to map 1D file offsets to 2D coordinates for the Radar view.
 * Must run in the UI thread for 60fps sync.
 */
export class HilbertCurve {
    size;
    order;
    constructor(order = 9) {
        this.order = order;
        this.size = 1 << order;
    }
    /**
     * Converts a 1D offset to 2D [x, y] coordinates.
     * @param offset The index along the curve.
     * @returns [x, y] coordinates.
     */
    offsetToXY(offset) {
        let x = 0;
        let y = 0;
        let s = 1;
        let t = offset;
        while (s < this.size) {
            let rx = 1 & (t / 2);
            let ry = 1 & (t ^ rx);
            [x, y] = this.rotate(s, x, y, rx, ry);
            x += s * rx;
            y += s * ry;
            t /= 4;
            s *= 2;
        }
        return [x, y];
    }
    /**
     * Converts 2D [x, y] coordinates to a 1D offset.
     * @param x The x coordinate.
     * @param y The y coordinate.
     * @returns The offset along the curve.
     */
    xyToOffset(x, y) {
        let rx, ry;
        let s = this.size / 2;
        let d = 0;
        while (s > 0) {
            rx = (x & s) > 0 ? 1 : 0;
            ry = (y & s) > 0 ? 1 : 0;
            d += s * s * ((3 * rx) ^ ry);
            [x, y] = this.rotate(s, x, y, rx, ry);
            s /= 2;
        }
        return d;
    }
    rotate(n, x, y, rx, ry) {
        if (ry === 0) {
            if (rx === 1) {
                x = n - 1 - x;
                y = n - 1 - y;
            }
            return [y, x];
        }
        return [x, y];
    }
}
//# sourceMappingURL=hilbert.js.map