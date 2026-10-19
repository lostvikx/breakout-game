/**
 * Power-up logic. Pure module — no Phaser imports so it can be unit tested.
 *
 * expand / multiball / slow / life — multiball and life are instant effects,
 * expand and slow are timed and tracked by EffectTracker.
 */

export const POWERUP_TYPES = ["expand", "multiball", "slow", "life"] as const;
export type PowerUpType = (typeof POWERUP_TYPES)[number];

export type TimedPowerUpType = Extract<PowerUpType, "expand" | "slow">;

export const POWERUP_WEIGHTS: Record<PowerUpType, number> = {
  expand: 0.3,
  multiball: 0.3,
  slow: 0.3,
  life: 0.1,
};

export const POWERUP_DURATIONS: Record<TimedPowerUpType, number> = {
  expand: 10_000,
  slow: 8_000,
};

export const DEFAULT_DROP_CHANCE = 0.12;

/** True when a destroyed brick should drop a capsule. */
export function shouldDrop(rng: () => number, chance: number = DEFAULT_DROP_CHANCE): boolean {
  return rng() < chance;
}

/** Weighted random power-up selection. */
export function pickPowerUp(rng: () => number): PowerUpType {
  let roll = rng();
  for (const type of POWERUP_TYPES) {
    roll -= POWERUP_WEIGHTS[type];
    if (roll < 0) return type;
  }
  return POWERUP_TYPES[POWERUP_TYPES.length - 1];
}

export interface EffectTimer {
  type: TimedPowerUpType;
  /** Monotonic milliseconds when the effect expires. */
  endsAt: number;
  duration: number;
}

/**
 * Tracks active timed effects. Times are supplied by the caller (game time in
 * ms) so the tracker itself stays deterministic and testable.
 */
export class EffectTracker {
  private readonly timers = new Map<TimedPowerUpType, EffectTimer>();

  /** Activates (or restarts) a timed effect. Returns its expiry time. */
  activate(type: TimedPowerUpType, now: number, duration: number): number {
    const endsAt = now + duration;
    this.timers.set(type, { type, endsAt, duration });
    return endsAt;
  }

  /** Drops expired effects; returns the ones that just expired. */
  expire(now: number): EffectTimer[] {
    const expired: EffectTimer[] = [];
    for (const timer of this.timers.values()) {
      if (now >= timer.endsAt) {
        expired.push(timer);
        this.timers.delete(timer.type);
      }
    }
    return expired;
  }

  isActive(type: TimedPowerUpType, now: number): boolean {
    const timer = this.timers.get(type);
    return timer !== undefined && now < timer.endsAt;
  }

  /** Remaining fraction (0..1) of every active effect, for HUD bars. */
  remainRatio(now: number): { type: TimedPowerUpType; ratio: number }[] {
    return [...this.timers.values()]
      .map((timer) => ({ type: timer.type, ratio: Math.max(0, (timer.endsAt - now) / timer.duration) }))
      .sort((a, b) => a.type.localeCompare(b.type));
  }

  clear(): void {
    this.timers.clear();
  }
}
