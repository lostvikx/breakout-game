/**
 * The four handcrafted levels of increasing shape complexity.
 * Legend: '.' empty · 1-5 colored bricks · 'A' armored (2 hits) · 'X' solid.
 * Row width must be exactly BRICK.COLS characters.
 */

export const LEVELS: string[] = [
  // 1 — warm-up rainbow rows
  [
    "1111111111111",
    "2222222222222",
    "3333333333333",
    "4444444444444",
    "5555555555555",
  ].join("\n"),

  // 2 — checkerboards introduce armored bricks
  [
    "1A.1A.1A.1A.1",
    ".22222222222.",
    "3A3A3A3A3A3A3",
    ".44444444444.",
    "5A5.5A5.5A5.5",
  ].join("\n"),

  // 3 — the vault: solids force the ball through narrow gaps
  [
    "...A.A.A.A...",
    ".1X1111111X1.",
    ".2A2A2A2A2A2.",
    "..333333333..",
    ".4A4A4A4A4A4.",
    "....55555....",
  ].join("\n"),

  // 4 — fortress: enter through the roof gaps, clean out the core
  [
    "X.A.A.A.A.A.X",
    "X.111111111.X",
    "X.2A2A2A2A2.X",
    "X.333333333.X",
    "X.4A4A4A4A4.X",
    "X.555555555.X",
  ].join("\n"),
];

// Sanity guard so a bad edit to the maps fails the unit tests, not gameplay.
export function assertLevelWidths(levels: string[], expectedCols: number): void {
  for (const map of levels) {
    for (const line of map.split("\n")) {
      if (line.length !== expectedCols) {
        throw new Error(`Level row width ${line.length} != ${expectedCols}: "${line}"`);
      }
    }
  }
}
