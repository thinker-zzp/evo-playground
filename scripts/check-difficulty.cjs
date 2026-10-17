// Finite browser-protocol check, not an equal-FE algorithm comparison.
// Run from anywhere: node scripts/check-difficulty.cjs
const fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path");
const c = vm.createContext({ console });
for (const file of ["utils", "landscape", "benchmarks", "ga", "pso", "de"])
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "../js", file + ".js"), "utf8"),
    c,
  );
const dimension = Number(process.argv[2] || 10);
if (![2, 3, 10].includes(dimension))
  throw new Error("Use dimension 2, 3 or 10");
c.dimension = dimension;
const result = vm.runInContext(
  `(()=>{
 const rows=[];
 for(const preset of ['sop5','sop8','sop9','sop10']) {
  const successes=[0,0,0],runs=[];
  for(let seed=42;seed<62;seed++) {
   const field=new BenchmarkField(preset,seed,dimension),random=seededRandom(seed^0xa1b2c3d4);
   const initialPositions=Array.from({length:36},()=>searchPoint(Array.from({length:dimension},random)));
   const errors=[GeneticAlgorithm,ParticleSwarm,DifferentialEvolution].map((Type,i)=>{
    const a=new Type(field,{popSize:36,initialPositions,random:seededRandom(seed^(0x9e3779b9*(i+1))),mutRate:.12,w:.729,F:.8});
    for(let generation=1;generation<=100;generation++)a.step();
    const error=field.errorVector(a.best.position);if(field.hasKnownOptimum&&error<=.001)successes[i]++;return error;
   });
   runs.push({seed,errors});
  }
  rows.push({preset,dimension,score: preset==='sop5'&&dimension>2?'raw f':'gap f-fOpt',population:36,generations:100,threshold:preset==='sop5'&&dimension>2?null:.001,algorithms:['GA','PSO','DE'],successes:preset==='sop5'&&dimension>2?null:successes,runs});
 }
 return rows;
})()`,
  c,
);
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
