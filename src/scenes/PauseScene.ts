import Phaser from "phaser";
import { GAME } from "../config";

const ITEMS = ["RESUME", "RESTART", "QUIT TO TITLE"] as const;

/**
 * Pause overlay. Launched on top of a paused GameScene, so the game clock,
 * physics, tweens and power-up timers are all frozen underneath.
 */
export class PauseScene extends Phaser.Scene {
  private selected = 0;
  private labels: Phaser.GameObjects.Text[] = [];
  private closing = false;
  private acceptsInputAt = 0;

  constructor() {
    super("pause");
  }

  create(): void {
    this.selected = 0;
    this.labels = [];
    this.closing = false;
    // Ignore the same Esc press (or key repeat) that opened the menu.
    this.acceptsInputAt = this.time.now + 150;

    this.add.rectangle(GAME.W / 2, GAME.H / 2, GAME.W, GAME.H, 0x05050c, 0.78);

    const title = this.add
      .text(GAME.W / 2, GAME.H * 0.32, "PAUSED", {
        fontFamily: '"Courier New", monospace',
        fontSize: "56px",
        fontStyle: "bold",
        color: "#00e5ff",
      })
      .setOrigin(0.5);

    this.add
      .image(title.x, title.y, "glow")
      .setDisplaySize(title.width + 140, title.height + 80)
      .setTint(0x00e5ff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.35)
      .setDepth(-1);

    ITEMS.forEach((item, i) => {
      const label = this.add
        .text(GAME.W / 2, GAME.H * 0.48 + i * 58, item, {
          fontFamily: '"Courier New", monospace',
          fontSize: "26px",
          fontStyle: "bold",
          color: "#8de1ff",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      label.on("pointerover", () => this.select(i));
      label.on("pointerdown", () => this.activate(i));
      this.labels.push(label);
    });

    this.add
      .text(GAME.W / 2, GAME.H * 0.8, "↑ / ↓ MOVE    ·    ENTER SELECT    ·    ESC RESUME", {
        fontFamily: '"Courier New", monospace',
        fontSize: "15px",
        color: "#5a6288",
      })
      .setOrigin(0.5);

    const kb = this.input.keyboard!;
    kb.on("keydown-UP", () => this.move(-1));
    kb.on("keydown-W", () => this.move(-1));
    kb.on("keydown-DOWN", () => this.move(1));
    kb.on("keydown-S", () => this.move(1));
    kb.on("keydown-ENTER", () => this.activate(this.selected));
    kb.on("keydown-ESC", () => this.resume());

    this.refresh();
  }

  private select(index: number): void {
    this.selected = Phaser.Math.Wrap(index, 0, ITEMS.length);
    this.refresh();
  }

  private move(delta: number): void {
    if (this.closing) return;
    this.select(this.selected + delta);
  }

  private activate(index: number): void {
    if (!this.canClose()) return;
    this.closing = true;
    switch (ITEMS[index]) {
      case "RESUME":
        this.doResume();
        break;
      case "RESTART":
        // GameScene.create() relaunches the HUD, so tear both down first.
        this.scene.stop("hud");
        this.scene.stop("game");
        this.scene.start("game");
        this.scene.stop();
        break;
      case "QUIT TO TITLE":
        this.scene.stop("hud");
        this.scene.stop("game");
        this.scene.start("title");
        this.scene.stop();
        break;
    }
  }

  private resume(): void {
    if (!this.canClose()) return;
    this.closing = true;
    this.doResume();
  }

  private doResume(): void {
    this.scene.resume("game");
    this.scene.stop();
  }

  private canClose(): boolean {
    return !this.closing && this.time.now >= this.acceptsInputAt;
  }

  private refresh(): void {
    this.labels.forEach((label, i) => {
      const active = i === this.selected;
      label.setColor(active ? "#ffe14d" : "#8de1ff");
      label.setScale(active ? 1.08 : 1);
    });
  }
}
