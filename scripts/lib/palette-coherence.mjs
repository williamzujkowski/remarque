/*
 * Palette-coherence checks (issue #125) — shared by scripts/audit.mjs
 * (reports them as WARNINGS) and scripts/theme.mjs (uses the same math as
 * generation guards).
 *
 * Zero runtime dependencies, on purpose: audit.mjs and theme.mjs ship in
 * the npm package and run in consumer installs, where culori is NOT
 * installed (it is a devDependency used only by scripts/palette-golden.mjs
 * and the tests). So this module implements the needed color math itself:
 * OKLCH -> linear sRGB (Ottosson), Machado et al. 2009 CVD matrices at
 * severity 1.0 (applied exactly as culori's filterDeficiencyProt/Deuter/
 * Trit do), linear sRGB -> CIE Lab (D65) and CIEDE2000.
 * scripts/test-coherence-math.mjs cross-checks every function against
 * culori so the two cannot drift apart.
 */

/* ── Thresholds — the single place to tune the coherence rules ─────────
 * These are WARNING thresholds for 0.28 (promoted to failures in a later
 * minor, per issue #125). All "dE" values are CIEDE2000.
 *   TEXT_TIER_EPS        slack when comparing contrast ratios (rounding)
 *   ACCENT_FG_MIN_RATIO  accent must hold this WCAG ratio against fg ...
 *   ACCENT_FG_MIN_DE     ... OR differ from fg by at least this dE
 *   ACCENT_ERROR_MIN_DE  a link must never read as an error message
 *   ACCENT_VIZ1_MIN_DE   REMARQUE.md: chart colour never mistaken for accent
 *   ERROR_SUCCESS_DEUTAN_MIN_DE  red/green state pair under deuteranopia
 *   SURFACE_STEP_MIN_DE  adjacent bg/surface/bg-subtle/code-bg steps
 *   VIZ_MIN_DE           min pairwise dE across --color-viz-1..6 under
 *                        normal/protan/deutan/tritan simulation. ~5 is the
 *                        usual "marks start to be confusable" line; below
 *                        it, "never colour alone" is the only thing
 *                        separating series, so a legend/label is mandatory.
 */
export const THRESHOLDS = Object.freeze({
  TEXT_TIER_EPS: 0.005,
  ACCENT_FG_MIN_RATIO: 3,
  ACCENT_FG_MIN_DE: 15,
  ACCENT_ERROR_MIN_DE: 8,
  ACCENT_VIZ1_MIN_DE: 8,
  ERROR_SUCCESS_DEUTAN_MIN_DE: 5,
  SURFACE_STEP_MIN_DE: 3,
  VIZ_MIN_DE: 5,
});

/* ── Color math ──────────────────────────────────────────── */

export function oklchToLinearSrgb([L, C, H]) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}
const clip01 = (x) => Math.min(1, Math.max(0, x));

export function wcagRatio(c1, c2) {
  const lum = (c) => {
    const [r, g, b] = oklchToLinearSrgb(c).map(clip01);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const l1 = lum(c1), l2 = lum(c2);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/* Machado, Oliveira & Fernandes 2009, severity 1.0. */
export const CVD_MATRICES = Object.freeze({
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
});
export const CVD_MODES = ['normal', 'protan', 'deutan', 'tritan'];

/* → linear sRGB after (optional) CVD simulation.
 *
 * Matches culori's filterDeficiencyProt/Deuter/Trit exactly (the ratified
 * reference for issue #125): culori applies the Machado matrices to
 * GAMMA-ENCODED sRGB and does not clip the result, which differs slightly
 * from the paper's linear-light formulation. We follow culori rather than
 * the paper so numbers are reproducible with the tool the maintainers
 * named; scripts/test-coherence-math.mjs pins the agreement. */
const encode = (x) => { const a = Math.abs(x); return Math.sign(x) * (a <= 0.0031308 ? 12.92 * a : 1.055 * a ** (1 / 2.4) - 0.055); };
const decode = (x) => { const a = Math.abs(x); return Math.sign(x) * (a <= 0.04045 ? a / 12.92 : ((a + 0.055) / 1.055) ** 2.4); };
export function simulate(color, mode = 'normal') {
  const rgb = oklchToLinearSrgb(color).map(clip01);
  const m = CVD_MATRICES[mode];
  if (!m) return rgb;
  const g = rgb.map(encode);
  return m.map((row) => decode(row[0] * g[0] + row[1] * g[1] + row[2] * g[2]));
}

export function linearSrgbToLab([r, g, b]) {
  const x = 0.4123907992659595 * r + 0.357584339383878 * g + 0.1804807884018343 * b;
  const y = 0.21263900587151036 * r + 0.715168678767756 * g + 0.07219231536073371 * b;
  const z = 0.01933081871559185 * r + 0.11919477979462599 * g + 0.9505321522496606 * b;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const fx = f(x / 0.95047), fy = f(y), fz = f(z / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/* CIEDE2000 (Sharma, Wu & Dalal 2005), kL = kC = kH = 1. */
export function ciede2000(lab1, lab2) {
  const rad = Math.PI / 180, deg = 180 / Math.PI;
  const [L1, a1, b1] = lab1, [L2, a2, b2] = lab2;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
  const Cbar7 = ((C1 + C2) / 2) ** 7;
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + 25 ** 7)));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const hp = (b, a) => (b === 0 && a === 0 ? 0 : (Math.atan2(b, a) * deg + 360) % 360);
  const h1p = hp(b1, a1p), h2p = hp(b2, a2p);
  const dLp = L2 - L1, dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * rad) / 2);
  const Lbp = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
  let hbp = h1p + h2p;
  if (C1p * C2p !== 0) {
    hbp = Math.abs(h1p - h2p) <= 180 ? (h1p + h2p) / 2 : (h1p + h2p + (h1p + h2p < 360 ? 360 : -360)) / 2;
  }
  const T = 1 - 0.17 * Math.cos((hbp - 30) * rad) + 0.24 * Math.cos(2 * hbp * rad) +
    0.32 * Math.cos((3 * hbp + 6) * rad) - 0.2 * Math.cos((4 * hbp - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2);
  const Sc = 1 + 0.045 * Cbp, Sh = 1 + 0.015 * Cbp * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt(
    (dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh),
  );
}

/* dE2000 between two OKLCH triples, optionally under a CVD simulation. */
export function deltaE(c1, c2, mode = 'normal') {
  return ciede2000(linearSrgbToLab(simulate(c1, mode)), linearSrgbToLab(simulate(c2, mode)));
}

/* Min pairwise dE across a list of colors → { de, i, j } */
export function minPairwise(colors, mode) {
  let best = { de: Infinity, i: -1, j: -1 };
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const de = deltaE(colors[i], colors[j], mode);
      if (de < best.de) best = { de, i, j };
    }
  }
  return best;
}

/* ── The coherence checks ────────────────────────────────────
 * lookup(name) -> [L,C,H] | null for ONE theme (names with the color-
 * prefix, no leading --). Returns warnings:
 *   { id, theme, tokens, actual, threshold, message }.
 * A check whose tokens are missing/unresolvable is skipped — missing
 * tokens are already hard failures in the contrast table. */
const r2 = (x) => Math.round(x * 100) / 100;

export function coherenceWarnings(lookup, theme) {
  const T = THRESHOLDS;
  const out = [];
  const warn = (id, tokens, actual, threshold, message) =>
    out.push({ id, theme, tokens, actual: r2(actual), threshold, message: `${theme}: ${message}` });
  const get = (n) => lookup(`color-${n}`);

  // 1. monotonic text tiers
  const [fg, fgMuted, muted, bg] = ['fg', 'fg-muted', 'muted', 'bg'].map(get);
  if (fg && fgMuted && bg) {
    const a = wcagRatio(fg, bg), b = wcagRatio(fgMuted, bg);
    if (a + T.TEXT_TIER_EPS < b) {
      warn('text-tier-monotonic', ['color-fg', 'color-fg-muted'], a - b, 0,
        `primary text is LOWER contrast than secondary: fg/bg ${a.toFixed(2)}:1 < fg-muted/bg ${b.toFixed(2)}:1 (want fg >= fg-muted >= muted)`);
    }
  }
  if (fgMuted && muted && bg) {
    const a = wcagRatio(fgMuted, bg), b = wcagRatio(muted, bg);
    if (a + T.TEXT_TIER_EPS < b) {
      warn('text-tier-monotonic', ['color-fg-muted', 'color-muted'], a - b, 0,
        `secondary text is LOWER contrast than tertiary: fg-muted/bg ${a.toFixed(2)}:1 < muted/bg ${b.toFixed(2)}:1 (want fg >= fg-muted >= muted)`);
    }
  }

  // 2. accent vs fg: 3:1 OR dE >= 15
  const accent = get('accent');
  if (accent && fg) {
    const ratio = wcagRatio(accent, fg), de = deltaE(accent, fg);
    if (ratio < T.ACCENT_FG_MIN_RATIO && de < T.ACCENT_FG_MIN_DE) {
      warn('accent-vs-fg', ['color-accent', 'color-fg'], de, T.ACCENT_FG_MIN_DE,
        `links are indistinguishable from body text: accent/fg = ${ratio.toFixed(2)}:1 and dE ${de.toFixed(1)} (need >= ${T.ACCENT_FG_MIN_RATIO}:1 or dE >= ${T.ACCENT_FG_MIN_DE})`);
    }
  }

  // 3. accent vs error / viz-1; error vs success under deutan
  const pair = (id, a, b, min, why, mode) => {
    const ca = get(a), cb = get(b);
    if (!ca || !cb) return;
    const de = deltaE(ca, cb, mode);
    if (de < min) {
      warn(id, [`color-${a}`, `color-${b}`], de, min,
        `${a} vs ${b}${mode ? ` (${mode})` : ''} dE ${de.toFixed(1)} < ${min} — ${why}`);
    }
  };
  pair('accent-vs-error', 'accent', 'error', T.ACCENT_ERROR_MIN_DE, 'a link reads as an error message');
  pair('accent-vs-viz-1', 'accent', 'viz-1', T.ACCENT_VIZ1_MIN_DE, 'a chart colour can be mistaken for the accent');
  pair('error-vs-success-deutan', 'error', 'success', T.ERROR_SUCCESS_DEUTAN_MIN_DE, 'red/green state pair collapses for deuteranopes', 'deutan');

  // 4. surface ramp
  const ramp = ['bg', 'surface', 'bg-subtle', 'code-bg'];
  for (let i = 0; i + 1 < ramp.length; i++) {
    pair('surface-step', ramp[i], ramp[i + 1], T.SURFACE_STEP_MIN_DE,
      'adjacent surface steps are indistinguishable (drop the redundant token or separate them)');
  }

  // 5. viz CVD gate
  const viz = [1, 2, 3, 4, 5, 6].map((n) => get(`viz-${n}`));
  if (viz.every(Boolean)) {
    for (const mode of CVD_MODES) {
      const { de, i, j } = minPairwise(viz, mode);
      if (de < T.VIZ_MIN_DE) {
        warn(`viz-cvd-${mode}`, [`color-viz-${i + 1}`, `color-viz-${j + 1}`], de, T.VIZ_MIN_DE,
          `viz-${i + 1}/viz-${j + 1} dE ${de.toFixed(1)} < ${T.VIZ_MIN_DE} under ${mode} vision — series need a non-colour channel (label, marker, dash)`);
      }
    }
  }
  return out;
}
