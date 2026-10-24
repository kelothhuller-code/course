/*
 * Tiny guilloche generator (pure SVG path strings, no dependencies).
 * Used for the certificate border, corner rosettes, seal and watermark. Deterministic, so the
 * same certificate always renders identically on screen and in print.
 */
const f = (n) => Math.round(n * 10) / 10;

/** Several sine waves with shifted phases between (x0..x1) at height y: a braided band. */
export function waveBandH(x0, x1, y, { amp = 8, wave = 36, lines = 6, step = 2 } = {}) {
  const paths = [];
  for (let k = 0; k < lines; k += 1) {
    const phase = (k * 2 * Math.PI) / lines;
    let d = '';
    for (let x = x0; x <= x1 + 0.01; x += step) {
      const yy = y + amp * Math.sin(((x - x0) / wave) * 2 * Math.PI + phase);
      d += `${d ? 'L' : 'M'}${f(x)} ${f(yy)}`;
    }
    paths.push(d);
  }
  return paths;
}
export function waveBandV(y0, y1, x, opts = {}) {
  // Same band rotated: swap coordinates.
  return waveBandH(y0, y1, x, opts).map((d) => d.replace(/([ML])([\d.-]+) ([\d.-]+)/g, (_, c, a, b) => `${c}${b} ${a}`));
}

/** Woven rosette: m closed polar curves r(t) = r0 + a·sin(n·t + phase_k). */
export function rosette(cx, cy, { r0 = 40, a = 10, n = 12, curves = 6, steps = 360 } = {}) {
  const paths = [];
  for (let k = 0; k < curves; k += 1) {
    const phase = (k * Math.PI) / curves;
    let d = '';
    for (let i = 0; i <= steps; i += 1) {
      const t = (i / steps) * 2 * Math.PI;
      const r = r0 + a * Math.sin(n * t + phase);
      d += `${i ? 'L' : 'M'}${f(cx + r * Math.cos(t))} ${f(cy + r * Math.sin(t))}`;
    }
    paths.push(`${d}Z`);
  }
  return paths;
}

/** Spirograph (epitrochoid) curve — the classic banknote flower. */
export function epitrochoid(cx, cy, { R = 30, r = 6, p = 14, scale = 1, steps = 900, turns = 1 } = {}) {
  let d = '';
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * 2 * Math.PI * turns;
    const x = (R + r) * Math.cos(t) - p * Math.cos(((R + r) / r) * t);
    const y = (R + r) * Math.sin(t) - p * Math.sin(((R + r) / r) * t);
    d += `${i ? 'L' : 'M'}${f(cx + x * scale)} ${f(cy + y * scale)}`;
  }
  return `${d}Z`;
}
