/**
 * Level map parsing. Pure module — no Phaser imports so it can be unit tested.
 *
 * Levels are ASCII grids, one character per tile:
 *   '.' empty
 *   '1'..'5' single-hit colored brick (palette index)
 *   'A' armored brick (2 hits)
 *   'X' solid, indestructible brick
 */

export type BrickKind = "colored" | "armored" | "solid" | "empty";

export interface BrickCell {
  kind: BrickKind;
  colorIndex?: number;
}

export interface ParsedLevel {
  rows: (BrickCell | null)[][];
  cols: number;
  destructibleCount: number;
}

const LEGEND: Record<string, () => BrickCell | null> = {
  ".": () => null,
  A: () => ({ kind: "armored" }),
  X: () => ({ kind: "solid" }),
};

for (let i = 1; i <= 5; i++) {
  LEGEND[String(i)] = () => ({ kind: "colored", colorIndex: i });
}

export function isBrickKind(key: string): key is keyof typeof LEGEND {
  return key in LEGEND;
}

/** Parses an ASCII level map. Throws on blank maps or mismatched row lengths. */
export function parseLevel(map: string): ParsedLevel {
  const rawRows = map
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  if (rawRows.length === 0) {
    throw new Error("Level map is empty");
  }

  const cols = rawRows[0].length;
  let destructibleCount = 0;
  const rows = rawRows.map((line, index) => {
    if (line.length !== cols) {
      throw new Error(`Level row ${index} has width ${line.length}, expected ${cols}`);
    }
    return [...line].map((char) => {
      if (!isBrickKind(char)) {
        throw new Error(`Unknown level character: '${char}'`);
      }
      const cell = LEGEND[char]();
      if (cell && (cell.kind === "colored" || cell.kind === "armored")) {
        destructibleCount++;
      }
      return cell;
    });
  });

  if (destructibleCount === 0) {
    throw new Error("Level has no destructible bricks — it can never be cleared");
  }

  return { rows, cols, destructibleCount };
}
