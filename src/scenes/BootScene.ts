import Phaser from "phaser";
import { BALL, BRICK, GAME, PADDLE } from "../config";
import { ARMORED_HEX, NEON_HEX, SOLID_HEX } from "../palette";

/**
 * Generates every texture procedurally at boot — the game loads nothing
 * external. All bricks, the paddle, ball, capsules and overlays are drawn with
 * Graphics or a CanvasTexture and baked with generateTexture().
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create(): void {
    this.makeBrickTextures();
    this.makePaddleTextures();
    this.makeBallTexture();
    this.makeCapsuleTextures();
    this.makeOverlays();
    this.scene.start("title");
  }

  private makeBrickTextures(): void {
    NEON_HEX.forEach((color, i) => {
      this.bake(`brick-${i + 1}`, BRICK_W, BRICK_H, (g) => {
        this.brickShape(g, color, 5);
      });
    });

    // Armored: steel plate with rivets.
    this.bake("brick-armored", BRICK_W, BRICK_H, (g) => {
      this.brickShape(g, ARMORED_HEX, 25);
      g.fillStyle(0x28324a, 1);
      [10, 40, 70].forEach((x) => {
        [8, 18].forEach((y) => g.fillCircle(x, y, 2));
      });
    });

    // Solid: dark slate slab (indestructible).
    this.bake("brick-solid", BRICK_W, BRICK_H, (g) => {
      this.brickShape(g, SOLID_HEX, 30);
    });
  }

  private brickShape(
    g: Phaser.GameObjects.Graphics,
    color: number,
    darkenAmount: number,
  ): void {
    const shade = Phaser.Display.Color.ValueToColor(color).darken(darkenAmount).color;
    const light = Phaser.Display.Color.ValueToColor(color).lighten(35).color;

    // Outer soft glow
    g.lineStyle(3, color, 0.35);
    g.strokeRoundedRect(1, 1, BRICK_W - 2, BRICK_H - 2, 5);
    // Body
    g.fillStyle(color, 1);
    g.fillRoundedRect(2, 2, BRICK_W - 4, BRICK_H - 4, 5);
    // Lower shading
    g.fillStyle(shade, 1);
    g.fillRoundedRect(2, BRICK_H / 2, BRICK_W - 4, BRICK_H / 2 - 2, { tl: 0, tr: 0, bl: 5, br: 5 });
    // Top highlight line
    g.fillStyle(light, 0.9);
    g.fillRect(6, 4, BRICK_W - 12, 2);
  }

  private makePaddleTextures(): void {
    const drawPaddle = (g: Phaser.GameObjects.Graphics, w: number) => {
      const h = PADDLE.H;
      // Solid bar: fill the whole paddle body, not just the outline.
      g.fillStyle(0x8de1ff, 1);
      g.fillRoundedRect(2, 2, w - 4, h - 4, 7);
      g.fillStyle(0x5bb8d8, 1);
      g.fillRoundedRect(2, h / 2, w - 4, h / 2 - 2, { tl: 0, tr: 0, bl: 7, br: 7 });
      g.fillStyle(0xe6f9ff, 0.9);
      g.fillRect(8, 3, w - 16, 2);
      g.lineStyle(2, 0x8de1ff, 0.85);
      g.strokeRoundedRect(2, 2, w - 4, h - 4, 7);
      g.fillStyle(0x17213a, 1);
      g.fillRoundedRect(w / 2 - 22, h / 2 - 2, 44, 4, 2);
      g.lineStyle(2, 0x8de1ff, 0.3);
      g.strokeRoundedRect(0, 0, w, h, 8);
    };
    this.bake("paddle", PADDLE.W, PADDLE.H, (g) => drawPaddle(g, PADDLE.W));
    this.bake("paddle-wide", PADDLE.WIDE, PADDLE.H, (g) => drawPaddle(g, PADDLE.WIDE));
  }

  private makeBallTexture(): void {
    this.bake("ball", BALL.RADIUS * 2 + 2, BALL.RADIUS * 2 + 2, (g) => {
      const c = BALL.RADIUS + 1;
      g.lineStyle(2, 0x00e5ff, 0.5);
      g.strokeCircle(c, c, c - 1);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(c, c, BALL.RADIUS - 1);
    });

    // Tiny white spark used by all particle emitters (bursts + ball trails).
    this.bake("spark", 6, 6, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(3, 3, 3);
    });
  }

  private makeCapsuleTextures(): void {
    const W = 30;
    const H = 16;
    const drawPill = (g: Phaser.GameObjects.Graphics, color: number, icon: (g: Phaser.GameObjects.Graphics, cx: number, cy: number) => void) => {
      g.fillStyle(0x0d0d1f, 1);
      g.fillRoundedRect(1, 1, W - 2, H - 2, 7);
      g.lineStyle(2, color, 1);
      g.strokeRoundedRect(1, 1, W - 2, H - 2, 7);
      g.fillStyle(color, 0.25);
      g.fillRoundedRect(3, 3, W - 6, H - 6, 5);
      g.fillStyle(0xffffff, 0.95);
      icon(g, W / 2, H / 2);
    };

    this.bake("cap-expand", W, H, (g) =>
      drawPill(g, 0x00e5ff, (g2, cx, cy) => {
        g2.fillTriangle(cx - 14, cy, cx - 8, cy - 4, cx - 8, cy + 4);
        g2.fillTriangle(cx + 14, cy, cx + 8, cy - 4, cx + 8, cy + 4);
        g2.fillRect(cx - 5, cy - 1, 10, 2);
      }),
    );
    this.bake("cap-multiball", W, H, (g) =>
      drawPill(g, 0xff2fb3, (g2, cx, cy) => {
        g2.fillCircle(cx - 7, cy, 2);
        g2.fillCircle(cx, cy - 3, 2);
        g2.fillCircle(cx + 7, cy, 2);
      }),
    );
    this.bake("cap-slow", W, H, (g) =>
      drawPill(g, 0xffe14d, (g2, cx, cy) => {
        g2.fillTriangle(cx - 5, cy - 5, cx + 5, cy - 5, cx, cy);
        g2.fillTriangle(cx - 5, cy + 5, cx + 5, cy + 5, cx, cy);
      }),
    );
    this.bake("cap-life", W, H, (g) =>
      drawPill(g, 0x7cff6b, (g2, cx, cy) => {
        g2.fillRect(cx - 1.5, cy - 5, 3, 10);
        g2.fillRect(cx - 5, cy - 1.5, 10, 3);
      }),
    );
  }

  private makeOverlays(): void {
    // Soft radial glow (for particles / flashes foreground use).
    const glow = this.textures.createCanvas("glow", 64, 64);
    if (glow) {
      const ctx = glow.context;
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255,255,255,0.9)");
      grad.addColorStop(0.4, "rgba(255,255,255,0.25)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      glow.refresh();
    }

    // CRT scanline tile (4px tile with one faint bright row).
    this.bake("scanline", 4, 4, (g) => {
      g.fillStyle(0xffffff, 0.05);
      g.fillRect(0, 3, 4, 1);
    });

    // Vignette: dark corners over the playfield.
    const vignette = this.textures.createCanvas("vignette", GAME.W, GAME.H);
    if (vignette) {
      const ctx = vignette.context;
      const grad = ctx.createRadialGradient(GAME.W / 2, GAME.H / 2, GAME.H * 0.35, GAME.W / 2, GAME.H / 2, GAME.W * 0.72);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, GAME.W, GAME.H);
      vignette.refresh();
    }
  }

  /** Little helper: build a texture from a graphics callback, sized exactly. */
  private bake(
    key: string,
    w: number,
    h: number,
    draw: (g: Phaser.GameObjects.Graphics) => void,
  ): void {
    const g = this.add.graphics();
    g.setScrollFactor(0);
    g.setDepth(-100);
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }
}

const BRICK_W = BRICK.W;
const BRICK_H = BRICK.H;
