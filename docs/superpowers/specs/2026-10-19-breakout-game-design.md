# Breakout Game — Design Spec

**Date:** 2026-10-19
**Status:** Approved (brainstorming complete; implementation plan pending)

## Purpose

A portfolio-piece breakout/Arkanoid-style game that demonstrates Phaser 3 + TypeScript game-dev craftsmanship. Success criteria: fun to play, visually striking (Neon Glow theme), heavily polished presentation (UI screens, particles, synthesized audio), clean typed codebase, one-command deploy to GitHub Pages, and zero third-party asset dependencies (no licensing concerns).

## Decisions

| Topic | Decision |
|---|---|
| Purpose | Portfolio piece |
| Stack | Phaser 3 + TypeScript + Vite |
| Deploy | GitHub Pages (GitHub Actions workflow) |
| Visuals | Procedural, code-drawn — Neon Glow theme |
| SFX | Web Audio synthesizer (no audio files) |
| Music | Generative ambient loop via Web Audio (slow soft pad progression, e.g. Am–F–Cmaj7–G, sine/triangle voices, delay/echo decay) |
| Controls | Keyboard only — ← / → arrows and A / D, fixed paddle speed |
| Resolution | Fixed 1280×720 playfield, CSS-scaled/letterboxed to fit window |
| Mobile/touch | Out of scope |
| Mouse | Out of scope (paddle is keyboard-driven) |

## Theme — Neon Glow

- Dark playfield (`#0d0d1f` range), glowing brick palette (hot pink `#ff2fb3`, cyan `#00e5ff`, yellow `#ffe14d`, green `#7cff6b`, purple `#b96bff`)
- Glow via shadow/tint, particle sparks, additive-blend particles
- HUD text in cyan monospace look; CRT-style scanline overlay + vignette on the playfield
- Title/intro screens share the same dark neon language

## Architecture

Fixed-width Phaser game (1280×720). Scenes:

| Scene | Responsibility |
|---|---|
| `BootScene` | Generate all textures procedurally via `Graphics.generateTexture` (bricks, paddle, ball, power-up capsules, glow sprites); load nothing external |
| `TitleScene` | Animated neon title, "press Space/click to start", high score display |
| `GameScene` | Main gameplay: physics, collisions, power-ups, particles, level flow, game-over/level-clear overlays (tweened groups, not separate scenes) |
| `HudScene` | Overlay scene: score, lives, level indicator, active power-up timer bars |

Shared helpers live in `systems/` so scene code stays thin.

## Core gameplay

- **Paddle:** moves at fixed speed while arrow keys / A / D are held. Velocity-physics-based (deterministic, easily unit-testable).
- **Ball:** Arcade Physics circle. Starts stuck-to-paddle; launched with Space. Angle after a paddle hit depends on hit position along the paddle (clamped to ±75° from vertical so trajectories stay playable). Ball speed increases slightly with each paddle hit, capped.
- **Bricks:** levels defined as ASCII maps (one character per tile = brick type or empty). Brick types: 1-hit (color = row), 2-hit armored (fades/cracks after first hit), indestructible solid. Levels flow into each other via brief "level clear" overlay.
- **4 handcrafted levels** of increasing shape complexity, tuned so each maps to the brick type vocabulary (e.g. level 2 introduces armored, level 4 uses solids to shape the ball path).
- **Lives/score:** 3 lives. Points come only from bricks: base points per brick, multi-hit bricks give more. High score persisted in `localStorage`.

## Power-ups

On brick break there is a chance to drop a glowing capsule; catch it with the paddle:

1. **Expand** — paddle widens for 10 s
2. **Multiball** — current ball splits into 3
3. **Slow-mo** — all balls slow down for 8 s
4. **+1 Life** — extra life

`HudScene` shows timer bars for active timed effects. Losing all balls costs one life and resets the current ball on the paddle.

## Juice

- Particle burst + glow flash + tween-scale on brick break
- Screen shake on ball loss; paddle hit flash
- Scanline overlay + vignette
- Web Audio synthesized SFX: pitched bleeps for paddle hits, rising arpeggios for brick breaks, chords for level clear / game over / power-up pickup
- Generative ambient music loop (calm, non-intrusive) with a mute toggle (M key)

## Repository & tooling

```
src/
  main.ts           — Phaser game config
  scenes/           — Boot, Title, Game, Hud
  entities/         — Ball, Paddle, Brick
  systems/          — audio synth (SFX + music), power-up logic, level loader, fx helpers
  levels/           — ASCII level maps + brick type legend
index.html          — letterboxed canvas host, page title, attribution-free footer
vite.config.ts      — base path for GitHub Pages
tsconfig.json
.github/workflows/deploy.yml — build & deploy to Pages
```

- `npm run dev`, `npm run build`, `npm run test`
- Testing: **Vitest** unit tests for pure logic — level map parsing/validation, bounce-angle clamp math, scoring rules, power-up timers/effect expiry. Feel/juice is playtested manually.

## Out of scope

- Mobile/touch support, mouse paddle control
- Sticky paddle / laser cannon power-ups (kept to the 4 chosen)
- Leaderboards, achievements, networked anything
- Background image art (all backgrounds are gradients/scans drawn in code)
