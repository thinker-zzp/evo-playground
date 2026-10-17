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
      for (let i = 0; i < 120; i++) {
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
