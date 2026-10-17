const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path");
const c = vm.createContext({ console });
for (const file of ["utils", "landscape", "benchmarks", "ga", "pso", "de"])
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "../js", file + ".js"), "utf8"),
    c,
  );
const {
  BenchmarkField,
  GeneticAlgorithm,
  ParticleSwarm,
  DifferentialEvolution,
  seededRandom,
} = vm.runInContext(
  "({BenchmarkField,GeneticAlgorithm,ParticleSwarm,DifferentialEvolution,seededRandom})",
  c,
);
const fixtures = require("./sop-reference.json");
for (const fixture of fixtures) {
  test(`${fixture.preset} matches original torch cal_obj reference and constrained optimum`, () => {
    const field = new BenchmarkField(fixture.preset, 42),
      [lo, hi] = field.bounds;
    fixture.points.forEach((point, i) => {
      const actual = field.objective(
        (point.xy[0] - lo) / (hi - lo),
        (point.xy[1] - lo) / (hi - lo),
      );
      assert.ok(
        Math.abs(actual - fixture.referenceValues[i]) <
          1e-9 + Math.abs(actual) * 1e-13,
      );
    });
    const opt = field.optimumPos;
    assert.ok(opt.x >= 0 && opt.x <= 1 && opt.y >= 0 && opt.y <= 1);
    assert.ok(field.error(opt.x, opt.y) < 1e-9);
    assert.ok(Math.abs(field.fOpt - fixture.fOpt) < 1e-9);
    assert.throws(() => field.movePeak(0.3, 0.3));
  });
  test(`${fixture.preset} has fixed formula across seeds and preserves search invariants`, () => {
    const field = new BenchmarkField(fixture.preset, 42),
      other = new BenchmarkField(fixture.preset, 43);
    assert.equal(field.objective(0.123, 0.678), other.objective(0.123, 0.678));
    let minimum = Infinity;
    for (let y = 0; y <= 100; y++)
      for (let x = 0; x <= 100; x++)
        minimum = Math.min(minimum, field.objective(x / 100, y / 100));
    assert.ok(minimum >= field.fOpt - 1e-8);
    for (const Type of [
      GeneticAlgorithm,
      ParticleSwarm,
      DifferentialEvolution,
    ]) {
      const a = new Type(field, { popSize: 12, random: seededRandom(42) });
      let best = a.best.f;
      for (let i = 0; i < 100; i++) {
        a.step();
        assert.ok(a.best.f >= best);
        best = a.best.f;
        for (const p of a.population)
          assert.ok(
            Number.isFinite(p.f) &&
              p.x >= 0 &&
              p.x <= 1 &&
              p.y >= 0 &&
              p.y <= 1,
          );
      }
    }
  });
}

for (const row of require("./sop-high-d-reference.json")) {
  test(`${row.preset} D=${row.dimension} matches original Python float64 cal_obj`, () => {
    const field = new BenchmarkField(row.preset, 42, row.dimension);
    row.positions.forEach((p, i) => {
      const actual = field.objectiveRaw(...p);
      assert.ok(
        Math.abs(actual - row.values[i]) < 1e-8 + Math.abs(actual) * 1e-12,
        `${i}: ${actual} vs ${row.values[i]}`,
      );
    });
  });
}
test("full D=3/10 searches copy shared starts and preserve all-coordinate invariants for 100 generations", () => {
  for (const d of [3, 10])
    for (const preset of ["sop5", "sop8", "sop9", "sop10"]) {
      const field = new BenchmarkField(preset, 42, d),
        random = seededRandom(123);
      const starts = Array.from({ length: 12 }, () =>
        Array.from({ length: d }, random),
      );
      for (const Type of [
        GeneticAlgorithm,
        ParticleSwarm,
        DifferentialEvolution,
      ]) {
        const a = new Type(field, {
          popSize: 12,
          initialPositions: starts,
          random: seededRandom(42),
        });
        assert.equal(
          JSON.stringify(a.population.map((p) => p.position)),
          JSON.stringify(starts),
        );
        let best = a.best.f;
        for (let generation = 0; generation < 100; generation++) {
          a.step();
          assert.ok(a.best.f >= best);
          best = a.best.f;
          for (const p of a.population) {
            assert.equal(p.position.length, d);
            assert.ok(
              p.position.every((v) => Number.isFinite(v) && v >= 0 && v <= 1),
            );
            assert.equal(p.f, field.fitness(p.position));
            assert.ok(p.trail.every((v) => v.position.length === d));
          }
        }
        assert.equal(a.history.length, 101);
        assert.ok(
          a.population.some((p) =>
            p.position.some((v, j) => j > 1 && v !== starts[0][j]),
          ),
        );
      }
    }
});
test("nonvisible coordinates affect full fitness while slicing cannot change a candidate score", () => {
  for (const preset of ["sop5", "sop8", "sop9", "sop10"]) {
    const f = new BenchmarkField(preset, 42, 10),
      a = Array(10).fill(0.5),
      b = [...a];
    b[9] = 0.91;
    assert.notEqual(f.value(a), f.value(b));
    const score = f.fitness(b);
    f.setView([8, 9], Array(10).fill(0.2));
    assert.equal(f.fitness(b), score);
    assert.equal(
      f.objective(0.91, 0.7),
      f.value([0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.91, 0.7]),
    );
  }
});
test("known high-dimensional optima are feasible and F5 does not invent one", () => {
  for (const d of [3, 10])
    for (const preset of ["sop8", "sop9", "sop10"]) {
      const f = new BenchmarkField(preset, 42, d),
        p = f.normalizedOptimum();
      assert.ok(p.every((v) => v >= 0 && v <= 1));
      assert.ok(f.errorVector(p) < 1e-9);
      const random = seededRandom(777);
      for (let i = 0; i < 1000; i++)
        assert.ok(f.value(Array.from({ length: d }, random)) >= f.fOpt - 1e-9);
    }
  const f = new BenchmarkField("sop5", 42, 10);
  assert.equal(f.hasKnownOptimum, false);
  assert.equal(f.optimum, null);
  assert.equal(f.optimumPos, null);
});
