// The "How personal" twig: three stops along it, and the maths for dragging
// the bird between them.

/** Where the stops sit, as fractions of the twig's width: Light, Balanced, Deep. */
export const STOPS = [0.16, 0.5, 0.84] as const;

export function stopX(i: number, span: number): number {
  return span * STOPS[i];
}

/** The stop nearest to a point on the twig. */
export function nearestStop(x: number, span: number): number {
  let best = 0;
  for (let i = 1; i < STOPS.length; i++) {
    if (Math.abs(x - stopX(i, span)) < Math.abs(x - stopX(best, span))) best = i;
  }
  return best;
}

export function clamp(v: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, v));
}

/**
 * The twig as a path, dipping a little where the bird stands. `dip` is how
 * far: more when the bird has landed, less while it is lifted.
 */
export function twigPath(span: number, birdX: number, dip: number): string {
  const y0 = 14;
  const y1 = 10;
  const b = clamp(birdX, 30, span - 30);
  const yb = y0 + (y1 - y0) * (b / span) + 4 + dip;
  return [
    `M 4 ${y0}`,
    `C ${b * 0.45} ${y0 + 4} ${b - 34} ${yb} ${b} ${yb}`,
    `C ${b + 34} ${yb} ${b + (span - b) * 0.55} ${y1 + 4} ${span - 4} ${y1}`,
  ].join(' ');
}
