// Original SOP formulas, shifts and bounds. See docs/benchmarks.md.
class BenchmarkField extends Landscape {
  constructor(preset, seed = 42, dimension = 2) {
    super("peaks", seed);
    if (![2, 3, 10].includes(dimension))
      throw new Error("Supported D: 2, 3, 10");
    this.preset = preset;
    this.dimension = dimension;
    this.isBenchmark = true;
    this._peaks = [];
    this.tolerance = 1e-3;
    this.hasKnownOptimum = preset !== "sop5" || dimension === 2;
    this.bounds =
      preset === "sop5"
        ? [-30, 30]
        : preset === "sop8"
          ? [-500, 500]
          : preset === "sop9"
            ? [-5.12, 5.12]
            : [-32, 32];
    const upper = this.bounds[1];
    this.shift = Array.from(
      { length: dimension },
      (_, j) => (j * upper) / (dimension - 1),
    );
    this.fOpt = 0;
    this.optimum = null;
    if (preset === "sop5" && dimension === 2) {
      let lo = 0,
        hi = 1;
      for (let i = 0; i < 70; i++) {
        const x = (lo + hi) / 2;
        if (400 * x * x * x + 2 * x - 2 > 0) hi = x;
        else lo = x;
      }
      this.optimum = [(lo + hi) / 2, 30];
      this.fOpt = this.objectiveRaw(...this.optimum);
    } else if (preset === "sop8") {
      const minima = this.shift.map((offset) =>
        BenchmarkField.schwefelMinimum(this.bounds[0] - offset, upper - offset),
      );
      this.optimum = minima.map((p, j) => p.x + this.shift[j]);
      this.fOpt = minima.reduce((sum, p) => sum + p.value, 0);
    } else if (preset !== "sop5") this.optimum = [...this.shift];
    // F5 D>2: zero is a lower bound, not an asserted feasible optimum.
    // Show raw f, rank candidates, and never declare an optimality victory.
    this.axes = [0, 1];
    this.anchor = Array(dimension).fill(0.5);
    this.invalidate();
  }
  coordinates(...position) {
    return position.map(
      (v) => this.bounds[0] + v * (this.bounds[1] - this.bounds[0]),
    );
  }
  normalizedOptimum() {
    return this.optimum?.map(
      (v) => (v - this.bounds[0]) / (this.bounds[1] - this.bounds[0]),
    );
  }
  sliceVector(x, y) {
    const p = [...this.anchor];
    p[this.axes[0]] = x;
    p[this.axes[1]] = y;
    return p;
  }
  setView(axes, anchor = this.anchor) {
    if (
      axes[0] === axes[1] ||
      axes.some((j) => j < 0 || j >= this.dimension) ||
      anchor.length !== this.dimension
    )
      throw new Error("Invalid slice");
    this.axes = [...axes];
    this.anchor = [...anchor];
    this.invalidate();
  }
  project(p) {
    return { x: p.position[this.axes[0]], y: p.position[this.axes[1]] };
  }
  static schwefelMinimum(lo, hi) {
    // Stationary points satisfy 2*sin(t)+t*cos(t)=0, t=sqrt(abs(x)).
    // Enumerate every bracket up to sqrt(max |bound|), plus endpoints and zero.
    const candidates = [lo, hi];
    if (lo <= 0 && hi >= 0) candidates.push(0);
    const derivative = (t) => 2 * Math.sin(t) + t * Math.cos(t);
    const limit = Math.sqrt(Math.max(Math.abs(lo), Math.abs(hi)));
    for (let left = 1e-8; left < limit; left += 0.05) {
      let a = left,
        b = Math.min(limit, left + 0.05);
      if (derivative(a) * derivative(b) > 0) continue;
      for (let i = 0; i < 55; i++) {
        const middle = (a + b) / 2;
        if (derivative(a) * derivative(middle) <= 0) b = middle;
        else a = middle;
      }
      const square = ((a + b) / 2) ** 2;
      for (const x of [square, -square])
        if (x >= lo && x <= hi) candidates.push(x);
    }
    return candidates
      .map((x) => ({ x, value: -x * Math.sin(Math.sqrt(Math.abs(x))) }))
      .sort((a, b) => a.value - b.value)[0];
  }
  objectiveRaw(...position) {
    if (position.length !== this.dimension)
      throw new Error("Objective requires all D coordinates");
    const z = position.map((v, j) => v - this.shift[j]);
    if (this.preset === "sop5")
      return z
        .slice(0, -1)
        .reduce(
          (sum, v, j) => sum + 100 * (z[j + 1] - v * v) ** 2 + (v - 1) ** 2,
          0,
        );
    if (this.preset === "sop8")
      return z.reduce(
        (sum, v) => sum - v * Math.sin(Math.sqrt(Math.abs(v))),
        0,
      );
    if (this.preset === "sop9")
      return z.reduce(
        (sum, v) => sum + v * v - 10 * Math.cos(2 * Math.PI * v) + 10,
        0,
      );
    if (this.preset === "sop10")
      return (
        -20 *
          Math.exp(
            -0.2 * Math.sqrt(z.reduce((s, v) => s + v * v, 0) / this.dimension),
          ) -
        Math.exp(
          z.reduce((s, v) => s + Math.cos(2 * Math.PI * v), 0) / this.dimension,
        ) +
        20 +
        Math.E
      );
    throw new Error("Unknown benchmark");
  }
  value(position) {
    return this.objectiveRaw(...this.coordinates(...position));
  }
  errorVector(position) {
    return Math.max(0, this.value(position) - this.fOpt);
  }
  fitness(position) {
    return 1 / (1 + this.errorVector(position));
  }
  // x/y APIs are explicitly the displayed slice. Algorithms use value/fitness.
  objective(x, y) {
    return this.value(this.sliceVector(x, y));
  }
  error(x, y) {
    return this.errorVector(this.sliceVector(x, y));
  }
  normalised(x, y) {
    return this.fitness(this.sliceVector(x, y));
  }
  evaluate(x, y) {
    return -this.objective(x, y);
  }
  _ensureRange() {
    if (this._minVal !== null) return;
    let max = -Infinity,
      min = Infinity;
    for (let y = 0; y <= 120; y++)
      for (let x = 0; x <= 120; x++) {
        const value = this.objective(x / 120, y / 120);
        max = Math.max(max, value);
        min = Math.min(min, value);
      }
    this._sliceMin = min;
    this._displayLogMax = Math.log1p(max - min) || 1;
    this._minVal = -max;
    this._maxVal = -min;
  }
  displayHeight(x, y) {
    this._ensureRange();
    return clamp(
      1 -
        Math.log1p(Math.max(0, this.objective(x, y) - this._sliceMin)) /
          this._displayLogMax,
      0,
      1,
    );
  }
  get optimumPos() {
    const p = this.normalizedOptimum();
    return p ? { x: p[this.axes[0]], y: p[this.axes[1]] } : null;
  }
  movePeak() {
    throw new Error("Benchmark formulas cannot be edited.");
  }
}
