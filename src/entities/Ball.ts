import Phaser from "phaser";
import { BALL, GAME, PADDLE } from "../config";
import { clampDirection, paddleBounceVelocity } from "../systems/angle";

/**
 * The ball is moved manually instead of by Arcade Physics. That makes the
 * behaviour fully deterministic: left/right/top walls are hard clamps, and the
 * only way out of the playfield is past the paddle at the bottom.
 *
 * `dirX`/`dirY` is a unit vector; `speed` is the intended magnitude. Slow-mo
 * scales movement at call time without mutating the logical speed.
 */
export class Ball extends Phaser.GameObjects.Image {
  /** Logical target speed; ramps up with each paddle hit. */
  public speed: number = BALL.SPEED_START;
  /** True while sitting on the paddle pre-launch. */
  public onPaddle = false;

  private dirX = 0;
  private dirY = -1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "ball");
    this.setOrigin(0.5, 0.5);
    scene.add.existing(this);
  }

  get vx(): number {
    return this.dirX * this.speed;
  }

  get vy(): number {
    return this.dirY * this.speed;
  }

  /** Sticks to the paddle (pre-launch state). */
  stickTo(paddleX: number): void {
    this.onPaddle = true;
    this.speed = BALL.SPEED_START;
    this.dirX = 0;
    this.dirY = -1;
    this.setPosition(paddleX, PADDLE.Y - PADDLE.H / 2 - BALL.RADIUS - 2);
  }

  /** Launches from the paddle with a slight sideways offset (-1..1). */
  launch(offset: number): void {
    const v = paddleBounceVelocity(offset, this.speed);
    this.setDirection(v.vx, v.vy);
    this.onPaddle = false;
  }

  /** Called after a paddle bounce: steers the ball by hit position and ramps speed. */
  bounceOffPaddle(hitOffset: number): void {
    this.speed = Math.min(BALL.SPEED_MAX, this.speed + BALL.SPEED_INC);
    const v = paddleBounceVelocity(hitOffset, this.speed);
    this.setDirection(v.vx, v.vy);
  }

  /** Splits off at ±angleDeg from the current direction (used by multiball). */
  cloneAtAngle(scene: Phaser.Scene, angleDeg: number): Ball {
    const ball = new Ball(scene, this.x, this.y);
    ball.speed = this.speed;
    const angle = Math.atan2(this.dirY, this.dirX) + Phaser.Math.DegToRad(angleDeg);
    const dir = clampDirection(Math.cos(angle), Math.sin(angle));
    ball.dirX = dir.vx;
    ball.dirY = dir.vy;
    return ball;
  }

  /**
   * Moves one physics sub-step. Left, right and top are hard walls: the ball is
   * clamped inside and the matching direction component is reflected. There is
   * deliberately no bottom wall — falling out is a missed paddle.
   */
  advance(dt: number, speedFactor: number): void {
    if (this.onPaddle) return;

    const distance = this.speed * speedFactor * dt;
    this.x += this.dirX * distance;
    this.y += this.dirY * distance;

    const r = BALL.RADIUS;
    if (this.x - r < 0) {
      this.x = r;
      this.dirX = Math.abs(this.dirX);
    } else if (this.x + r > GAME.W) {
      this.x = GAME.W - r;
      this.dirX = -Math.abs(this.dirX);
    }
    if (this.y - r < 0) {
      this.y = r;
      this.dirY = Math.abs(this.dirY);
    }
  }

  /** Reflects off a vertical surface; `sign` is the push direction (-1 left, +1 right). */
  reflectX(sign: -1 | 1): void {
    this.dirX = sign * Math.abs(this.dirX);
  }

  /** Reflects off a horizontal surface; `sign` is the push direction (-1 up, +1 down). */
  reflectY(sign: -1 | 1): void {
    this.dirY = sign * Math.abs(this.dirY);
  }

  private setDirection(vx: number, vy: number): void {
    const mag = Math.hypot(vx, vy) || 1;
    this.dirX = vx / mag;
    this.dirY = vy / mag;
  }
}
