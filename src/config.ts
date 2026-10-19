/** Game-wide constants. Pure data — no Phaser imports here so it stays unit-testable. */

export const GAME = {
  W: 1280,
  H: 720,
} as const;

export const BRICK = {
  W: 80,
  H: 26,
  COLS: 13,
  TOP: 76,
  PITCH_X: 92,
  PITCH_Y: 34,
  /** Left margin so 13 columns center within the 1280px playfield. */
  LEFT: 48,
} as const;

export const PADDLE = {
  W: 140,
  WIDE: 220,
  H: 14,
  SPEED: 660,
  Y: 676,
} as const;

export const BALL = {
  RADIUS: 8,
  SPEED_START: 380,
  SPEED_INC: 7,
  SPEED_MAX: 620,
  /** Below this vertical speed the ball gets nudged so it never crawls sideways forever. */
  MIN_VERTICAL: 110,
} as const;

export const RULES = {
  LIVES_START: 3,
  LIVES_MAX: 6,
  DROP_CHANCE: 0.12,
} as const;
