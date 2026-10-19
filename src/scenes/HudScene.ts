import Phaser from "phaser";
import { GAME } from "../config";
import { POWERUP_DURATIONS, POWERUP_TYPES, type TimedPowerUpType } from "../systems/powerups";

interface HudData {
  score: number;
  lives: number;
  level: number;
  levelTotal: number;
  muted: boolean;
}

interface EffectRatio {
  type: string;
  ratio: number;
}

const CSS = {
  score: "#00e5ff",
  level: "#ffffff",
  lives: "#ff2fb3",
  barBg: "#151a30",
  barFrame: "#2a3352",
  label: "#8de1ff",
  muted: "#ffe14d",
} as const;

const BAR_H = 8;
const BAR_W = 110;
const BAR_LABEL = { expand: "WIDE", slow: "SLOW" } as const;

/**
 * HUD overlay scene. Reads shared state from the registry (written by
 * GameScene) and renders score / lives / level + active power-up timer bars.
 */
export class HudScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private mutedText!: Phaser.GameObjects.Text;
  private lastScore = -1;
  private lastLives = -1;
  private bars = new Map<TimedPowerUpType, { frame: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }>();

  constructor() {
    super("hud");
  }

  create(): void {
    const top = 12;

    this.scoreText = this.add
      .text(24, top, "SCORE 000000", {
        fontFamily: '"Courier New", monospace',
        fontSize: "22px",
        fontStyle: "bold",
        color: CSS.score,
      })
      .setShadow(0, 0, CSS.score, 12, true, true);

    this.levelText = this.add
      .text(GAME.W / 2, top, "", {
        fontFamily: '"Courier New", monospace',
        fontSize: "22px",
        color: CSS.level,
      })
      .setOrigin(0.5, 0);

    this.livesText = this.add
      .text(GAME.W - 24, top, "", {
        fontFamily: '"Courier New", monospace',
        fontSize: "24px",
        color: CSS.lives,
      })
      .setOrigin(1, 0)
      .setShadow(0, 0, CSS.lives, 12, true, true);

    this.mutedText = this.add
      .text(GAME.W - 24, top + 30, "MUTED (M)", {
        fontFamily: '"Courier New", monospace',
        fontSize: "13px",
        color: CSS.muted,
      })
      .setOrigin(1, 0);
  }

  update(_time: number, _delta: number): void {
    const hud = this.registry.get("hud") as HudData | undefined;
    if (hud) {
      if (hud.score !== this.lastScore) {
        this.scoreText.setText(`SCORE ${String(hud.score).padStart(7, "0")}`);
        if (this.lastScore >= 0) {
          // Pop on change.
          this.tweens.add({
            targets: this.scoreText,
            scale: { from: 1.14, to: 1 },
            duration: 120,
          });
        }
        this.lastScore = hud.score;
      }
      if (hud.lives !== this.lastLives) {
        this.livesText.setText("♥ ".repeat(Math.max(0, hud.lives)).trim());
        this.lastLives = hud.lives;
      }
      this.levelText.setText(`LEVEL ${hud.level}/${hud.levelTotal}`);
      this.mutedText.setVisible(Boolean(hud.muted));
    }

    this.updateBars();
  }

  private updateBars(): void {
    const effects = (this.registry.get("effects") as EffectRatio[] | undefined) ?? [];
    const seen = new Set<TimedPowerUpType>();

    effects.forEach((entry, i) => {
      const type = entry.type as TimedPowerUpType;
      if (!POWERUP_TYPES.includes(type)) return;
      seen.add(type);

      let bar = this.bars.get(type);
      if (!bar) {
        const y = 18 + i * (BAR_H + 22);
        const x = 24;
        const frame = this.add.rectangle(x, y, BAR_W, BAR_H, 0x151a30).setOrigin(0);
        const fill = this.add.rectangle(x, y, 1, BAR_H - 2, NEON_COLOR(type)).setOrigin(0);
        fill.setPosition(x + 1, y + 1);
        const label = this.add
          .text(x + BAR_W + 10, y + BAR_H / 2, BAR_LABEL[type] ?? type.toUpperCase(), {
            fontFamily: '"Courier New", monospace',
            fontSize: "12px",
            color: CSS.label,
          })
          .setOrigin(0, 0.5);
        bar = { frame, fill, label };
        this.bars.set(type, bar);
      }
      bar.fill.width = Math.max(2, (BAR_W - 2) * entry.ratio);
      bar.fill.fillColor = NEON_COLOR(type);
      bar.fill.alpha = entry.ratio > 0.25 ? 0.95 : 0.5 + Math.sin(this.time.now / 90) * 0.25;
    });

    // Remove bars whose effects ended.
    for (const [type, bar] of this.bars) {
      if (!seen.has(type)) {
        bar.frame.destroy();
        bar.fill.destroy();
        bar.label.destroy();
        this.bars.delete(type);
      }
    }
  }
}

function NEON_COLOR(type: TimedPowerUpType): number {
  switch (type) {
    case "expand":
      return 0x00e5ff;
    case "slow":
      return 0xffe14d;
    default: {
      // Keeps the width math honest if a new timed power-up is added without a color.
      return POWERUP_DURATIONS[type] ? 0x8de1ff : 0xffffff;
    }
  }
}
