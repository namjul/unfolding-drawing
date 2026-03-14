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

/** Nearest point on circle (cx,cy) radius r to point (px,py). */
function nearestPointOnCircle(
  cx: number,
  cy: number,
  r: number,
  px: number,
  py: number,
): { x: number; y: number } {
  const dx = px - cx;
  const dy = py - cy;
  const d = Math.hypot(dx, dy);
  if (d < 1e-10) return { x: cx + r, y: cy };
  return {
    x: cx + (r * dx) / d,
    y: cy + (r * dy) / d,
  };
}

/**
 * True if the circle intersects the segment (x1,y1)-(x2,y2). Includes the case
 * where a segment endpoint lies on or inside the circle (bend-at-end geometry).
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
  const distA = Math.hypot(x1 - cx, y1 - cy);
  const distB = Math.hypot(x2 - cx, y2 - cy);
  if (distA <= r || distB <= r) return true;
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

  const pairs: {
    ta: { x: number; y: number };
    tb: { x: number; y: number };
  }[] = [];

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
  _r: number,
  t1: { x: number; y: number },
  t2: { x: number; y: number },
  segmentEndX: number,
  segmentEndY: number,
  _otherEndX: number,
  _otherEndY: number,
): { x: number; y: number } {
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
 * SVG arc from (sx,sy) to (ex,ey) on circle (cx,cy) with radius r, chosen so that
 * the tangent at (ex,ey) points toward (towardX, towardY). Ensures smooth join when
 * the next segment is a line from (ex,ey) toward (towardX, towardY).
 */
function arcAlongCircleToward(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  cx: number,
  cy: number,
  r: number,
  towardX: number,
  towardY: number,
): string {
  const angleStart = Math.atan2(sy - cy, sx - cx);
  const angleEnd = Math.atan2(ey - cy, ex - cx);
  const dx = towardX - ex;
  const dy = towardY - ey;
  const len = Math.hypot(dx, dy);
  if (len < 1e-10) return arcAlongCircle(sx, sy, ex, ey, cx, cy, r);
  const wantTx = dx / len;
  const wantTy = dy / len;
  const rx = ex - cx;
  const ry = ey - cy;
  const tangentCwX = ry;
  const tangentCwY = -rx;
  const tangentCcwX = -ry;
  const tangentCcwY = rx;
  const dotCw = wantTx * tangentCwX + wantTy * tangentCwY;
  const dotCcw = wantTx * tangentCcwX + wantTy * tangentCcwY;
  let sweep = angleEnd - angleStart;
  if (sweep > Math.PI) sweep -= 2 * Math.PI;
  if (sweep < -Math.PI) sweep += 2 * Math.PI;
  const shortSweep = sweep;
  const longSweep = sweep >= 0 ? sweep - 2 * Math.PI : sweep + 2 * Math.PI;
  const shortTangentMatches = shortSweep > 0 ? dotCcw > 0 : dotCw > 0;
  const useLong = !shortTangentMatches;
  const finalSweep = useLong ? longSweep : shortSweep;
  const largeArc = Math.abs(finalSweep) > Math.PI ? 1 : 0;
  const sweepFlag = finalSweep > 0 ? 1 : 0;
  return `A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${ex} ${ey}`;
}

/**
 * SVG arc from (sx,sy) to (ex,ey) on circle (cx,cy) with radius r, chosen so that
 * the tangent at the start (sx,sy) points toward (towardX, towardY). Ensures smooth join
 * when the previous segment is a line arriving at (sx,sy) from the direction of (towardX, towardY).
 */
function arcFromCircleTowardStart(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  cx: number,
  cy: number,
  r: number,
  towardX: number,
  towardY: number,
): string {
  const angleStart = Math.atan2(sy - cy, sx - cx);
  const angleEnd = Math.atan2(ey - cy, ex - cx);
  const dx = towardX - sx;
  const dy = towardY - sy;
  const len = Math.hypot(dx, dy);
  if (len < 1e-10) return arcAlongCircle(sx, sy, ex, ey, cx, cy, r);
  const wantTx = dx / len;
  const wantTy = dy / len;
  const rx = sx - cx;
  const ry = sy - cy;
  const tangentCwX = ry;
  const tangentCwY = -rx;
  const tangentCcwX = -ry;
  const tangentCcwY = rx;
  const dotCw = wantTx * tangentCwX + wantTy * tangentCwY;
  const dotCcw = wantTx * tangentCcwX + wantTy * tangentCcwY;
  let sweep = angleEnd - angleStart;
  if (sweep > Math.PI) sweep -= 2 * Math.PI;
  if (sweep < -Math.PI) sweep += 2 * Math.PI;
  const shortSweep = sweep;
  const longSweep = sweep >= 0 ? sweep - 2 * Math.PI : sweep + 2 * Math.PI;
  const shortTangentMatches = shortSweep > 0 ? dotCcw > 0 : dotCw > 0;
  const useLong = !shortTangentMatches;
  const finalSweep = useLong ? longSweep : shortSweep;
  const largeArc = Math.abs(finalSweep) > Math.PI ? 1 : 0;
  const sweepFlag = finalSweep > 0 ? 1 : 0;
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
    if (otherThanEndA.length > 0) {
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
    const nearest = nearestPointOnCircle(
      bendA.centerX,
      bendA.centerY,
      bendA.radius,
      x2,
      y2,
    );
    const arc = arcAlongCircle(
      nearest.x,
      nearest.y,
      x1,
      y1,
      bendA.centerX,
      bendA.centerY,
      bendA.radius,
    );
    return `M ${x2} ${y2} L ${nearest.x} ${nearest.y} ${arc}`;
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
    if (otherThanEnd.length > 0) {
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
    const nearest = nearestPointOnCircle(
      bendB.centerX,
      bendB.centerY,
      bendB.radius,
      x1,
      y1,
    );
    const arc = arcAlongCircle(
      nearest.x,
      nearest.y,
      x2,
      y2,
      bendB.centerX,
      bendB.centerY,
      bendB.radius,
    );
    return `M ${x1} ${y1} L ${nearest.x} ${nearest.y} ${arc}`;
  }

  if (bendA && bendB) {
    // Both circles must be respected: path always bends around both (smooth S). Bend settings
    // are stored per end; the path is a function of both circles so changing either can change the whole path.
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
    // Always try common-tangent path first so we bend around both circles (never through one).
    // Do not drop a circle when it does not intersect the open segment—that would draw through it.
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
        const sweepA = arcSweepAngle(
          x1,
          y1,
          ta.x,
          ta.y,
          bendA.centerX,
          bendA.centerY,
        );
        const sweepB = arcSweepAngle(
          tb.x,
          tb.y,
          x2,
          y2,
          bendB.centerX,
          bendB.centerY,
        );
        const arcLen =
          bendA.radius * Math.abs(sweepA) + bendB.radius * Math.abs(sweepB);
        if (arcLen < bestLen) {
          bestLen = arcLen;
          best = { ta, tb };
        }
      }
      type TangentPair = {
        ta: { x: number; y: number };
        tb: { x: number; y: number };
      };
      const b: TangentPair = (best ?? pairs[0]) as TangentPair;
      const ta = b.ta;
      const tb = b.tb;
      const arcA = arcAlongCircleToward(
        x1,
        y1,
        ta.x,
        ta.y,
        bendA.centerX,
        bendA.centerY,
        bendA.radius,
        tb.x,
        tb.y,
      );
      const arcB = arcFromCircleTowardStart(
        tb.x,
        tb.y,
        x2,
        y2,
        bendB.centerX,
        bendB.centerY,
        bendB.radius,
        2 * tb.x - ta.x,
        2 * tb.y - ta.y,
      );
      return `M ${x1} ${y1} ${arcA} L ${tb.x} ${tb.y} ${arcB}`;
    }
    // Fallback when no common tangents: still bend around both circles (arc A, line, arc B).
    // Use segment–circle intersection when available; otherwise tangent from the other segment end.
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
    let ptA: { x: number; y: number };
    let ptB: { x: number; y: number };
    if (otherThanA.length > 0 && otherThanB.length > 0) {
      const tA = Math.max(...otherThanA);
      const tB = Math.min(...otherThanB);
      if (tA >= tB) return `M ${x1} ${y1} L ${x2} ${y2}`;
      ptA = pointAt(x1, y1, x2, y2, tA);
      ptB = pointAt(x1, y1, x2, y2, tB);
    } else {
      // One or both circles do not intersect the open segment; use tangent from other end so we still go around both.
      if (otherThanA.length > 0) {
        ptA = pointAt(x1, y1, x2, y2, Math.max(...otherThanA));
      } else {
        const tangentsA = tangentPointsFromExternalPoint(
          bendA.centerX,
          bendA.centerY,
          bendA.radius,
          x2,
          y2,
        );
        ptA = tangentsA
          ? pickTangentForArcToEnd(
              bendA.centerX,
              bendA.centerY,
              bendA.radius,
              tangentsA.t1,
              tangentsA.t2,
              x1,
              y1,
              x2,
              y2,
            )
          : { x: x1, y: y1 };
      }
      if (otherThanB.length > 0) {
        ptB = pointAt(x1, y1, x2, y2, Math.min(...otherThanB));
      } else {
        const tangentsB = tangentPointsFromExternalPoint(
          bendB.centerX,
          bendB.centerY,
          bendB.radius,
          x1,
          y1,
        );
        ptB = tangentsB
          ? pickTangentForArcToEnd(
              bendB.centerX,
              bendB.centerY,
              bendB.radius,
              tangentsB.t1,
              tangentsB.t2,
              x2,
              y2,
              x1,
              y1,
            )
          : { x: x2, y: y2 };
      }
    }
    const arcA = arcAlongCircleToward(
      x1,
      y1,
      ptA.x,
      ptA.y,
      bendA.centerX,
      bendA.centerY,
      bendA.radius,
      ptB.x,
      ptB.y,
    );
    const arcB = arcFromCircleTowardStart(
      ptB.x,
      ptB.y,
      x2,
      y2,
      bendB.centerX,
      bendB.centerY,
      bendB.radius,
      2 * ptB.x - ptA.x,
      2 * ptB.y - ptA.y,
    );
    return `M ${x1} ${y1} ${arcA} L ${ptB.x} ${ptB.y} ${arcB}`;
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
        const sweepA = arcSweepAngle(
          x1,
          y1,
          ta.x,
          ta.y,
          bendA.centerX,
          bendA.centerY,
        );
        const sweepB = arcSweepAngle(
          tb.x,
          tb.y,
          x2,
          y2,
          bendB.centerX,
          bendB.centerY,
        );
        const arcLen =
          bendA.radius * Math.abs(sweepA) + bendB.radius * Math.abs(sweepB);
        if (arcLen < bestLen) {
          bestLen = arcLen;
          best = { ta, tb };
        }
      }
      type TangentPair = {
        ta: { x: number; y: number };
        tb: { x: number; y: number };
      };
      const b: TangentPair = (best ?? pairs[0]) as TangentPair;
      const dArcA = distanceToArc(
        px,
        py,
        bendA.centerX,
        bendA.centerY,
        bendA.radius,
        x1,
        y1,
        b.ta.x,
        b.ta.y,
      );
      const dLine = distanceToSegment(px, py, b.ta.x, b.ta.y, b.tb.x, b.tb.y);
      const dArcB = distanceToArc(
        px,
        py,
        bendB.centerX,
        bendB.centerY,
        bendB.radius,
        b.tb.x,
        b.tb.y,
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
    let ptA: { x: number; y: number };
    let ptB: { x: number; y: number };
    if (otherThanA.length > 0 && otherThanB.length > 0) {
      const tA = Math.max(...otherThanA);
      const tB = Math.min(...otherThanB);
      if (tA >= tB) return distanceToSegment(px, py, x1, y1, x2, y2);
      ptA = pointAt(x1, y1, x2, y2, tA);
      ptB = pointAt(x1, y1, x2, y2, tB);
    } else {
      if (otherThanA.length > 0) {
        ptA = pointAt(x1, y1, x2, y2, Math.max(...otherThanA));
      } else {
        const tangentsA = tangentPointsFromExternalPoint(
          bendA.centerX,
          bendA.centerY,
          bendA.radius,
          x2,
          y2,
        );
        ptA = tangentsA
          ? pickTangentForArcToEnd(
              bendA.centerX,
              bendA.centerY,
              bendA.radius,
              tangentsA.t1,
              tangentsA.t2,
              x1,
              y1,
              x2,
              y2,
            )
          : { x: x1, y: y1 };
      }
      if (otherThanB.length > 0) {
        ptB = pointAt(x1, y1, x2, y2, Math.min(...otherThanB));
      } else {
        const tangentsB = tangentPointsFromExternalPoint(
          bendB.centerX,
          bendB.centerY,
          bendB.radius,
          x1,
          y1,
        );
        ptB = tangentsB
          ? pickTangentForArcToEnd(
              bendB.centerX,
              bendB.centerY,
              bendB.radius,
              tangentsB.t1,
              tangentsB.t2,
              x2,
              y2,
              x1,
              y1,
            )
          : { x: x2, y: y2 };
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
      ptA.x,
      ptA.y,
    );
    const dLine = distanceToSegment(px, py, ptA.x, ptA.y, ptB.x, ptB.y);
    const dArcB = distanceToArc(
      px,
      py,
      bendB.centerX,
      bendB.centerY,
      bendB.radius,
      ptB.x,
      ptB.y,
      x2,
      y2,
    );
    return Math.min(dArcA, dLine, dArcB);
  }

  return distanceToSegment(px, py, x1, y1, x2, y2);
}
