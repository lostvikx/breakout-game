/** Neon Glow palette. Pure data — no Phaser imports. */

export const COLORS = {
  pageBg: 0x05050c,
  field: 0x0d0d1f,
  hudBg: 0x121228,
  white: 0xffffff,
} as const;

/** Neon brick colors for the 1-hit bricks, index 1–5 (matches the level legend). */
export const NEON_HEX = [0xff2fb3, 0x00e5ff, 0xffe14d, 0x7cff6b, 0xb96bff] as const;

export const NEON_CSS = ["#ff2fb3", "#00e5ff", "#ffe14d", "#7cff6b", "#b96bff"] as const;

export const ARMORED_HEX = 0x8fb3e6;
export const SOLID_HEX = 0x3a4152;

/** Power-up capsule colors, keyed by power-up type. */
export const POWERUP_HEX: Record<string, number> = {
  expand: 0x00e5ff,
  multiball: 0xff2fb3,
  slow: 0xffe14d,
  life: 0x7cff6b,
};
