import Phaser from "phaser";
import { BRICK, GAME, PADDLE, RULES } from "../config";
import { ARMORED_HEX, NEON_HEX } from "../palette";
import { Ball } from "../entities/Ball";
import { Brick } from "../entities/Brick";
import { Paddle } from "../entities/Paddle";
import { LEVELS } from "../levels";
import { audio } from "../systems/audio";
import { parseLevel } from "../systems/levelLoader";
import { EffectTracker, POWERUP_DURATIONS, pickPowerUp, shouldDrop, type PowerUpType } from "../systems/powerups";

type GameState = "ready" | "playing" | "clearing" | "won" | "over";

/**
 * The main gameplay scene: paddle + ball physics, brick collisions, power-up
 * capsules, particles, lives, level flow and end-of-game overlays.
 */
export class GameScene extends Phaser.Scene {
  private paddle!: Paddle;
  private balls: Ball[] = [];
  private ballGroup!: Phaser.Physics.Arcade.Group;
  private brickGroup!: Phaser.Physics.Arcade.StaticGroup;
  private capsuleGroup!: Phaser.Physics.Arcade.Group;

  private score = 0;
  private lives: number = RULES.LIVES_START;
  private levelIndex = 0;
  private state: GameState = "ready";
  private bricksRemaining = 0;
  private effects = new EffectTracker();
  private burstEmitters = new Map<number, Phaser.GameObjects.Particles.ParticleEmitter>();
  private overlay: Phaser.GameObjects.Container | null = null;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private space!: Phaser.Input.Keyboard.Key;

  constructor() {
    super("game");
  }

  create(): void {
    this.score = 0;
    this.lives = RULES.LIVES_START;
    this.levelIndex = 0;
    this.state = "ready";
    this.effects.clear();
    this.balls = [];

    // Bounce off top/left/right walls; the bottom is open (losing the ball).
    this.physics.world.setBoundsCollision(true, true, true, false);

    this.buildPlayfield();
    this.paddle = new Paddle(this, GAME.W / 2, PADDLE.Y);
    this.ballGroup = this.physics.add.group();
    this.brickGroup = this.physics.add.staticGroup();
    this.capsuleGroup = this.physics.add.group();

    this.setupColliders();
    this.setupInput();
    this.buildLevel(0);
    this.spawnBall();
    this.scene.launch("hud");

    this.registry.set("hud", this.hudState());
    this.registry.set("effects", []);
  }

  // --- construction ----------------------------------------------------------------

  private buildPlayfield(): void {
    this.add.rectangle(GAME.W / 2, GAME.H / 2, GAME.W, GAME.H, 0x0d0d1f).setDepth(-10);

    // CRT scanlines + vignette on top of the action.
    this.add
      .tileSprite(0, 0, GAME.W, GAME.H, "scanline")
      .setOrigin(0)
      .setDepth(50)
      .setAlpha(0.55);
    this.add.image(GAME.W / 2, GAME.H / 2, "vignette").setDepth(51);
  }

  private setupColliders(): void {
    // Numbers in callbacks follow the registration order: (obj1, obj2).
    this.physics.add.collider(this.ballGroup, this.paddle, (ballObj, paddleObj) => {
      this.onPaddleHit(ballObj as Ball, paddleObj as Paddle);
    });
    this.physics.add.collider(this.ballGroup, this.brickGroup, (ballObj, brickObj) => {
      this.onBrickHit(ballObj as Ball, brickObj as Brick);
    });
    // Capsules bounce off bricks on the way down (an extra bit of chaos).
    this.physics.add.collider(this.capsuleGroup, this.brickGroup);
    // Instead of a hard bounce, catching capsules uses overlap.
    this.physics.add.overlap(this.paddle, this.capsuleGroup, (paddleObj, capObj) => {
      this.collectCapsule(
        capObj as Phaser.Physics.Arcade.Image & { powerType: PowerUpType },
        paddleObj as Paddle,
      );
    });
  }

  private setupInput(): void {
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.space = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  // --- level management ------------------------------------------------------------

  private buildLevel(index: number): void {
    this.brickGroup.clear(true, true);
    this.bricksRemaining = 0;

    const parsed = parseLevel(LEVELS[index]);
    for (let r = 0; r < parsed.rows.length; r++) {
      for (let c = 0; c < parsed.cols; c++) {
        const cell = parsed.rows[r][c];
        if (!cell) continue;
        const x = BRICK.LEFT + c * BRICK.PITCH_X + BRICK.W / 2;
        const y = BRICK.TOP + r * BRICK.PITCH_Y + BRICK.H / 2;
        const brick = new Brick(this, x, y, cell);
        this.brickGroup.add(brick, true);
        if (cell.kind !== "solid") this.bricksRemaining++;
      }
    }
  }

  private spawnBall(): void {
    const ball = new Ball(this, this.paddle.x, PADDLE.Y - 20);
    ball.stickTo(this.paddle.x);
    this.ballGroup.add(ball);
    this.balls.push(ball);
    this.addBallTrail(ball);
  }

  private addBallTrail(ball: Ball): void {
    const emitter = this.add.particles(0, 0, "spark", {
      follow: ball,
      lifespan: 320,
      speed: { min: 2, max: 24 },
      scale: { start: 0.65, end: 0 },
      alpha: { start: 0.55, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      frequency: 32,
      tint: 0x8de1ff,
    });
    emitter.setDepth(2);
    ball.once(Phaser.GameObjects.Events.DESTROY, () => emitter.destroy());
  }

  // --- collisions ------------------------------------------------------------------

  private onPaddleHit(ball: Ball, paddle: Paddle): void {
    if (ball.onPaddle) return;
    const body = ball.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.y <= 0) return; // already moving up — ignore contact

    ball.bounceOffPaddle(paddle.hitOffsetFor(ball.x));
    audio.paddle();

    // Squash-and-stretch pulse on the paddle.
    paddle.setScale(1.05, 1.1);
    this.tweens.add({ targets: paddle, scaleX: 1, scaleY: 1, duration: 130, ease: "Quad.easeOut" });
  }

  private onBrickHit(_ball: Ball, brick: Brick): void {
    const result = brick.hit();
    const cx = brick.x;
    const cy = brick.y;

    switch (result) {
      case "destroyed": {
        const color = brick.kind === "colored" ? NEON_HEX[brick.colorIndex - 1] : ARMORED_HEX;
        this.score += brick.points;
        this.burst(cx, cy, color, 18);
        audio.brickBreak(brick.colorIndex || 1);
        brick.destroy();
        this.bricksRemaining--;
        if (shouldDrop(Math.random) && this.state === "playing") this.spawnCapsule(cx, cy);
        if (this.bricksRemaining <= 0) this.levelCleared();
        break;
      }
      case "cracked": {
        audio.brickHit(brick.colorIndex || 1);
        this.burst(cx, cy, ARMORED_HEX, 6);
        this.tweens.add({ targets: brick, scaleY: 0.82, duration: 55, yoyo: true });
        break;
      }
      case "solid": {
        audio.thud();
        break;
      }
    }
  }

  private burst(x: number, y: number, color: number, count: number): void {
    let emitter = this.burstEmitters.get(color);
    if (!emitter) {
      emitter = this.add.particles(0, 0, "spark", {
        lifespan: 520,
        speed: { min: 40, max: 240 },
        scale: { start: 0.9, end: 0 },
        emitting: false,
        blendMode: Phaser.BlendModes.ADD,
        tint: color,
      });
      emitter.setDepth(5);
      this.burstEmitters.set(color, emitter);
    }
    emitter.explode(count, x, y);
  }

  // --- power-ups -------------------------------------------------------------------

  private spawnCapsule(x: number, y: number): void {
    const type = pickPowerUp(Math.random);
    const cap = this.physics.add.image(x, y, `cap-${type}`) as Phaser.Physics.Arcade.Image & {
      powerType: PowerUpType;
    };
    cap.powerType = type;
    cap.setVelocity(Phaser.Math.Between(-30, 30), 140);
    cap.setBounce(1, 0);
    cap.setCollideWorldBounds(true);
    this.capsuleGroup.add(cap);
    this.tweens.add({ targets: cap, angle: { from: -7, to: 7 }, duration: 480, yoyo: true, repeat: -1 });
  }

  private collectCapsule(
    cap: Phaser.Physics.Arcade.Image & { powerType: PowerUpType },
    _paddle: Paddle,
  ): void {
    const type = cap.powerType;
    cap.destroy();
    audio.powerup();

    switch (type) {
      case "expand": {
        this.paddle.setWide(true);
        this.effects.activate("expand", this.time.now, POWERUP_DURATIONS.expand);
        break;
      }
      case "multiball":
        this.multiball();
        break;
      case "slow":
        this.effects.activate("slow", this.time.now, POWERUP_DURATIONS.slow);
        break;
      case "life":
        this.lives = Math.min(RULES.LIVES_MAX, this.lives + 1);
        break;
    }
  }

  private multiball(): void {
    const source = this.balls.find((b) => !b.onPaddle);
    if (!source) return;
    for (const angleDeg of [26, -26]) {
      const clone = source.cloneAtAngle(this, angleDeg);
      this.ballGroup.add(clone);
      this.balls.push(clone);
      this.addBallTrail(clone);
    }
  }

  // --- update loop -------------------------------------------------------------------

  update(_time: number, _delta: number): void {
    const now = this.time.now;

    this.updatePaddle();
    this.updateBalls();
    this.updateCapsules();

    for (const expired of this.effects.expire(now)) {
      if (expired.type === "expand") this.paddle.setWide(false);
    }

    this.registry.set("hud", this.hudState());
    this.registry.set("effects", this.effects.remainRatio(now));
  }

  private updatePaddle(): void {
    const left = this.cursors.left.isDown || this.keyA.isDown;
    const right = this.cursors.right.isDown || this.keyD.isDown;
    const body = this.paddle.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(left ? -PADDLE.SPEED : right ? PADDLE.SPEED : 0);

    for (const ball of this.balls) {
      if (ball.onPaddle) ball.stickTo(this.paddle.x);
    }

    if (Phaser.Input.Keyboard.JustDown(this.space)) {
      if (this.state === "ready") {
        this.state = "playing";
        for (const ball of this.balls) {
          if (ball.onPaddle) ball.launch(Phaser.Math.FloatBetween(-0.35, 0.35));
        }
      } else if (this.state === "over" || this.state === "won") {
        this.hideOverlay();
        this.scene.restart();
      }
    }
  }

  private updateBalls(): void {
    const slowFactor = this.effects.isActive("slow", this.time.now) ? 0.65 : 1;

    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      if (!ball.onPaddle) ball.syncVelocity(slowFactor);

      if (ball.y > GAME.H + 40) {
        this.balls.splice(i, 1);
        ball.destroy();
        if (this.balls.length === 0) this.loseLife();
      }
    }
  }

  private updateCapsules(): void {
    const caps = this.capsuleGroup.children.getArray() as (Phaser.Physics.Arcade.Image & {
      powerType: PowerUpType;
    })[];
    for (const cap of caps) {
      if (cap.y > GAME.H + 30) cap.destroy();
    }
  }

  // --- game flow -----------------------------------------------------------------

  private loseLife(): void {
    this.lives--;
    this.cameras.main.shake(260, 0.008);
    audio.loseBall();
    if (this.lives <= 0) {
      this.gameOver();
      return;
    }
    this.spawnBall();
  }

  private levelCleared(): void {
    if (this.state !== "playing") return;
    this.state = "clearing";
    audio.levelClear();

    const isLast = this.levelIndex >= LEVELS.length - 1;
    const message = isLast ? "ALL LEVELS CLEARED!" : `LEVEL ${this.levelIndex + 1} CLEARED!`;
    this.showOverlay(message, isLast ? 0x7cff6b : 0x00e5ff, isLast);

    this.time.delayedCall(2200, () => {
      if (isLast) {
        this.state = "won";
        this.promptReplay();
      } else {
        this.levelIndex++;
        this.clearField();
        this.buildLevel(this.levelIndex);
        this.spawnBall();
        this.state = "ready";
        this.hideOverlay();
      }
    });
  }

  private gameOver(): void {
    this.state = "over";
    audio.gameOver();
    const best = Number(localStorage.getItem("breakout_highscore") ?? 0);
    if (this.score > best) {
      localStorage.setItem("breakout_highscore", String(this.score));
    }
    this.showOverlay("GAME OVER", 0xff2fb3, false);
    this.promptReplay();
  }

  private clearField(): void {
    for (const ball of this.balls) ball.destroy();
    this.balls = [];
    this.capsuleGroup.clear(true, true);
    this.effects.clear();
    this.paddle.setWide(false);
  }

  // --- overlays ------------------------------------------------------------------

  private css(color: number): string {
    return `#${color.toString(16).padStart(6, "0")}`;
  }

  private showOverlay(text: string, color: number, big: boolean): void {
    this.hideOverlay();
    const container = this.add.container(GAME.W / 2, GAME.H * 0.42).setDepth(60).setAlpha(0);

    const label = this.add
      .text(0, 0, text, {
        fontFamily: '"Courier New", monospace',
        fontSize: big ? "54px" : "40px",
        fontStyle: "bold",
        color: this.css(color),
      })
      .setOrigin(0.5);

    // Additive glow halo behind the words instead of a shadow blur.
    container.add(
      this.add
        .image(0, 0, "glow")
        .setDisplaySize(label.width + 140, label.height + 80)
        .setTint(color)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.35),
    );
    container.add(label);
    this.overlay = container;

    this.tweens.add({ targets: container, alpha: 1, duration: 320 });
    this.tweens.add({
      targets: label,
      scale: { from: 0.7, to: 1 },
      duration: 420,
      ease: "Back.easeOut",
    });
  }

  private promptReplay(): void {
    const prompt = this.add
      .text(0, 120, "PRESS SPACE TO PLAY AGAIN", {
        fontFamily: '"Courier New", monospace',
        fontSize: "22px",
        color: "#8de1ff",
      })
      .setDepth(60)
      .setOrigin(0.5)
      .setAlpha(0.3);

    if (this.overlay) {
      this.overlay.add(prompt);
    } else {
      prompt.setPosition(GAME.W / 2, GAME.H * 0.42 + 120);
    }
    this.tweens.add({
      targets: prompt,
      alpha: { from: 1, to: 0.25 },
      duration: 600,
      yoyo: true,
      repeat: -1,
    });
  }

  private hideOverlay(): void {
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
  }

  // --- HUD -------------------------------------------------------------------------

  private hudState(): Record<string, number | boolean> {
    return {
      score: this.score,
      lives: this.lives,
      level: this.levelIndex + 1,
      levelTotal: LEVELS.length,
      muted: audio.isMuted(),
    };
  }
}
