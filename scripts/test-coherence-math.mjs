#!/usr/bin/env node
/*
 * Cross-checks the dependency-free color math in
 * scripts/lib/palette-coherence.mjs against culori (devDependency) —
 * CIEDE2000 and the Machado CVD simulation. If these drift, the shipped
 * audit would disagree with the reference implementation (issue #125).
 */
import { differenceCiede2000, filterDeficiencyProt, filterDeficiencyDeuter, filterDeficiencyTrit } from 'culori';
import { deltaE, oklchToLinearSrgb } from './lib/palette-coherence.mjs';

const toOklch = (c) => ({ mode: 'oklch', l: c[0], c: c[1], h: c[2] });
const diff = differenceCiede2000();
const filters = { protan: filterDeficiencyProt(1), deutan: filterDeficiencyDeuter(1), tritan: filterDeficiencyTrit(1) };

let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
// In-gamut-ish random colors (L .15-.95, C <= .12) — what palettes use.
const inGamut = (c) => oklchToLinearSrgb(c).every((x) => x >= 0 && x <= 1);
const sample = () => {
  for (;;) {
    const c = [0.15 + rnd() * 0.8, rnd() * 0.12, rnd() * 360];
    if (inGamut(c)) return c;
  }
};

let fails = 0, worst = 0;
for (let n = 0; n < 400; n++) {
  const a = sample(), b = sample();
  for (const mode of ['normal', 'protan', 'deutan', 'tritan']) {
    const f = filters[mode];
    const ca = f ? f(toOklch(a)) : toOklch(a);
    const cb = f ? f(toOklch(b)) : toOklch(b);
    const ref = diff(ca, cb);
    const mine = deltaE(a, b, mode);
    const d = Math.abs(ref - mine);
    worst = Math.max(worst, d);
    // gamut-edge colors can differ slightly in how out-of-gamut is clipped
    if (d > 0.5) { fails++; if (fails < 6) console.error(`  ✗ ${mode} ${a} vs ${b}: culori ${ref.toFixed(3)} mine ${mine.toFixed(3)}`); }
  }
}
if (fails) {
  console.error(`test-coherence-math FAILED: ${fails} disagreement(s) > 0.5 dE (worst ${worst.toFixed(3)})`);
  process.exit(1);
}
console.log(`test-coherence-math ok — 1600 comparisons vs culori, worst |dE diff| ${worst.toFixed(4)}`);
