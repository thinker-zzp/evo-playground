// Exact D=2 objective formulas and bounds from NeuroEA Simple_SOPs.
// Formula sources and instance-generation boundaries: docs/benchmarks.md.
class BenchmarkField extends Landscape {
  constructor(preset, seed = 42) {
    super("peaks", seed);
    this.preset = preset;
    this.isBenchmark = true;
    this._peaks = [];
    this.tolerance = 1e-3;
    this.bounds =
      preset === "sop5"
        ? [-30, 30]
        : preset === "sop8"
          ? [-500, 500]
          : preset === "sop9"
            ? [-5.12, 5.12]
            : [-32, 32];
    this.fOpt = 0;
    if (preset === "sop5") {
      // The shifted unconstrained (1,31) is outside [-30,30]^2.
      // At the constrained optimum y=30; 400*x^3 + 2*x - 2 = 0.
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
      const a = BenchmarkField.schwefelMinimum(-500, 500);
      const b = BenchmarkField.schwefelMinimum(-1000, 0);
      this.optimum = [a.x, b.x + 500];
      this.fOpt = a.value + b.value;
    } else this.optimum = preset === "sop9" ? [0, 5.12] : [0, 32];
    this.invalidate();
  }
  coordinates(x, y) {
    const [lo, hi] = this.bounds;
    return [lo + x * (hi - lo), lo + y * (hi - lo)];
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
  objectiveRaw(a, b) {
    if (this.preset === "sop9") {
      const x = a,
        y = b - 5.12;
      return (
        x * x +
        y * y +
        20 -
        10 * Math.cos(2 * Math.PI * x) -
        10 * Math.cos(2 * Math.PI * y)
      );
    }
    if (this.preset === "sop10") {
      const x = a,
        y = b - 32;
      return (
        -20 * Math.exp(-0.2 * Math.sqrt((x * x + y * y) / 2)) -
        Math.exp((Math.cos(2 * Math.PI * x) + Math.cos(2 * Math.PI * y)) / 2) +
        20 +
        Math.E
      );
    }
    if (this.preset === "sop5") {
      const x = a,
        y = b - 30;
      return 100 * (y - x * x) ** 2 + (x - 1) ** 2;
    }
    if (this.preset === "sop8") {
      const x = a,
        y = b - 500;
      return (
        -x * Math.sin(Math.sqrt(Math.abs(x))) -
        y * Math.sin(Math.sqrt(Math.abs(y)))
      );
    }
    throw new Error("Unknown benchmark: " + this.preset);
  }
  objective(x, y) {
    return this.objectiveRaw(...this.coordinates(x, y));
  }
  error(x, y) {
    return Math.max(0, this.objective(x, y) - this.fOpt);
  }
  // Monotone fitness for existing maximizers; no grid-based success threshold.
  normalised(x, y) {
    return 1 / (1 + this.error(x, y));
  }
  evaluate(x, y) {
    return -this.objective(x, y);
  }
  _ensureRange() {
    if (this._minVal !== null) return;
    let max = 0;
    for (let j = 0; j <= 160; j++)
      for (let i = 0; i <= 160; i++)
        max = Math.max(max, this.error(i / 160, j / 160));
    this._displayLogMax = Math.log1p(max);
    this._minVal = -max;
    this._maxVal = 0;
  }
  // Only the map uses log compression; algorithm ordering uses the exact objective.
  displayHeight(x, y) {
    this._ensureRange();
    return clamp(1 - Math.log1p(this.error(x, y)) / this._displayLogMax, 0, 1);
  }
  get optimumPos() {
    const [lo, hi] = this.bounds;
    return {
      x: (this.optimum[0] - lo) / (hi - lo),
      y: (this.optimum[1] - lo) / (hi - lo),
    };
  }
  movePeak() {
    throw new Error("Benchmark formulas cannot be edited.");
  }
}
