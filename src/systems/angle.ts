/**
 * Paddle bounce math. Pure module — no Phaser imports so it can be unit tested.
 *
 * Classic breakout feel: the ball's outgoing angle depends on where it hit the
 * paddle. Hitting the center sends it straight up; edges angle it outwards,
 * clamped so trajectories stay playable.
 */

export const MAX_PADDLE_BOUNCE_DEG = 75;

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(-1, Math.min(1, value));
}

/**
 * Converts a hit position along the paddle (-1 = far left, 0 = center,
 * +1 = far right) into an outgoing angle in degrees, measured from vertical
 * (negative angles go left, positive go right).
 */
export function paddleBounceAngleDeg(offset: number): number {
  return clamp01(offset) * MAX_PADDLE_BOUNCE_DEG;
}

export interface Velocity {
  vx: number;
  vy: number;
}

/**
 * Velocity vector for a bounce off the paddle.
 * `offset` is the same -1..1 hit position as `paddleBounceAngleDeg`.
 * `speed` is the intended magnitude; the result always has exactly that magnitude.
 */
export function paddleBounceVelocity(offset: number, speed: number): Velocity {
  const angleRad = (paddleBounceAngleDeg(offset) * Math.PI) / 180;
  return {
    vx: Math.sin(angleRad) * speed,
    vy: -Math.cos(angleRad) * speed,
  };
}

/**
 * Normalizes a velocity to exactly `speed` and steepens it so the vertical
 * component is at least `minVertical`. Sign of both components is preserved
 * (an exactly-zero component defaults to positive — down/right).
 *
 * This is what stops the ball from skimming sideways across the paddle.
 */
export function enforceMinVertical(vx: number, vy: number, speed: number, minVertical: number): Velocity {
  const mag = Math.hypot(vx, vy);
  if (mag < 1) return { vx, vy };

  let outVx = (vx / mag) * speed;
  let outVy = (vy / mag) * speed;

  if (Math.abs(outVy) < minVertical) {
    outVy = (Math.sign(outVy) || 1) * minVertical;
    outVx = (Math.sign(outVx) || 1) * Math.sqrt(Math.max(0, speed * speed - minVertical * minVertical));
  }
  return { vx: outVx, vy: outVy };
}
