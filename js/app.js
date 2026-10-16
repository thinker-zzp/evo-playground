// app.js — Main application controller

// ── Constants & colours ────────────────────────────────────────────────────
const COLOR = { ga: '#3d7bc8', pso: '#2a8f7f', de: '#b86c1e' };
const RED   = '#a14335';

const ALGO_DESC = {
  ga:  '<strong>Genetic Algorithm</strong> — tournament selection, BLX-α crossover, Gaussian mutation, elitism.',
  pso: '<strong>Particle Swarm Optimization</strong> — particles chase their personal best and the global best, guided by inertia.',
  de:  '<strong>Differential Evolution</strong> (DE/rand/1/bin) — creates trial vectors by adding a scaled difference of two random individuals.',
};

// ── State ──────────────────────────────────────────────────────────────────
const landscape = new Landscape();
let algoKey  = 'ga';
let algorithm = null;
let running   = false;
let rafId     = null;
let lastTime  = 0;
let speed     = 5; // steps per second

// ── DOM refs ───────────────────────────────────────────────────────────────
const canvas      = document.getElementById('canvas');
const ctx         = canvas.getContext('2d');
const chartCanvas = document.getElementById('chart');
const chartCtx    = chartCanvas.getContext('2d');
const canvasWrap  = document.getElementById('canvas-wrap');
const canvasIdle  = document.getElementById('canvas-idle');
const btnRun      = document.getElementById('btn-run');
const btnStep     = document.getElementById('btn-step');
const btnReset    = document.getElementById('btn-reset');

// ── Canvas resize ──────────────────────────────────────────────────────────
function resizeCanvas() {
  const r    = canvasWrap.getBoundingClientRect();
  const size = Math.max(100, Math.floor(Math.min(r.width, r.height)) - 4);
  if (size === canvas.width) return;
  canvas.width  = size;
  canvas.height = size;
  landscape._bgCache = {};   // invalidate cached background
  renderFrame();
}

new ResizeObserver(resizeCanvas).observe(canvasWrap);
window.addEventListener('load', () => setTimeout(resizeCanvas, 50));

// ── Algorithm factory ──────────────────────────────────────────────────────
function buildAlgorithm() {
  const popSize = +$('r-pop').value;
  switch (algoKey) {
    case 'ga':
      algorithm = new GeneticAlgorithm(landscape, {
        popSize,
        mutRate:   +$('r-mut').value,
        crossRate: +$('r-cross').value,
      });
      break;
    case 'pso':
      algorithm = new ParticleSwarm(landscape, {
        popSize,
        w:  +$('r-w').value,
        c1: +$('r-c1').value,
        c2: +$('r-c2').value,
      });
      break;
    case 'de':
      algorithm = new DifferentialEvolution(landscape, {
        popSize,
        F:  +$('r-F').value,
        CR: +$('r-CR').value,
      });
      break;
  }
}

// ── Render ─────────────────────────────────────────────────────────────────
function renderFrame() {
  const size = canvas.width;
  if (size <= 0) return;

  // 1. Draw pre-rendered landscape background
  ctx.drawImage(landscape.getBackground(size), 0, 0);

  if (!algorithm) return;

  const showTrails  = $('opt-trails').checked;
  const showPbest   = $('opt-pbest').checked;
  const showOptimum = $('opt-optimum').checked;
  const color       = COLOR[algoKey];

  // Helper: normalised [0,1] → canvas pixels
  const px = x => x * size;
  const py = y => y * size;

  ctx.save();

  // ── Trails ─────────────────────────────────────────────────────────────
  if (showTrails) {
    ctx.lineWidth   = 1;
    ctx.strokeStyle = color;
    for (const ind of algorithm.population) {
      if (!ind.trail || ind.trail.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(px(ind.trail[0].x), py(ind.trail[0].y));
      for (let t = 1; t < ind.trail.length; t++) {
        ctx.lineTo(px(ind.trail[t].x), py(ind.trail[t].y));
      }
      ctx.globalAlpha = 0.22;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ── PSO personal bests & velocity arrows ───────────────────────────────
  if (algoKey === 'pso') {
    if (showPbest) {
      for (const p of algorithm.particles) {
        ctx.beginPath();
        ctx.arc(px(p.pbx), py(p.pby), 3, 0, Math.PI * 2);
        ctx.fillStyle   = 'rgba(42,143,127,0.25)';
        ctx.strokeStyle = 'rgba(42,143,127,0.55)';
        ctx.lineWidth   = 0.8;
        ctx.fill();
        ctx.stroke();
      }
    }
    // Velocity arrows
    const SCALE = size * 3.5;
    ctx.lineWidth   = 1;
    ctx.strokeStyle = COLOR.pso;
    ctx.globalAlpha = 0.45;
    for (const p of algorithm.particles) {
      const fromX = px(p.x), fromY = py(p.y);
      const toX   = fromX + p.vx * SCALE;
      const toY   = fromY + p.vy * SCALE;
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ── Population dots ────────────────────────────────────────────────────
  ctx.fillStyle = color;
  for (const ind of algorithm.population) {
    ctx.beginPath();
    ctx.arc(px(ind.x), py(ind.y), 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Global best ────────────────────────────────────────────────────────
  if (algorithm.best) {
    const bx = px(algorithm.best.x);
    const by = py(algorithm.best.y);
    // Outer ring
    ctx.beginPath();
    ctx.arc(bx, by, 10, 0, Math.PI * 2);
    ctx.strokeStyle = RED;
    ctx.lineWidth   = 1.5;
    ctx.globalAlpha = 0.55;
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Filled dot
    ctx.beginPath();
    ctx.arc(bx, by, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = RED;
    ctx.fill();
  }

  // ── True global optimum marker ─────────────────────────────────────────
  if (showOptimum) {
    const opt = landscape.optimumPos;
    const ox  = px(opt.x), oy = py(opt.y);
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(ox, oy, 9, 0, Math.PI * 2);
    ctx.strokeStyle = RED;
    ctx.lineWidth   = 1;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.6;
    // Crosshair
    ctx.beginPath();
    ctx.moveTo(ox - 6, oy); ctx.lineTo(ox + 6, oy);
    ctx.moveTo(ox, oy - 6); ctx.lineTo(ox, oy + 6);
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  updateStats();
  drawChart();
}

// ── Stats ──────────────────────────────────────────────────────────────────
function updateStats() {
  if (!algorithm) return;
  $('s-gen').textContent  = algorithm.generation;
  $('s-best').textContent = algorithm.best ? algorithm.best.f.toFixed(4) : '—';
  $('s-algo').textContent = algoKey.toUpperCase();
}

// ── Convergence chart ──────────────────────────────────────────────────────
function drawChart() {
  if (!algorithm || algorithm.history.length < 2) return;
  const hist = algorithm.history;
  const W = chartCanvas.width, H = chartCanvas.height;

  chartCtx.clearRect(0, 0, W, H);

  // Background
  chartCtx.fillStyle = '#ede9e0';
  chartCtx.fillRect(0, 0, W, H);

  // Grid lines (4 horizontal)
  chartCtx.strokeStyle = '#d5d2c9';
  chartCtx.lineWidth   = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = Math.round(H - (i / 4) * H) + 0.5;
    chartCtx.beginPath();
    chartCtx.moveTo(0, y);
    chartCtx.lineTo(W, y);
    chartCtx.stroke();
  }

  // Convergence line
  chartCtx.beginPath();
  chartCtx.strokeStyle = RED;
  chartCtx.lineWidth   = 1.8;
  chartCtx.lineJoin    = 'round';
  for (let i = 0; i < hist.length; i++) {
    const x = (i / (hist.length - 1)) * W;
    const y = H - hist[i] * H * 0.92 - H * 0.04;
    if (i === 0) chartCtx.moveTo(x, y);
    else         chartCtx.lineTo(x, y);
  }
  chartCtx.stroke();

  // Dot at last value
  const lv = hist[hist.length - 1];
  chartCtx.beginPath();
  chartCtx.arc(W - 2, H - lv * H * 0.92 - H * 0.04, 2.5, 0, Math.PI * 2);
  chartCtx.fillStyle = RED;
  chartCtx.fill();

  // Axis labels
  chartCtx.fillStyle  = '#77796e';
  chartCtx.font       = '9px monospace';
  chartCtx.textAlign  = 'left';
  chartCtx.fillText('1.0', 3, 11);
  chartCtx.fillText('0.5', 3, H / 2 + 4);
  chartCtx.fillText('0.0', 3, H - 2);
}

// ── Animation loop ─────────────────────────────────────────────────────────
function loop(now) {
  if (!running) return;
  const msPerStep = 1000 / speed;
  const dt = now - lastTime;
  if (dt >= msPerStep) {
    // Advance by however many steps fit in elapsed time (cap at 5)
    const steps = Math.min(5, Math.floor(dt / msPerStep));
    for (let i = 0; i < steps; i++) algorithm.step();
    lastTime = now - (dt % msPerStep);
  }
  renderFrame();
  rafId = requestAnimationFrame(loop);
}

function startLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  lastTime = performance.now();
  rafId = requestAnimationFrame(loop);
}

// ── Run / Pause / Reset ────────────────────────────────────────────────────
function startRun() {
  if (!algorithm) buildAlgorithm();
  running = true;
  btnRun.textContent = '⏸ Pause';
  btnRun.classList.add('is-running');
  canvasIdle.classList.add('hidden');
  startLoop();
}

function stopRun() {
  running = false;
  btnRun.textContent = '▶ Run';
  btnRun.classList.remove('is-running');
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
}

function resetAll() {
  stopRun();
  buildAlgorithm();
  canvasIdle.classList.remove('hidden');
  renderFrame();
}

// ── UI bindings ────────────────────────────────────────────────────────────

// Algorithm tabs
document.querySelectorAll('.algo-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    if (running) stopRun();
    algoKey = btn.dataset.algo;
    document.querySelectorAll('.algo-tab').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    $('algo-desc').innerHTML = ALGO_DESC[algoKey];
    $('params-ga').classList.toggle('hidden',  algoKey !== 'ga');
    $('params-pso').classList.toggle('hidden', algoKey !== 'pso');
    $('params-de').classList.toggle('hidden',  algoKey !== 'de');
    // Update legend dot colour
    document.querySelector('.dot--particle').style.background = COLOR[algoKey];
    resetAll();
  });
});

// Sliders: [rangeId, displayId, formatter]
[
  ['r-pop',   'v-pop',   v => v],
  ['r-speed', 'v-speed', v => { speed = +v; return v; }],
  ['r-mut',   'v-mut',   v => (+v).toFixed(2)],
  ['r-cross', 'v-cross', v => (+v).toFixed(2)],
  ['r-w',     'v-w',     v => (+v).toFixed(2)],
  ['r-c1',    'v-c1',    v => (+v).toFixed(2)],
  ['r-c2',    'v-c2',    v => (+v).toFixed(2)],
  ['r-F',     'v-F',     v => (+v).toFixed(2)],
  ['r-CR',    'v-CR',    v => (+v).toFixed(2)],
].forEach(([rid, vid, fmt]) => {
  const el = document.getElementById(rid);
  if (!el) return;
  el.addEventListener('input', () => {
    document.getElementById(vid).textContent = fmt(el.value);
  });
});

btnRun.addEventListener('click', () => running ? stopRun() : startRun());
btnStep.addEventListener('click', () => {
  if (!algorithm) buildAlgorithm();
  if (running) stopRun();
  algorithm.step();
  canvasIdle.classList.add('hidden');
  renderFrame();
});
btnReset.addEventListener('click', resetAll);

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space')       { e.preventDefault(); running ? stopRun() : startRun(); }
  if (e.code === 'ArrowRight')  { e.preventDefault(); btnStep.click(); }
  if (e.code === 'KeyR')        { resetAll(); }
});

// ── Utility ────────────────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

// ── Initialise ─────────────────────────────────────────────────────────────
buildAlgorithm();
renderFrame();
