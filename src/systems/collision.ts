/**
 * Axis-aligned collision helpers for the manually-integrated ball.
 *
 * The ball is treated as a square for collision purposes (the classic breakout
 * approximation). That slightly over-detects at brick corners but guarantees a
 * clean, predictable resolution: push out along the shallowest axis and flip
 * that velocity component.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleRectHit {
  axis: "x" | "y";
  /** Direction to push the ball: -1 = left/up, +1 = right/down. */
  sign: -1 | 1;
  /** How far to push the ball to clear the rectangle. */
  depth: number;
}

/**
 * Returns the shallowest separation between a circle (treated as a square of
 * side `radius * 2`) and a rectangle, or null when they don't overlap.
 */
export function resolveCircleRect(
  cx: number,
  cy: number,
  radius: number,
  rect: Rect,
): CircleRectHit | null {
  const left = rect.x - radius;
  const right = rect.x + rect.width + radius;
  const top = rect.y - radius;
  const bottom = rect.y + rect.height + radius;

  if (cx <= left || cx >= right || cy <= top || cy >= bottom) return null;

  const pushLeft = cx - left;
  const pushRight = right - cx;
  const pushUp = cy - top;
  const pushDown = bottom - cy;

  const min = Math.min(pushLeft, pushRight, pushUp, pushDown);
  if (min === pushLeft) return { axis: "x", sign: -1, depth: pushLeft };
  if (min === pushRight) return { axis: "x", sign: 1, depth: pushRight };
  if (min === pushUp) return { axis: "y", sign: -1, depth: pushUp };
  return { axis: "y", sign: 1, depth: pushDown };
}
