import { describe, expect, it } from "vitest";
import { MAX_PADDLE_BOUNCE_DEG, paddleBounceAngleDeg, paddleBounceVelocity } from "../src/systems/angle";

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

  it("never goes steeper than the clamp allows (75 deg from vertical)", () => {
    const { vx, vy } = paddleBounceVelocity(1, 400);
    const angleFromVertical = Math.abs(Math.atan2(vx, -vy));
    expect(angleFromVertical).toBeLessThanOrEqual((MAX_PADDLE_BOUNCE_DEG * Math.PI) / 180 + 1e-9);
  });
});
