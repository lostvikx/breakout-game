/**
 * Paddle bounce math and direction clamping. Pure module — no Phaser imports
 * so it can be unit tested.
 *
 * Classic breakout feel: the ball's outgoing angle depends on where it hit the
 * paddle. Hitting the center sends it straight up; edges angle it outwards.
 * Angles are measured from vertical and clamped well short of horizontal so the
 * ball never crawls sideways across the screen.
 */

export const MAX_PADDLE_BOUNCE_DEG = 60;

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
 * Normalizes a direction and clamps it to `maxAngleDeg` away from vertical,
 * preserving the sign of each component. Used when multiball splits a ball so
 * clones can never end up travelling almost horizontally.
 */
export function clampDirection(
  vx: number,
  vy: number,
  maxAngleDeg: number = MAX_PADDLE_BOUNCE_DEG,
): Velocity {
  const mag = Math.hypot(vx, vy);
  if (mag < 1e-6) return { vx: 0, vy: -1 };

  const ux = vx / mag;
  const uy = vy / mag;
  const angleFromVertical = Math.atan2(Math.abs(ux), Math.abs(uy));
  const max = (maxAngleDeg * Math.PI) / 180;

  if (angleFromVertical <= max) return { vx: ux, vy: uy };

  return {
    vx: (Math.sign(ux) || 1) * Math.sin(max),
    vy: (Math.sign(uy) || 1) * Math.cos(max),
  };
}
