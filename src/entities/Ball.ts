import Phaser from "phaser";
import { BALL, PADDLE } from "../config";
import { paddleBounceVelocity } from "../systems/angle";

/**
 * The ball. Keeps its own logical speed (target magnitude); the actual body
 * velocity is re-synced from direction each frame so timers like slow-mo can
 * scale it globally without fighting collision response.
 */
export class Ball extends Phaser.Physics.Arcade.Image {
  /** Logical target speed; ramps up with each paddle hit. */
  public speed: number = BALL.SPEED_START;
  /** True while sitting on the paddle pre-launch. */
  public onPaddle = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "ball");
    this.setOrigin(0.5, 0.5);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(BALL.RADIUS, -BALL.RADIUS, -BALL.RADIUS);
    body.setBounce(1, 1);
    body.setCollideWorldBounds(true);
    body.onWorldBounds = false;
  }

  /** Sticks to the paddle (pre-launch state). */
  stickTo(paddleX: number): void {
    this.onPaddle = true;
    this.speed = BALL.SPEED_START;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.reset(paddleX, PADDLE.Y - PADDLE.H / 2 - BALL.RADIUS - 2);
    body.stop();
  }

  /** Launches from the paddle with a slight random-ish sideways offset (-1..1). */
  launch(offset: number): void {
    const v = paddleBounceVelocity(offset, this.speed);
    this.setVelocity(v.vx, v.vy);
    this.onPaddle = false;
  }

  /** Called after a paddle bounce: steers the ball by hit position and ramps speed. */
  bounceOffPaddle(hitOffset: number): void {
    this.speed = Math.min(BALL.SPEED_MAX, this.speed + BALL.SPEED_INC);
    const v = paddleBounceVelocity(hitOffset, this.speed);
    this.setVelocity(v.vx, v.vy);
  }

  /** Splits off at ±angleDeg from the current direction (used by multiball). */
  cloneAtAngle(scene: Phaser.Scene, angleDeg: number): Ball {
    const ball = new Ball(scene, this.x, this.y);
    ball.speed = this.speed;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const angle = Math.atan2(body.velocity.y, body.velocity.x) + Phaser.Math.DegToRad(angleDeg);
    ball.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
    return ball;
  }

  /**
   * Re-normalizes velocity magnitude to `speed` (× slowFactor) and nudges
   * nearly-horizontal trajectories back into play.
   */
  syncVelocity(slowFactor: number): void {
    if (this.onPaddle) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.length() < 1) return;

    let vy = body.velocity.y;
    if (Math.abs(vy) < BALL.MIN_VERTICAL) {
      vy = Math.sign(vy || 1) * BALL.MIN_VERTICAL;
    }
    const angle = Math.atan2(vy, body.velocity.x);
    this.setVelocity(Math.cos(angle) * this.speed * slowFactor, Math.sin(angle) * this.speed * slowFactor);
  }
}
