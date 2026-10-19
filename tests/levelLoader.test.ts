import { describe, expect, it } from "vitest";
import { LEVELS, assertLevelWidths } from "../src/levels";
import { parseLevel } from "../src/systems/levelLoader";
import { BRICK } from "../src/config";

describe("parseLevel", () => {
  it("parses colored cells with their palette index", () => {
    const parsed = parseLevel("1.3");
    expect(parsed.rows[0][0]).toEqual({ kind: "colored", colorIndex: 1 });
    expect(parsed.rows[0][1]).toBe(null);
    expect(parsed.rows[0][2]).toEqual({ kind: "colored", colorIndex: 3 });
  });

  it("parses armored and solid bricks", () => {
    const parsed = parseLevel("AX");
    expect(parsed.rows[0][0]).toEqual({ kind: "armored" });
    expect(parsed.rows[0][1]).toEqual({ kind: "solid" });
  });

  it("counts only destructible bricks", () => {
    expect(parseLevel("1.3X").destructibleCount).toBe(2);
  });

  it("throws on empty maps", () => {
    expect(() => parseLevel("\n  \n")).toThrow(/empty/i);
  });

  it("throws on mismatched row widths", () => {
    expect(() => parseLevel("111\n11")).toThrow(/width/i);
  });

  it("throws on unknown characters", () => {
    expect(() => parseLevel("1?1")).toThrow(/Unknown level character/);
  });

  it("throws when a level can never be cleared", () => {
    expect(() => parseLevel("XXX\nXXX")).toThrow(/never be cleared/);
  });
});

describe("shipped levels", () => {
  it("are exactly BRICK.COLS wide per row", () => {
    expect(() => assertLevelWidths(LEVELS, BRICK.COLS)).not.toThrow();
  });

  it("parse cleanly and are clearable", () => {
    LEVELS.forEach((map, i) => {
      const parsed = parseLevel(map);
      expect(parsed.destructibleCount).toBeGreaterThan(0);
      expect(parsed.rows.length).toBeGreaterThan(0);
      expect(parsed.rows.length).toBeLessThanOrEqual(8);
      expect(i + 1).toBeLessThanOrEqual(4);
    });
  });
});
