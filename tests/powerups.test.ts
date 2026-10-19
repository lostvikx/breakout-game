import { describe, expect, it } from "vitest";
import {
  DEFAULT_DROP_CHANCE,
  EffectTracker,
  POWERUP_DURATIONS,
  POWERUP_TYPES,
  pickPowerUp,
  shouldDrop,
} from "../src/systems/powerups";

const sequenceRng = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe("shouldDrop", () => {
  it("drops below the threshold and not above it", () => {
    expect(shouldDrop(sequenceRng(0.11), DEFAULT_DROP_CHANCE)).toBe(true);
    expect(shouldDrop(sequenceRng(0.12), DEFAULT_DROP_CHANCE)).toBe(false);
    expect(shouldDrop(sequenceRng(0.9), DEFAULT_DROP_CHANCE)).toBe(false);
  });

  it("respects a custom chance of zero", () => {
    expect(shouldDrop(sequenceRng(0.01), 0)).toBe(false);
  });
});

describe("pickPowerUp", () => {
  it("always returns a known power-up type", () => {
    const rng = () => Math.random();
    for (let i = 0; i < 200; i++) {
      expect(POWERUP_TYPES).toContain(pickPowerUp(rng));
    }
  });

  it("is deterministic for a fixed rng", () => {
    const rng = sequenceRng(0.99); // beyond all weights → falls to the last type (life)
    expect(pickPowerUp(rng)).toBe("life");
  });

  it("respects weight boundaries", () => {
    expect(pickPowerUp(sequenceRng(0.0))).toBe("expand");
    expect(pickPowerUp(sequenceRng(0.31))).toBe("multiball");
    expect(pickPowerUp(sequenceRng(0.61))).toBe("slow");
  });
});

describe("EffectTracker", () => {
  it("activates and expires timed effects", () => {
    const tracker = new EffectTracker();
    expect(tracker.isActive("expand", 1000)).toBe(false);

    tracker.activate("expand", 1000, POWERUP_DURATIONS.expand);
    expect(tracker.isActive("expand", 10999)).toBe(true);
    expect(tracker.isActive("expand", 11000)).toBe(false);
    const expired = tracker.expire(11000);
    expect(expired).toHaveLength(1);
    expect(expired[0].type).toBe("expand");
    expect(tracker.isActive("expand", 11001)).toBe(false);
  });

  it("restarts the timer when re-activated while running", () => {
    const tracker = new EffectTracker();
    tracker.activate("slow", 0, 8000);
    tracker.activate("slow", 5000, 8000);
    expect(tracker.isActive("slow", 12000)).toBe(true);
    expect(tracker.isActive("slow", 12999)).toBe(true);
  });

  it("reports remaining ratios between 0 and 1 for the HUD", () => {
    const tracker = new EffectTracker();
    tracker.activate("expand", 0, 10000);
    tracker.activate("slow", 0, 8000);

    const ratios = tracker.remainRatio(4000);
    expect(ratios).toHaveLength(2);
    for (const { ratio, type } of ratios) {
      expect(ratio).toBeGreaterThan(0);
      expect(ratio).toBeLessThanOrEqual(1);
      expect(["expand", "slow"]).toContain(type);
    }

    // Fully expired effects collapse to 0 and are gone after expire().
    expect(tracker.remainRatio(20000).every((r) => r.ratio === 0)).toBe(true);
    tracker.expire(20000);
    expect(tracker.remainRatio(20000)).toHaveLength(0);
  });

  it("clear() removes everything", () => {
    const tracker = new EffectTracker();
    tracker.activate("slow", 0, 8000);
    tracker.clear();
    expect(tracker.remainRatio(100)).toHaveLength(0);
  });
});
