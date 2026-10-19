import Phaser from "phaser";
import { audio } from "../systems/audio";

/** Neon title screen with blinking play prompt and the persisted high score. */
export class TitleScene extends Phaser.Scene {
  private highScore = 0;

  constructor() {
    super("title");
  }

  create(): void {
    const { width, height } = this.scale;
    this.highScore = Number(localStorage.getItem("breakout_highscore") ?? 0);

    this.cameras.main.setBackgroundColor(0x05050c);

    const title1 = this.add
      .text(width / 2, height * 0.34, "NEON", {
        fontFamily: '"Courier New", monospace',
        fontSize: "96px",
        fontStyle: "bold",
        color: "#ff2fb3",
      })
      .setOrigin(0.5);

    const title2 = this.add
      .text(width / 2, height * 0.34 + 96, "BREAKOUT", {
        fontFamily: '"Courier New", monospace',
        fontSize: "58px",
        fontStyle: "bold",
        color: "#00e5ff",
      })
      .setOrigin(0.5);

    // Additive radial glows behind the big words (setShadow renders boxy in WebGL).
    for (const [text, color] of [
      [title1, 0xff2fb3],
      [title2, 0x00e5ff],
    ] as const) {
      this.add
        .image(text.x, text.y, "glow")
        .setDisplaySize(text.width + 120, text.height + 70)
        .setTint(color)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.4)
        .setDepth(-1);
    }

    // Gentle float + pulse.
    this.tweens.add({
      targets: [title1, title2],
      y: "-=10",
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.tweens.add({
      targets: [title1, title2],
      alpha: { from: 1, to: 0.85 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });

    this.add
      .text(width / 2, height * 0.62, "ARROWS or A / D to move    ·    SPACE to launch    ·    M to mute", {
        fontFamily: '"Courier New", monospace',
        fontSize: "17px",
        color: "#8de1ff",
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(width / 2, height * 0.74, "PRESS SPACE OR CLICK TO START", {
        fontFamily: '"Courier New", monospace',
        fontSize: "26px",
        fontStyle: "bold",
        color: "#ffe14d",
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: prompt,
      alpha: { from: 1, to: 0.25 },
      duration: 650,
      yoyo: true,
      repeat: -1,
    });

    if (this.highScore > 0) {
      this.add
        .text(width / 2, height * 0.83, `HIGH SCORE  ${this.highScore.toLocaleString()}`, {
          fontFamily: '"Courier New", monospace',
          fontSize: "20px",
          color: "#7cff6b",
        })
        .setOrigin(0.5);
    }

    this.add
      .text(width / 2, height - 24, "built with phaser 3 · procedural graphics · synthesized audio", {
        fontFamily: '"Courier New", monospace',
        fontSize: "13px",
        color: "#5a6288",
      })
      .setOrigin(0.5);

    this.input.keyboard?.on("keydown-SPACE", () => this.startGame());
    this.input.on("pointerdown", () => this.startGame());
  }

  private startGame(): void {
    // AudioContext must be created/resumed inside a user gesture.
    audio.init();
    audio.startMusic();
    this.scene.start("game");
  }
}
