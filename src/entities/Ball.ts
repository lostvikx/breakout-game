import Phaser from "phaser";
import { BALL, PADDLE } from "../config";
import { enforceMinVertical, paddleBounceVelocity } from "../systems/angle";

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
  /** Last non-zero travel direction — used to self-heal zeroed velocities. */
  private lastDir = new Phaser.Math.Vector2(0, -1);

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
    this.lastDir.set(v.vx, v.vy).normalize();
    this.onPaddle = false;
  }

  /** Called after a paddle bounce: steers the ball by hit position and ramps speed. */
  bounceOffPaddle(hitOffset: number): void {
    this.speed = Math.min(BALL.SPEED_MAX, this.speed + BALL.SPEED_INC);
    const v = paddleBounceVelocity(hitOffset, this.speed);
    this.setVelocity(v.vx, v.vy);
    this.lastDir.set(v.vx, v.vy).normalize();
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
   * Re-normalizes velocity magnitude to `speed` (× slowFactor), steepens
   * nearly-horizontal trajectories so the ball can never crawl sideways, and
   * self-heals a zeroed velocity (deep overlap can stop the body) by reusing
   * the last travel direction.
   */
  syncVelocity(slowFactor: number): void {
    if (this.onPaddle) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const v = body.velocity;
    const target = this.speed * slowFactor;

    if (v.length() < 1) {
      this.setVelocity(this.lastDir.x * target, this.lastDir.y * target);
      return;
    }

    this.lastDir.copy(v).normalize();
    const out = enforceMinVertical(v.x, v.y, target, BALL.MIN_VERTICAL);
    this.setVelocity(out.vx, out.vy);
  }
}
