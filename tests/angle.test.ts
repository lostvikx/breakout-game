import { describe, expect, it } from "vitest";
import {
  MAX_PADDLE_BOUNCE_DEG,
  enforceMinVertical,
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

  it("never goes steeper than the clamp allows (75 deg from vertical)", () => {
    const { vx, vy } = paddleBounceVelocity(1, 400);
    const angleFromVertical = Math.abs(Math.atan2(vx, -vy));
    expect(angleFromVertical).toBeLessThanOrEqual((MAX_PADDLE_BOUNCE_DEG * Math.PI) / 180 + 1e-9);
  });
});

describe("enforceMinVertical", () => {
  const SPEED = 380;
  const MIN_VY = 110;

  it("leaves already-steep velocities at full magnitude", () => {
    const v = enforceMinVertical(100, -360, SPEED, MIN_VY);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(SPEED, 5);
    expect(v.vy).toBeLessThan(0);
  });

  it("steepens a near-horizontal ball to the minimum vertical speed", () => {
    const v = enforceMinVertical(379, 10, SPEED, MIN_VY);
    expect(Math.abs(v.vy)).toBeGreaterThanOrEqual(MIN_VY - 1e-9);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(SPEED, 5);
    expect(v.vx).toBeGreaterThan(0); // keeps moving right
    expect(v.vy).toBeGreaterThan(0); // keeps moving down
  });

  it("preserves direction signs when steepening", () => {
    const v = enforceMinVertical(-300, -50, SPEED, MIN_VY);
    expect(v.vx).toBeLessThan(0);
    expect(v.vy).toBeLessThan(0);
  });

  it("pushes a horizontal ball downward (back toward the paddle)", () => {
    const v = enforceMinVertical(380, 0, SPEED, MIN_VY);
    expect(v.vy).toBe(MIN_VY);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(SPEED, 5);
  });

  it("normalizes an over-fast vector back down to speed", () => {
    const v = enforceMinVertical(600, 600, SPEED, MIN_VY);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(SPEED, 5);
  });

  it("normalizes an under-fast vector back up to speed (no stuck-slow balls)", () => {
    const v = enforceMinVertical(50, 30, SPEED, MIN_VY);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(SPEED, 5);
    expect(Math.abs(v.vy)).toBeGreaterThanOrEqual(MIN_VY - 1e-9);
  });

  it("returns tiny/zero vectors untouched (pre-launch state)", () => {
    expect(enforceMinVertical(0, 0, SPEED, MIN_VY)).toEqual({ vx: 0, vy: 0 });
  });
});
