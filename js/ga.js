// Real-valued GA: tournament selection, BLX-alpha, per-coordinate mutation.
class GeneticAlgorithm {
  constructor(landscape, cfg = {}) {
    this.landscape = landscape;
    this.cfg = cfg;
    this.random = cfg.random ?? Math.random;
    this.popSize = cfg.popSize ?? 30;
    this.mutRate = cfg.mutRate ?? 0.1;
    this.crossRate = cfg.crossRate ?? 0.8;
    this.reset();
  }
  reset() {
    this.generation = 0;
    this.best = null;
    this.history = [];
    this.population = Array.from({ length: this.popSize }, (_, i) =>
      this._makeInd(startingVector(this.landscape, this.cfg, i, this.random)),
    );
    this._updateBest();
  }
  _makeInd(position) {
    return searchPoint(position, {
      f: vectorFitness(this.landscape, position),
      trail: [searchPoint(position)],
    });
  }
  _updateBest() {
    for (const p of this.population)
      if (!this.best || p.f > this.best.f)
        this.best = searchPoint(p.position, { f: p.f });
    this.history.push(this.best.f);
    if (this.history.length > 500) this.history.shift();
  }
  _tournament() {
    let best = null;
    for (let i = 0; i < 3; i++) {
      const p = this.population[Math.floor(this.random() * this.popSize)];
      if (!best || p.f > best.f) best = p;
    }
    return best;
  }
  step() {
    const next = [this._makeInd(this.best.position)];
    while (next.length < this.popSize) {
      const a = this._tournament(),
        b = this._tournament(),
        cross = this.random() < this.crossRate;
      const position = a.position.map((v, j) => {
        if (cross) {
          const lo = Math.min(v, b.position[j]),
            span = Math.abs(v - b.position[j]);
          v = clamp(lo - 0.5 * span + this.random() * span * 2, 0, 1);
        }
        if (this.random() < this.mutRate)
          v = clamp(v + gaussRand(this.random) * 0.08, 0, 1);
        return v;
      });
      const child = this._makeInd(position);
      const distance = (p) =>
        position.reduce((sum, v, j) => sum + (v - p.position[j]) ** 2, 0);
      const parent = distance(a) < distance(b) ? a : b;
      child.trail = [...parent.trail, searchPoint(position)].slice(-7);
      next.push(child);
    }
    this.population = next;
    this.generation++;
    this._updateBest();
  }
}
