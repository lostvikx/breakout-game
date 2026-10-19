import Phaser from "phaser";
import { GAME } from "./config";
import { BootScene } from "./scenes/BootScene";
import { TitleScene } from "./scenes/TitleScene";
import { GameScene } from "./scenes/GameScene";
import { HudScene } from "./scenes/HudScene";
import { audio } from "./systems/audio";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME.W,
  height: GAME.H,
  parent: "game",
  backgroundColor: 0x05050c,
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, GameScene, HudScene],
};

const game = new Phaser.Game(config);

// Handy for debugging from the browser console.
(window as unknown as { game: Phaser.Game }).game = game;

// Global mute toggle — works from any scene.
window.addEventListener("keydown", (event) => {
  if (event.code === "KeyM") {
    audio.toggleMuted();
  }
});

// Keep arrow keys / space from scrolling the page around the canvas.
window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) {
    event.preventDefault();
  }
});
