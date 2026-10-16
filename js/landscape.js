// landscape.js — 2D Multi-modal fitness landscape

/**
 * Six Gaussian peaks in the search space [-5,5]^2, mapped to [0,1]^2.
 * The strongest Gaussian is centred at (2,1). Overlap shifts the summed maximum.
 */
class Landscape {
  constructor() {
    this._peaks = [
      { cx:  2.0, cy:  1.0, h: 1.00, w: 1.20 }, // global max
      { cx: -3.0, cy: -2.0, h: 0.85, w: 1.30 },
      { cx:  1.0, cy: -3.0, h: 0.72, w: 1.00 },
      { cx: -1.5, cy:  3.0, h: 0.78, w: 1.10 },
      { cx:  3.5, cy: -1.5, h: 0.65, w: 0.90 },
      { cx: -4.0, cy:  1.5, h: 0.55, w: 0.80 },
    ];
    this._minVal = null;
    this._maxVal = null;
    this._bgCache = {}; // key: size → offscreen canvas
  }

  /** Raw fitness value at (x, y) ∈ [0,1]^2 */
  evaluate(x, y) {
    const sx = x * 10 - 5;
    const sy = y * 10 - 5;
    let v = 0;
    for (const p of this._peaks) {
      const d2 = (sx - p.cx) ** 2 + (sy - p.cy) ** 2;
      v += p.h * Math.exp(-d2 / (2 * p.w * p.w));
    }
    return v;
  }

  /** Fitness normalised to [0,1] */
  normalised(x, y) {
    this._ensureRange();
    return (this.evaluate(x, y) - this._minVal) / (this._maxVal - this._minVal);
  }

  _ensureRange() {
    if (this._minVal !== null) return;
    const res = 200;
    let mn = Infinity, mx = -Infinity;
    for (let j = 0; j < res; j++) {
      for (let i = 0; i < res; i++) {
        const v = this.evaluate(i / (res - 1), j / (res - 1));
        if (v < mn) mn = v;
        if (v > mx) {
          mx = v;
          this._optimumPos = { x: i / (res - 1), y: j / (res - 1) };
        }
      }
    }
    this._minVal = mn;
    this._maxVal = mx;
  }

  /**
   * Return (and cache) an offscreen canvas with the landscape rendered at `size`×`size`.
   * Warm monochrome heatmap with contour bands — matches the homepage palette.
   */
  getBackground(size) {
    if (this._bgCache[size]) return this._bgCache[size];
    this._ensureRange();

    const oc  = document.createElement('canvas');
    oc.width  = size;
    oc.height = size;
    const ctx = oc.getContext('2d');
    const img = ctx.createImageData(size, size);
    const d   = img.data;
    const range    = this._maxVal - this._minVal;
    const nLevels  = 10;  // number of contour bands

    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const ax = i / (size - 1);
        const ay = j / (size - 1);
        const t  = (this.evaluate(ax, ay) - this._minVal) / range;

        // Contour line: fires near the lower boundary of each band
        const frac      = (t * nLevels) % 1;
        const isContour = frac < 0.06;

        let r, g, b;
        if (isContour) {
          // Warm mid-grey contour line, slightly darkened relative to area
          const k = Math.round(90 + t * 80);
          r = k + 5; g = k + 3; b = k;
        } else {
          // Dark charcoal (#3a3835) → warm paper (#f8f7f3)
          r = Math.round(58  + t * 190);
          g = Math.round(56  + t * 191);
          b = Math.round(53  + t * 190);
        }

        const idx = (j * size + i) * 4;
        d[idx]   = r;
        d[idx+1] = g;
        d[idx+2] = b;
        d[idx+3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
    this._bgCache[size] = oc;
    return oc;
  }

  /** Maximum sampled by the same 200×200 grid used for fitness scaling. */
  get optimumPos() {
    this._ensureRange();
    return { ...this._optimumPos };
  }
}
