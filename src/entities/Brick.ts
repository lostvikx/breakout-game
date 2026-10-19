import Phaser from "phaser";
import type { BrickCell } from "../systems/levelLoader";
import { pointsFor } from "../systems/scoring";

export type BrickHitResult = "destroyed" | "cracked" | "solid";

/**
 * A single brick. One-hit bricks have health 1, armored 2, solid is
 * indestructible. Texture key is baked in by the BootScene ("brick-<n>",
 * "brick-armored", "brick-solid").
 */
export class Brick extends Phaser.Physics.Arcade.Sprite {
  public readonly kind: "colored" | "armored" | "solid";
  public readonly colorIndex: number;
  /** Points awarded when fully destroyed (solid bricks: 0). */
  public readonly points: number;
  private health: number;

  constructor(scene: Phaser.Scene, x: number, y: number, cell: BrickCell) {
    let texture = "brick-solid";
    let health = 1;
    let colorIndex = 0;

    if (cell.kind === "colored") {
      texture = `brick-${cell.colorIndex}`;
    } else if (cell.kind === "armored") {
      texture = "brick-armored";
      health = 2;
    }
    if (cell.kind === "colored" && cell.colorIndex) {
      colorIndex = cell.colorIndex;
    }

    super(scene, x, y, texture);
    // BrickCell is only ever "empty" inside parsed rows, never when constructing a Brick.
    this.kind = cell.kind as "colored" | "armored" | "solid";
    this.colorIndex = colorIndex;
    this.health = health;
    this.points = pointsFor(cell.kind);

    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
  }

  /** Applies one hit. Solid bricks just thud. */
  hit(): BrickHitResult {
    if (this.kind === "solid") return "solid";
    this.health--;
    if (this.health <= 0) return "destroyed";
    // Cracked armored bricks darken.
    this.setTint(0x9aa8c8);
    return "cracked";
  }
}
