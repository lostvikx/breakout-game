import Phaser from "phaser";
import { PADDLE } from "../config";

/**
 * The player-controlled paddle. Movement is handled by the owning scene's
 * update loop; this class owns shape/state switching between normal and wide.
 */
export class Paddle extends Phaser.Physics.Arcade.Image {
  private wide = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "paddle");
    this.setOrigin(0.5, 0.5);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setImmovable(true);
    this.setCollideWorldBounds(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(PADDLE.W, PADDLE.H);
  }

  isWide(): boolean {
    return this.wide;
  }

  setWide(on: boolean): void {
    if (this.wide === on) return;
    this.wide = on;
    this.setTexture(on ? "paddle-wide" : "paddle");
    const w = on ? PADDLE.WIDE : PADDLE.W;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(w, PADDLE.H);
  }

  /** Logical width used for collision, unaffected by cosmetic squash tweens. */
  physicsWidth(): number {
    return this.wide ? PADDLE.WIDE : PADDLE.W;
  }

  /** Full-width hit position of a ball relative to the paddle center, in -1..1. */
  hitOffsetFor(ballX: number): number {
    const halfW = this.physicsWidth() / 2;
    return Phaser.Math.Clamp((ballX - this.x) / (halfW || 1), -1, 1);
  }
}
