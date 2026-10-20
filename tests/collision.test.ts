import { describe, expect, it } from "vitest";
import { resolveCircleRect } from "../src/systems/collision";

const R = 8;
// 80x26 brick whose top-left corner sits at (100, 200).
const RECT = { x: 100, y: 200, width: 80, height: 26 };

describe("resolveCircleRect", () => {
  it("returns null when the ball is clear of the rectangle", () => {
    expect(resolveCircleRect(50, 100, R, RECT)).toBeNull();
    expect(resolveCircleRect(300, 100, R, RECT)).toBeNull();
    expect(resolveCircleRect(140, 400, R, RECT)).toBeNull();
  });

  it("pushes a ball descending onto the top edge back up", () => {
    const hit = resolveCircleRect(140, 200 - R + 2, R, RECT);
    expect(hit).toEqual({ axis: "y", sign: -1, depth: 2 });
  });

  it("pushes a ball rising into the bottom edge back down", () => {
    const hit = resolveCircleRect(140, 200 + 26 + R - 3, R, RECT);
    expect(hit?.axis).toBe("y");
    expect(hit?.sign).toBe(1);
    expect(hit?.depth).toBeCloseTo(3);
  });

  it("pushes a ball hitting the left edge out to the left", () => {
    const hit = resolveCircleRect(100 - R + 4, 213, R, RECT);
    expect(hit).toEqual({ axis: "x", sign: -1, depth: 4 });
  });

  it("pushes a ball hitting the right edge out to the right", () => {
    const hit = resolveCircleRect(180 + R - 5, 213, R, RECT);
    expect(hit?.axis).toBe("x");
    expect(hit?.sign).toBe(1);
    expect(hit?.depth).toBeCloseTo(5);
  });

  it("resolves a ball that starts inside the rectangle along the shallowest axis", () => {
    const hit = resolveCircleRect(140, 205, R, RECT);
    expect(hit?.axis).toBe("y");
    expect(hit?.sign).toBe(-1);
  });

  it("reports a non-negative depth so the ball is always pushed out", () => {
    for (const [cx, cy] of [
      [92, 192],
      [188, 192],
      [92, 234],
      [188, 234],
      [140, 213],
    ]) {
      const hit = resolveCircleRect(cx, cy, R, RECT);
      if (hit) expect(hit.depth).toBeGreaterThanOrEqual(0);
    }
  });
});
