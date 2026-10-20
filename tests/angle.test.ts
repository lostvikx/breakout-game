import { describe, expect, it } from "vitest";
import {
  MAX_PADDLE_BOUNCE_DEG,
  clampDirection,
  paddleBounceAngleDeg,
  paddleBounceVelocity,
} from "../src/systems/angle";

describe("paddleBounceAngleDeg", () => {
  it("sends it straight up when hit dead center", () => {
    expect(paddleBounceAngleDeg(0)).toBe(0);
  });

  it("steers fully to the edges at the clamp limit", () => {
    expect(paddleBounceAngleDeg(1)).toBe(MAX_PADDLE_BOUNCE_DEG);
    expect(paddleBounceAngleDeg(-1)).toBe(-MAX_PADDLE_BOUNCE_DEG);
  });

  it("scales linearly in between", () => {
    expect(paddleBounceAngleDeg(0.5)).toBeCloseTo(MAX_PADDLE_BOUNCE_DEG / 2);
    expect(paddleBounceAngleDeg(-0.25)).toBeCloseTo(-MAX_PADDLE_BOUNCE_DEG / 4);
  });

  it("clamps out-of-range offsets instead of producing wild angles", () => {
    expect(paddleBounceAngleDeg(5.2)).toBe(MAX_PADDLE_BOUNCE_DEG);
    expect(paddleBounceAngleDeg(-3)).toBe(-MAX_PADDLE_BOUNCE_DEG);
    expect(paddleBounceAngleDeg(Number.NaN)).toBe(0);
  });
});

describe("paddleBounceVelocity", () => {
  it("always returns exactly the requested speed", () => {
    for (const offset of [-1, -0.5, 0, 0.5, 1, 2, -7]) {
      const { vx, vy } = paddleBounceVelocity(offset, 400);
      expect(Math.hypot(vx, vy)).toBeCloseTo(400, 5);
    }
  });

  it("always launches the ball upwards", () => {
    for (const offset of [-1, -0.2, 0, 0.2, 1]) {
      expect(paddleBounceVelocity(offset, 500).vy).toBeLessThan(0);
    }
  });

  it("aims left for left-side hits and right for right-side hits", () => {
    expect(paddleBounceVelocity(-1, 400).vx).toBeLessThan(0);
    expect(paddleBounceVelocity(1, 400).vx).toBeGreaterThan(0);
  });

  it("goes straight up at the center (vx=0, vy=-speed)", () => {
    const { vx, vy } = paddleBounceVelocity(0, 400);
    expect(vx).toBeCloseTo(0, 6);
    expect(vy).toBeCloseTo(-400, 5);
  });

  it("never goes steeper than the clamp allows", () => {
    const { vx, vy } = paddleBounceVelocity(1, 400);
    const angleFromVertical = Math.abs(Math.atan2(vx, -vy));
    expect(angleFromVertical).toBeLessThanOrEqual((MAX_PADDLE_BOUNCE_DEG * Math.PI) / 180 + 1e-9);
  });
});

describe("clampDirection", () => {
  it("returns a unit vector unchanged when within the limit", () => {
    const v = clampDirection(1, -1);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(1, 6);
    expect(v.vx).toBeGreaterThan(0);
    expect(v.vy).toBeLessThan(0);
  });

  it("steepens a near-horizontal direction to the angle limit", () => {
    const v = clampDirection(10, -1);
    const angleFromVertical = Math.atan2(Math.abs(v.vx), Math.abs(v.vy));
    expect(angleFromVertical).toBeCloseTo((MAX_PADDLE_BOUNCE_DEG * Math.PI) / 180, 6);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(1, 6);
  });

  it("preserves the sign of each component when clamping", () => {
    const v = clampDirection(-10, -1);
    expect(v.vx).toBeLessThan(0);
    expect(v.vy).toBeLessThan(0);
  });

  it("falls back to straight up for a zero vector", () => {
    expect(clampDirection(0, 0)).toEqual({ vx: 0, vy: -1 });
  });
});
