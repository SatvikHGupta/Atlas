/* Builds a smooth winding path through `count` points spread evenly across `width`, alternating between a high and low band of `height` for a gentle trail-like wave. Used to render the Atlas roadmap as a literal route rather than a generic stat block - see app/page.js. Returns { d, points } - `d` is the SVG path string, `points` is the [{x,y}] array so labels/dots can be placed at the exact same coordinates the line passes through. */
export function buildRoutePath(count, width, height) {
  const points = Array.from({ length: count }, (_, i) => {
    const x = (i / (count - 1)) * width;
    const bandPhase = i % 2 === 0 ? 0.28 : 0.72;
    const wobble = Math.sin(i * 1.3) * 0.06;
    const y = (bandPhase + wobble) * height;
    return { x, y };
  });

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    d += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  return { d, points };
}
