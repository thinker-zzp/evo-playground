// Landscape presets and cached, high-DPI cartography. Coordinates are [0,1]².
class Landscape {
  constructor(preset = "peaks", seed = 42) {
    this.preset = preset;
    this.seed = seed;
    const rng = seededRandom(seed);
    const presets = {
      peaks: [
        [0.73, 0.33, 1.28, 0.115],
        [0.24, 0.36, 0.8, 0.15],
        [0.45, 0.77, 0.74, 0.13],
        [0.82, 0.79, 0.67, 0.1],
        [0.15, 0.82, 0.57, 0.09],
        [0.49, 0.16, 0.61, 0.105],
      ],
      islands: [
        [0.78, 0.24, 1.3, 0.066],
        [0.23, 0.31, 0.91, 0.085],
        [0.48, 0.73, 0.81, 0.075],
        [0.82, 0.77, 0.7, 0.06],
        [0.16, 0.82, 0.53, 0.07],
      ],
      needle: [
        [0.68, 0.29, 1.35, 0.038],
        [0.29, 0.57, 0.93, 0.18],
        [0.78, 0.77, 0.65, 0.13],
        [0.26, 0.19, 0.59, 0.1],
      ],
    };
    this._peaks = presets[preset].map(([cx, cy, h, w], i) => ({
      cx: clamp(cx + (rng() - 0.5) * 0.15, 0.09, 0.91),
      cy: clamp(cy + (rng() - 0.5) * 0.15, 0.09, 0.91),
      h,
      w: w * (0.9 + rng() * 0.2),
      name:
        i === 0
          ? "主峰"
          : ["", "回声山", "青石岭", "风眠坡", "苔原", "小鹿丘"][i],
    }));
    this.invalidate();
  }
  invalidate() {
    this._minVal = null;
    this._background = null;
  }
  movePeak(x, y) {
    this._peaks[0].cx = clamp(x, 0.07, 0.93);
    this._peaks[0].cy = clamp(y, 0.07, 0.93);
    this.invalidate();
  }
  evaluate(x, y) {
    let value = 0;
    for (const p of this._peaks)
      value +=
        p.h * Math.exp(-((x - p.cx) ** 2 + (y - p.cy) ** 2) / (2 * p.w * p.w));
    return value;
  }
  normalised(x, y) {
    this._ensureRange();
    return (this.evaluate(x, y) - this._minVal) / (this._maxVal - this._minVal);
  }
  _ensureRange() {
    if (this._minVal !== null) return;
    let mn = Infinity,
      mx = -Infinity;
    const n = 240;
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const x = i / (n - 1),
          y = j / (n - 1),
          v = this.evaluate(x, y);
        mn = Math.min(mn, v);
        if (v > mx) {
          mx = v;
          this._optimumPos = { x, y };
        }
      }
    this._minVal = mn;
    this._maxVal = mx;
  }
  get optimumPos() {
    this._ensureRange();
    return { ...this._optimumPos };
  }
  getBackground(width, height, dpr = 1) {
    const key = `${width}:${height}:${dpr}`;
    if (this._background?.key === key) return this._background.canvas;
    this._ensureRange();
    const out = document.createElement("canvas");
    out.width = Math.round(width * dpr);
    out.height = Math.round(height * dpr);
    const context = out.getContext("2d");
    // Sample the scalar field once. Bilinear raster interpolation and vector
    // isolines keep the map smooth without evaluating Gaussians per screen pixel.
    const nx = 180,
      ny = Math.max(80, Math.round((nx * height) / width));
    const values = new Float32Array((nx + 1) * (ny + 1));
    for (let y = 0; y <= ny; y++)
      for (let x = 0; x <= nx; x++)
        values[y * (nx + 1) + x] = this.normalised(x / nx, y / ny);
    const stops = [
      [0, 211, 231, 223],
      [0.18, 224, 235, 217],
      [0.42, 204, 221, 175],
      [0.65, 185, 207, 143],
      [0.84, 221, 218, 159],
      [1, 247, 232, 191],
    ];
    const palette = Array.from({ length: 1024 }, (_, i) => {
      const t = i / 1023;
      let k = 0;
      while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
      const a = stops[k],
        b = stops[k + 1],
        f = (t - a[0]) / (b[0] - a[0]);
      return [1, 2, 3].map((channel) =>
        Math.round(a[channel] + (b[channel] - a[channel]) * f),
      );
    });
    const image = context.createImageData(out.width, out.height),
      data = image.data;
    for (let py = 0; py < out.height; py++) {
      const gy = (py / (out.height - 1)) * ny,
        y0 = Math.min(ny - 1, Math.floor(gy)),
        fy = gy - y0;
      for (let px = 0; px < out.width; px++) {
        const gx = (px / (out.width - 1)) * nx,
          x0 = Math.min(nx - 1, Math.floor(gx)),
          fx = gx - x0;
        const i = y0 * (nx + 1) + x0;
        const t =
          (values[i] * (1 - fx) + values[i + 1] * fx) * (1 - fy) +
          (values[i + nx + 1] * (1 - fx) + values[i + nx + 2] * fx) * fy;
        const rgb = palette[clamp(Math.round(t * 1023), 0, 1023)],
          p = (py * out.width + px) * 4;
        data[p] = rgb[0];
        data[p + 1] = rgb[1];
        data[p + 2] = rgb[2];
        data[p + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Marching triangles: interpolate crossings instead of drawing pixel bands.
    for (let level = 0.07; level < 1; level += 0.065) {
      context.beginPath();
      for (let y = 0; y < ny; y++)
        for (let x = 0; x < nx; x++) {
          const i = y * (nx + 1) + x;
          const points = [
            [(x / nx) * width, (y / ny) * height, values[i]],
            [((x + 1) / nx) * width, (y / ny) * height, values[i + 1]],
            [
              ((x + 1) / nx) * width,
              ((y + 1) / ny) * height,
              values[i + nx + 2],
            ],
            [(x / nx) * width, ((y + 1) / ny) * height, values[i + nx + 1]],
          ];
          for (const triangle of [
            [points[0], points[1], points[2]],
            [points[0], points[2], points[3]],
          ]) {
            const crossings = [];
            for (let edge = 0; edge < 3; edge++) {
              const a = triangle[edge],
                b = triangle[(edge + 1) % 3];
              if (a[2] < level !== b[2] < level) {
                const f = (level - a[2]) / (b[2] - a[2]);
                crossings.push([
                  a[0] + (b[0] - a[0]) * f,
                  a[1] + (b[1] - a[1]) * f,
                ]);
              }
            }
            if (crossings.length === 2) {
              context.moveTo(...crossings[0]);
              context.lineTo(...crossings[1]);
            }
          }
        }
      context.strokeStyle = level > 0.85 ? "#827e4840" : "#527c5735";
      context.lineWidth = 0.65;
      context.stroke();
    }
    // Quiet survey grid and location names are part of the cartographic layer.
    context.fillStyle = "#4d75521c";
    for (let y = 24; y < height; y += 24)
      for (let x = 24; x < width; x += 24) {
        context.beginPath();
        context.arc(x, y, 0.6, 0, Math.PI * 2);
        context.fill();
      }
    context.font = '9px "Segoe UI", "Microsoft YaHei", sans-serif';
    context.textAlign = "center";
    context.fillStyle = "#506b4e73";
    this._peaks
      .slice(1)
      .forEach((p) =>
        context.fillText(
          p.name,
          p.cx * width,
          clamp(p.cy * height + 26, 22, height - 38),
        ),
      );
    context.strokeStyle = "#59795830";
    context.lineWidth = 1;
    [
      [17, 17],
      [width - 17, 17],
      [17, height - 17],
      [width - 17, height - 17],
    ].forEach(([x, y]) => {
      context.beginPath();
      context.moveTo(x - 4, y);
      context.lineTo(x + 4, y);
      context.moveTo(x, y - 4);
      context.lineTo(x, y + 4);
      context.stroke();
    });
    this._background = { key, canvas: out };
    return out;
  }
}
