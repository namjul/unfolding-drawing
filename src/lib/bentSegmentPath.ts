/**
 * Builds an SVG path string for a line segment that may bend around circular
 * fields at one or both ends. The segment runs from (x1,y1) to (x2,y2). When
 * a bend is present at an end, that end lies on the circumference of a circle;
 * if the circle intersects the straight segment, the path bends around it.
 */

export type SegmentPos = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type BendCircle = {
  centerX: number;
  centerY: number;
  radius: number;
  endX: number;
  endY: number;
};

/**
 * Intersection of line segment (x1,y1)-(x2,y2) with circle (cx,cy) radius r.
 * Returns the parameter t in [0,1] for the point(s) on the segment that lie on
 * the circle. Can return 0, 1, or 2 solutions; excludes the endpoint when it is
 * the only intersection (so we get the "other" intersection for bending).
 */
function lineCircleIntersections(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cx: number,
  cy: number,
  r: number,
): number[] {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const ex = x1 - cx;
  const ey = y1 - cy;
  const a = dx * dx + dy * dy;
  const b = 2 * (ex * dx + ey * dy);
  const c = ex * ex + ey * ey - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < 0 || a < 1e-14) return [];
  const sqrt = Math.sqrt(disc);
  const t1 = (-b - sqrt) / (2 * a);
  const t2 = (-b + sqrt) / (2 * a);
  const out: number[] = [];
  if (t1 >= 0 && t1 <= 1) out.push(t1);
  if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > 1e-10) out.push(t2);
  return out;
}

function pointAt(x1: number, y1: number, x2: number, y2: number, t: number) {
  return {
    x: x1 + t * (x2 - x1),
    y: y1 + t * (y2 - y1),
  };
}

/**
 * True if the circle intersects the open segment (x1,y1)-(x2,y2), i.e. there is
 * at least one intersection at parameter t with 0 < t < 1 (not at an endpoint).
 */
function circleIntersectsSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cx: number,
  cy: number,
  r: number,
): boolean {
  const ts = lineCircleIntersections(x1, y1, x2, y2, cx, cy, r);
  return ts.some((t) => t > 0.01 && t < 0.99);
}

/**
 * Tangent points on circle (cx,cy) radius r from external point (px,py).
 * Returns { t1, t2 } when distance from (px,py) to center >= r, else null.
 * The line from (px,py) to t1/t2 is tangent to the circle at t1/t2.
 */
function tangentPointsFromExternalPoint(
  cx: number,
  cy: number,
  r: number,
  px: number,
  py: number,
): { t1: { x: number; y: number }; t2: { x: number; y: number } } | null {
  const dx = px - cx;
  const dy = py - cy;
  const dSq = dx * dx + dy * dy;
  const dLen = Math.sqrt(dSq);
  if (dLen < r - 1e-10) return null;
  if (dLen < 1e-10) return null;
  const dInv = 1 / dLen;
  const cos = r * dInv;
  const sinSq = 1 - (r * r) / dSq;
  if (sinSq < 0) return null;
  const sin = Math.sqrt(sinSq);
  const ux = dx * dInv;
  const uy = dy * dInv;
  const perpX = -uy;
  const perpY = ux;
  const t1 = {
    x: cx + r * (cos * ux - sin * perpX),
    y: cy + r * (cos * uy - sin * perpY),
  };
  const t2 = {
    x: cx + r * (cos * ux + sin * perpX),
    y: cy + r * (cos * uy + sin * perpY),
  };
  return { t1, t2 };
}

const EPS = 1e-10;

/**
 * Outer common tangents to two circles. Returns up to two pairs of tangent points
 * (ta on circle A, tb on circle B) so the line ta–tb is tangent to both circles.
 * Used for smooth double-bend: path is tangent at both circles (smooth S). Trade-off:
 * moving one bending circle can change the path at both ends because the tangent line couples them.
 */
function outerCommonTangentPoints(
  cx1: number,
  cy1: number,
  r1: number,
  cx2: number,
  cy2: number,
  r2: number,
): { ta: { x: number; y: number }; tb: { x: number; y: number } }[] {
  const vx = cx2 - cx1;
  const vy = cy2 - cy1;
  const z = vx * vx + vy * vy;
  if (z < EPS) return [];

  const pairs: { ta: { x: number; y: number }; tb: { x: number; y: number } }[] = [];

  for (const si of [-1, 1]) {
    for (const sj of [-1, 1]) {
      const r1s = r1 * si;
      const r2s = r2 * sj;
      const r = r2s - r1s;
      let d = z - r * r;
      if (d < -EPS) continue;
      d = Math.sqrt(Math.max(0, d));
      let a = (vx * r + vy * d) / z;
      let b = (vy * r - vx * d) / z;
      let c = r1s - (a * cx1 + b * cy1);
      const n = Math.hypot(a, b);
      if (n < EPS) continue;
      a /= n;
      b /= n;
      c /= n;
      const dist1 = a * cx1 + b * cy1 + c;
      const dist2 = a * cx2 + b * cy2 + c;
      if (dist1 * dist2 <= 0) continue;
      const s1 = dist1 > 0 ? 1 : -1;
      const s2 = dist2 > 0 ? 1 : -1;
      pairs.push({
        ta: { x: cx1 - r1 * a * s1, y: cy1 - r1 * b * s1 },
        tb: { x: cx2 - r2 * a * s2, y: cy2 - r2 * b * s2 },
      });
    }
  }

  return pairs;
}

/**
 * Angular extent of arc from (sx,sy) to (ex,ey) on circle (cx,cy), in (-π, π].
 */
function arcSweepAngle(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  cx: number,
  cy: number,
): number {
  const a0 = Math.atan2(sy - cy, sx - cx);
  const a1 = Math.atan2(ey - cy, ex - cx);
  let sweep = a1 - a0;
  if (sweep > Math.PI) sweep -= 2 * Math.PI;
  if (sweep < -Math.PI) sweep += 2 * Math.PI;
  return sweep;
}

/**
 * Pick the tangent point T such that the arc from T to segmentEnd (on the circle)
 * is the shortest way around the circle.
 */
function pickTangentForArcToEnd(
  cx: number,
  cy: number,
  r: number,
  t1: { x: number; y: number },
  t2: { x: number; y: number },
  segmentEndX: number,
  segmentEndY: number,
  _otherEndX: number,
  _otherEndY: number,
): { x: number; y: number } {
  const angleEnd = Math.atan2(segmentEndY - cy, segmentEndX - cx);
  const sweep1 = arcSweepAngle(t1.x, t1.y, segmentEndX, segmentEndY, cx, cy);
  const sweep2 = arcSweepAngle(t2.x, t2.y, segmentEndX, segmentEndY, cx, cy);
  return Math.abs(sweep1) <= Math.abs(sweep2) ? t1 : t2;
}

/**
 * SVG arc from (sx,sy) to (ex,ey) on circle (cx,cy) with radius r.
 * Uses sweep flag so the arc goes the shorter way that bends "out" from the
 * segment (center and arc on the same side of the line).
 */
function arcAlongCircle(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  cx: number,
  cy: number,
  r: number,
): string {
  const angleStart = Math.atan2(sy - cy, sx - cx);
  const angleEnd = Math.atan2(ey - cy, ex - cx);
  let sweep = angleEnd - angleStart;
  if (sweep > Math.PI) sweep -= 2 * Math.PI;
  if (sweep < -Math.PI) sweep += 2 * Math.PI;
  const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
  const sweepFlag = sweep > 0 ? 1 : 0;
  return `A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${ex} ${ey}`;
}

/**
 * Build SVG path for the segment, bending around circles at end A (x1,y1) and/or end B (x2,y2).
 */
export function buildBentSegmentPath(
  seg: SegmentPos,
  bendA: BendCircle | null | undefined,
  bendB: BendCircle | null | undefined,
): string {
  const { x1, y1, x2, y2 } = seg;
  if (!bendA && !bendB) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  if (bendA && !bendB) {
    if (
      !circleIntersectsSegment(
        x1,
        y1,
        x2,
        y2,
        bendA.centerX,
        bendA.centerY,
        bendA.radius,
      )
    ) {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }
    const tangents = tangentPointsFromExternalPoint(
      bendA.centerX,
      bendA.centerY,
      bendA.radius,
      x2,
      y2,
    );
    if (tangents) {
      const T = pickTangentForArcToEnd(
        bendA.centerX,
        bendA.centerY,
        bendA.radius,
        tangents.t1,
        tangents.t2,
        x1,
        y1,
        x2,
        y2,
      );
      const arc = arcAlongCircle(
        T.x,
        T.y,
        x1,
        y1,
        bendA.centerX,
        bendA.centerY,
        bendA.radius,
      );
      return `M ${x2} ${y2} L ${T.x} ${T.y} ${arc}`;
    }
    const ts = lineCircleIntersections(
      x1,
      y1,
      x2,
      y2,
      bendA.centerX,
      bendA.centerY,
      bendA.radius,
    );
    const otherThanEndA = ts.filter((t) => t > 0.01);
    if (otherThanEndA.length === 0) return `M ${x1} ${y1} L ${x2} ${y2}`;
    const t = Math.max(...otherThanEndA);
    const P = pointAt(x1, y1, x2, y2, t);
    const arc = arcAlongCircle(
      P.x,
      P.y,
      x1,
      y1,
      bendA.centerX,
      bendA.centerY,
      bendA.radius,
    );
    return `M ${x2} ${y2} L ${P.x} ${P.y} ${arc}`;
  }

  if (!bendA && bendB) {
    if (
      !circleIntersectsSegment(
        x1,
        y1,
        x2,
        y2,
        bendB.centerX,
        bendB.centerY,
        bendB.radius,
      )
    ) {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }
    const tangents = tangentPointsFromExternalPoint(
      bendB.centerX,
      bendB.centerY,
      bendB.radius,
      x1,
      y1,
    );
    if (tangents) {
      const T = pickTangentForArcToEnd(
        bendB.centerX,
        bendB.centerY,
        bendB.radius,
        tangents.t1,
        tangents.t2,
        x2,
        y2,
        x1,
        y1,
      );
      const arc = arcAlongCircle(
        T.x,
        T.y,
        x2,
        y2,
        bendB.centerX,
        bendB.centerY,
        bendB.radius,
      );
      return `M ${x1} ${y1} L ${T.x} ${T.y} ${arc}`;
    }
    const ts = lineCircleIntersections(
      x1,
      y1,
      x2,
      y2,
      bendB.centerX,
      bendB.centerY,
      bendB.radius,
    );
    const otherThanEnd = ts.filter((t) => t > 0.01);
    if (otherThanEnd.length === 0) return `M ${x1} ${y1} L ${x2} ${y2}`;
    const t = Math.max(...otherThanEnd);
    const P = pointAt(x1, y1, x2, y2, t);
    const arc = arcAlongCircle(
      P.x,
      P.y,
      x2,
      y2,
      bendB.centerX,
      bendB.centerY,
      bendB.radius,
    );
    return `M ${x1} ${y1} L ${P.x} ${P.y} ${arc}`;
  }

  if (bendA && bendB) {
    const intersectsA = circleIntersectsSegment(
      x1,
      y1,
      x2,
      y2,
      bendA.centerX,
      bendA.centerY,
      bendA.radius,
    );
    const intersectsB = circleIntersectsSegment(
      x1,
      y1,
      x2,
      y2,
      bendB.centerX,
      bendB.centerY,
      bendB.radius,
    );
    if (!intersectsA && !intersectsB) {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }
    if (!intersectsA) {
      return buildBentSegmentPath(seg, null, bendB);
    }
    if (!intersectsB) {
      return buildBentSegmentPath(seg, bendA, null);
    }
    // Prefer smooth double-bend: outer common tangent so path is tangent to both circles (smooth S).
    const pairs = outerCommonTangentPoints(
      bendA.centerX,
      bendA.centerY,
      bendA.radius,
      bendB.centerX,
      bendB.centerY,
      bendB.radius,
    );
    if (pairs.length > 0) {
      let best = pairs[0];
      let bestLen = Infinity;
      for (const { ta, tb } of pairs) {
        const sweepA = arcSweepAngle(x1, y1, ta.x, ta.y, bendA.centerX, bendA.centerY);
        const sweepB = arcSweepAngle(tb.x, tb.y, x2, y2, bendB.centerX, bendB.centerY);
        const len =
          bendA.radius * Math.abs(sweepA) +
          Math.hypot(tb.x - ta.x, tb.y - ta.y) +
          bendB.radius * Math.abs(sweepB);
        if (len < bestLen) {
          bestLen = len;
          best = { ta, tb };
        }
      }
      const arcA = arcAlongCircle(
        x1,
        y1,
        best.ta.x,
        best.ta.y,
        bendA.centerX,
        bendA.centerY,
        bendA.radius,
      );
      const arcB = arcAlongCircle(
        best.tb.x,
        best.tb.y,
        x2,
        y2,
        bendB.centerX,
        bendB.centerY,
        bendB.radius,
      );
      return `M ${x1} ${y1} ${arcA} L ${best.tb.x} ${best.tb.y} ${arcB}`;
    }
    // Fallback: intersection-based (independent per end but sharp corners at PA, PB).
    const tsA = lineCircleIntersections(
      x1,
      y1,
      x2,
      y2,
      bendA.centerX,
      bendA.centerY,
      bendA.radius,
    );
    const tsB = lineCircleIntersections(
      x1,
      y1,
      x2,
      y2,
      bendB.centerX,
      bendB.centerY,
      bendB.radius,
    );
    const otherThanA = tsA.filter((t) => t > 0.01);
    const otherThanB = tsB.filter((t) => t < 0.99);
    if (otherThanA.length === 0 || otherThanB.length === 0) {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }
    const tA = Math.max(...otherThanA);
    const tB = Math.min(...otherThanB);
    if (tA >= tB) return `M ${x1} ${y1} L ${x2} ${y2}`;
    const PA = pointAt(x1, y1, x2, y2, tA);
    const PB = pointAt(x1, y1, x2, y2, tB);
    const arcA = arcAlongCircle(
      x1,
      y1,
      PA.x,
      PA.y,
      bendA.centerX,
      bendA.centerY,
      bendA.radius,
    );
    const arcB = arcAlongCircle(
      PB.x,
      PB.y,
      x2,
      y2,
      bendB.centerX,
      bendB.centerY,
      bendB.radius,
    );
    return `M ${x1} ${y1} ${arcA} L ${PB.x} ${PB.y} ${arcB}`;
  }

  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-12) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * dx;
  const qy = y1 + t * dy;
  return Math.hypot(px - qx, py - qy);
}

function distanceToArc(
  px: number,
  py: number,
  cx: number,
  cy: number,
  r: number,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  steps = 24,
): number {
  const a0 = Math.atan2(sy - cy, sx - cx);
  const a1 = Math.atan2(ey - cy, ex - cx);
  let da = a1 - a0;
  if (da > Math.PI) da -= 2 * Math.PI;
  if (da < -Math.PI) da += 2 * Math.PI;
  let min = Infinity;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = a0 + t * da;
    const qx = cx + r * Math.cos(a);
    const qy = cy + r * Math.sin(a);
    const d = Math.hypot(px - qx, py - qy);
    if (d < min) min = d;
  }
  return min;
}

/**
 * Minimum distance from (px, py) to the bent path.
 */
export function distanceFromPointToBentPath(
  px: number,
  py: number,
  seg: SegmentPos,
  bendA: BendCircle | null | undefined,
  bendB: BendCircle | null | undefined,
): number {
  const { x1, y1, x2, y2 } = seg;
  if (!bendA && !bendB) {
    return distanceToSegment(px, py, x1, y1, x2, y2);
  }

  if (bendA && !bendB) {
    if (
      !circleIntersectsSegment(
        x1,
        y1,
        x2,
        y2,
        bendA.centerX,
        bendA.centerY,
        bendA.radius,
      )
    ) {
      return distanceToSegment(px, py, x1, y1, x2, y2);
    }
    const tangents = tangentPointsFromExternalPoint(
      bendA.centerX,
      bendA.centerY,
      bendA.radius,
      x2,
      y2,
    );
    if (tangents) {
      const T = pickTangentForArcToEnd(
        bendA.centerX,
        bendA.centerY,
        bendA.radius,
        tangents.t1,
        tangents.t2,
        x1,
        y1,
        x2,
        y2,
      );
      const dLine = distanceToSegment(px, py, x2, y2, T.x, T.y);
      const dArc = distanceToArc(
        px,
        py,
        bendA.centerX,
        bendA.centerY,
        bendA.radius,
        T.x,
        T.y,
        x1,
        y1,
      );
      return Math.min(dLine, dArc);
    }
    const ts = lineCircleIntersections(
      x1,
      y1,
      x2,
      y2,
      bendA.centerX,
      bendA.centerY,
      bendA.radius,
    );
    const otherThanEndA = ts.filter((t) => t > 0.01);
    if (otherThanEndA.length === 0)
      return distanceToSegment(px, py, x1, y1, x2, y2);
    const t = Math.max(...otherThanEndA);
    const P = pointAt(x1, y1, x2, y2, t);
    const dLine = distanceToSegment(px, py, x2, y2, P.x, P.y);
    const dArc = distanceToArc(
      px,
      py,
      bendA.centerX,
      bendA.centerY,
      bendA.radius,
      P.x,
      P.y,
      x1,
      y1,
    );
    return Math.min(dLine, dArc);
  }

  if (!bendA && bendB) {
    if (
      !circleIntersectsSegment(
        x1,
        y1,
        x2,
        y2,
        bendB.centerX,
        bendB.centerY,
        bendB.radius,
      )
    ) {
      return distanceToSegment(px, py, x1, y1, x2, y2);
    }
    const tangents = tangentPointsFromExternalPoint(
      bendB.centerX,
      bendB.centerY,
      bendB.radius,
      x1,
      y1,
    );
    if (tangents) {
      const T = pickTangentForArcToEnd(
        bendB.centerX,
        bendB.centerY,
        bendB.radius,
        tangents.t1,
        tangents.t2,
        x2,
        y2,
        x1,
        y1,
      );
      const dLine = distanceToSegment(px, py, x1, y1, T.x, T.y);
      const dArc = distanceToArc(
        px,
        py,
        bendB.centerX,
        bendB.centerY,
        bendB.radius,
        T.x,
        T.y,
        x2,
        y2,
      );
      return Math.min(dLine, dArc);
    }
    const ts = lineCircleIntersections(
      x1,
      y1,
      x2,
      y2,
      bendB.centerX,
      bendB.centerY,
      bendB.radius,
    );
    const otherThanEndB = ts.filter((t) => t < 0.99);
    if (otherThanEndB.length === 0)
      return distanceToSegment(px, py, x1, y1, x2, y2);
    const t = Math.min(...otherThanEndB);
    const P = pointAt(x1, y1, x2, y2, t);
    const dLine = distanceToSegment(px, py, x1, y1, P.x, P.y);
    const dArc = distanceToArc(
      px,
      py,
      bendB.centerX,
      bendB.centerY,
      bendB.radius,
      P.x,
      P.y,
      x2,
      y2,
    );
    return Math.min(dLine, dArc);
  }

  if (bendA && bendB) {
    const intersectsA = circleIntersectsSegment(
      x1,
      y1,
      x2,
      y2,
      bendA.centerX,
      bendA.centerY,
      bendA.radius,
    );
    const intersectsB = circleIntersectsSegment(
      x1,
      y1,
      x2,
      y2,
      bendB.centerX,
      bendB.centerY,
      bendB.radius,
    );
    if (!intersectsA && !intersectsB) {
      return distanceToSegment(px, py, x1, y1, x2, y2);
    }
    if (!intersectsA) {
      return distanceFromPointToBentPath(px, py, seg, null, bendB);
    }
    if (!intersectsB) {
      return distanceFromPointToBentPath(px, py, seg, bendA, null);
    }
    const pairs = outerCommonTangentPoints(
      bendA.centerX,
      bendA.centerY,
      bendA.radius,
      bendB.centerX,
      bendB.centerY,
      bendB.radius,
    );
    if (pairs.length > 0) {
      let best = pairs[0];
      let bestLen = Infinity;
      for (const { ta, tb } of pairs) {
        const sweepA = arcSweepAngle(x1, y1, ta.x, ta.y, bendA.centerX, bendA.centerY);
        const sweepB = arcSweepAngle(tb.x, tb.y, x2, y2, bendB.centerX, bendB.centerY);
        const len =
          bendA.radius * Math.abs(sweepA) +
          Math.hypot(tb.x - ta.x, tb.y - ta.y) +
          bendB.radius * Math.abs(sweepB);
        if (len < bestLen) {
          bestLen = len;
          best = { ta, tb };
        }
      }
      const dArcA = distanceToArc(
        px,
        py,
        bendA.centerX,
        bendA.centerY,
        bendA.radius,
        x1,
        y1,
        best.ta.x,
        best.ta.y,
      );
      const dLine = distanceToSegment(px, py, best.ta.x, best.ta.y, best.tb.x, best.tb.y);
      const dArcB = distanceToArc(
        px,
        py,
        bendB.centerX,
        bendB.centerY,
        bendB.radius,
        best.tb.x,
        best.tb.y,
        x2,
        y2,
      );
      return Math.min(dArcA, dLine, dArcB);
    }
    const tsA = lineCircleIntersections(
      x1,
      y1,
      x2,
      y2,
      bendA.centerX,
      bendA.centerY,
      bendA.radius,
    );
    const tsB = lineCircleIntersections(
      x1,
      y1,
      x2,
      y2,
      bendB.centerX,
      bendB.centerY,
      bendB.radius,
    );
    const otherThanA = tsA.filter((t) => t > 0.01);
    const otherThanB = tsB.filter((t) => t < 0.99);
    if (otherThanA.length === 0 || otherThanB.length === 0) {
      return distanceToSegment(px, py, x1, y1, x2, y2);
    }
    const tA = Math.max(...otherThanA);
    const tB = Math.min(...otherThanB);
    if (tA >= tB) return distanceToSegment(px, py, x1, y1, x2, y2);
    const PA = pointAt(x1, y1, x2, y2, tA);
    const PB = pointAt(x1, y1, x2, y2, tB);
    const dArcA = distanceToArc(
      px,
      py,
      bendA.centerX,
      bendA.centerY,
      bendA.radius,
      x1,
      y1,
      PA.x,
      PA.y,
    );
    const dLine = distanceToSegment(px, py, PA.x, PA.y, PB.x, PB.y);
    const dArcB = distanceToArc(
      px,
      py,
      bendB.centerX,
      bendB.centerY,
      bendB.radius,
      PB.x,
      PB.y,
      x2,
      y2,
    );
    return Math.min(dArcA, dLine, dArcB);
  }

  return distanceToSegment(px, py, x1, y1, x2, y2);
}
