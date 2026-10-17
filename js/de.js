// DE/rand/1/bin over all D coordinates; one mandatory mutant coordinate.
class DifferentialEvolution {
  constructor(landscape, cfg = {}) {
    this.landscape = landscape;
    this.cfg = cfg;
    this.random = cfg.random ?? Math.random;
    this.popSize = cfg.popSize ?? 30;
    this.F = cfg.F ?? 0.8;
    this.CR = cfg.CR ?? 0.9;
    if (this.popSize < 4)
      throw new Error("DE requires at least four individuals");
    this.reset();
  }
  reset() {
    this.generation = 0;
    this.best = null;
    this.history = [];
    this.population = Array.from({ length: this.popSize }, (_, i) => {
      const position = startingVector(this.landscape, this.cfg, i, this.random);
      return searchPoint(position, {
        f: vectorFitness(this.landscape, position),
        trail: [searchPoint(position)],
      });
    });
    this._updateBest();
  }
  _updateBest() {
    for (const p of this.population)
      if (!this.best || p.f > this.best.f)
        this.best = searchPoint(p.position, { f: p.f });
    this.history.push(this.best.f);
    if (this.history.length > 500) this.history.shift();
  }
  _pick(excluded, n) {
    let r;
    do {
      r = Math.floor(this.random() * n);
    } while (excluded.includes(r));
    return r;
  }
  step() {
    const n = this.popSize;
    this.population = this.population.map((p, i) => {
      const a = this._pick([i], n),
        b = this._pick([i, a], n),
        c = this._pick([i, a, b], n);
      const jRand = Math.floor(this.random() * p.position.length);
      const position = p.position.map((v, j) =>
        this.random() < this.CR || j === jRand
          ? clamp(
              this.population[a].position[j] +
                this.F *
                  (this.population[b].position[j] -
                    this.population[c].position[j]),
              0,
              1,
            )
          : v,
      );
      const f = vectorFitness(this.landscape, position);
      return f >= p.f
        ? searchPoint(position, {
            f,
            trail: [...p.trail, searchPoint(position)].slice(-7),
          })
        : p;
    });
    this.generation++;
    this._updateBest();
  }
}
