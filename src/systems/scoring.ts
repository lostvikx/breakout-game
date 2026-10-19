/**
 * Scoring rules. Pure module — no Phaser imports so it can be unit tested.
 * Points come only from bricks.
 */

import type { BrickKind } from "./levelLoader";

export function pointsFor(kind: BrickKind): number {
  switch (kind) {
    case "colored":
      return 100;
    case "armored":
      return 250;
    case "solid":
      return 0;
    default:
      return 0;
  }
}
