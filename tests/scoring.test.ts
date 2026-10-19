import { describe, expect, it } from "vitest";
import { pointsFor } from "../src/systems/scoring";

describe("pointsFor", () => {
  it("awards 100 for a one-hit colored brick", () => {
    expect(pointsFor("colored")).toBe(100);
  });

  it("awards 250 for destroying an armored brick", () => {
    expect(pointsFor("armored")).toBe(250);
  });

  it("awards nothing for solid bricks", () => {
    expect(pointsFor("solid")).toBe(0);
    expect(pointsFor("empty")).toBe(0);
  });
});
