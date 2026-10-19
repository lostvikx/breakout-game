/**
 * Web Audio synthesizer — all game audio is generated in code; there are no
 * audio files in this repo. Provides short one-shot SFX plus a calm,
 * generative ambient music loop (slow pad chords with a soft echo).
 *
 * Created lazily on the first user gesture to satisfy browser autoplay rules.
 * A module-level singleton so music keeps playing across scene changes.
 */

const CHORD_SECONDS = 3.2;

/** MIDI note numbers for a calm four-chord progression: Am – F – Cmaj7 – G. */
const PROGRESSION: number[][] = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 55, 60, 64],
  [55, 59, 62],
];

const SPARKLE_SCALE = [69, 72, 76, 81, 84];

function midiToFreq(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

type Timeout = ReturnType<typeof setTimeout>;

class AudioSynth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private echoSend: GainNode | null = null;
  private muted = false;
  private musicOn = false;
  private musicTimer: Timeout | undefined;
  private chordIndex = 0;

  /** Call from a user-gesture handler (click / key press). */
  init(): void {
    if (!this.ctx) {
      const ctx = new AudioContext();
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.9;
      master.connect(ctx.destination);

      const echo = ctx.createDelay(1);
      echo.delayTime.value = 0.42;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.35;
      echo.connect(feedback);
      feedback.connect(echo);
      echo.connect(master);

      const musicBus = ctx.createGain();
      musicBus.gain.value = 0.14;
      musicBus.connect(master);
      musicBus.connect(echo);

      const sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.5;
      sfxBus.connect(master);

      const echoSend = ctx.createGain();
      echoSend.gain.value = 0.5;
      echoSend.connect(echo);

      this.ctx = ctx;
      this.master = master;
      this.musicBus = musicBus;
      this.sfxBus = sfxBus;
      this.echoSend = echoSend;
    }

    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) {
      this.master.gain.value = muted ? 0 : 0.9;
    }
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  startMusic(): void {
    if (this.musicOn) return;
    this.init();
    this.musicOn = true;
    this.chordIndex = 0;
    this.scheduleNextChord();
  }

  stopMusic(): void {
    this.musicOn = false;
    if (this.musicTimer !== undefined) {
      clearTimeout(this.musicTimer);
      this.musicTimer = undefined;
    }
  }

  // --- one-shot SFX helpers -------------------------------------------------

  private sfx(
    freq: number,
    opts: { type?: OscillatorType; dur?: number; vol?: number; slideTo?: number; echo?: number } = {},
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const { type = "sine", dur = 0.1, vol = 0.4, slideTo, echo = 0 } = opts;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo !== undefined) {
      osc.frequency.linearRampToValueAtTime(slideTo, t + dur);
    }
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    if (echo > 0 && this.echoSend) {
      const wet = ctx.createGain();
      wet.gain.value = echo;
      gain.connect(wet);
      wet.connect(this.echoSend);
    }
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  paddle(): void {
    this.sfx(230, { type: "square", dur: 0.06, vol: 0.18, slideTo: 330 });
  }

  /** Rising pitch per brick color row — gives the ceiling a musical scale. */
  brickHit(colorIndex: number): void {
    const scale = [392, 440, 494, 587, 659];
    this.sfx(scale[Math.min(Math.max(colorIndex - 1, 0), scale.length - 1)], {
      type: "triangle",
      dur: 0.14,
      vol: 0.3,
      echo: 0.4,
    });
  }

  brickBreak(colorIndex: number): void {
    const scale = [523, 587, 659, 784, 880];
    const f = scale[Math.min(Math.max(colorIndex - 1, 0), scale.length - 1)];
    this.sfx(f, { type: "triangle", dur: 0.1, vol: 0.3 });
    this.sfx(f * 1.5, { type: "sine", dur: 0.18, vol: 0.25, echo: 0.5 });
  }

  thud(): void {
    this.sfx(85, { type: "sine", dur: 0.07, vol: 0.3 });
  }

  powerup(): void {
    this.sfx(420, { type: "triangle", dur: 0.16, vol: 0.35, slideTo: 840, echo: 0.5 });
  }

  loseBall(): void {
    this.sfx(420, { type: "sine", dur: 0.5, vol: 0.35, slideTo: 110 });
  }

  levelClear(): void {
    [64, 68, 71, 76].forEach((note, i) => {
      setTimeout(() => {
        this.sfx(midiToFreq(note), { type: "triangle", dur: 0.16, vol: 0.3, echo: 0.6 });
      }, i * 110);
    });
  }

  gameOver(): void {
    [57, 53, 45].forEach((note, i) => {
      setTimeout(() => {
        this.sfx(midiToFreq(note), { type: "triangle", dur: 0.7, vol: 0.35 });
      }, i * 260);
    });
  }

  // --- generative ambient music --------------------------------------------

  private scheduleNextChord(): void {
    if (!this.musicOn) return;

    this.playChord(PROGRESSION[this.chordIndex % PROGRESSION.length], this.chordIndex);
    this.chordIndex++;

    this.musicTimer = setTimeout(() => this.scheduleNextChord(), CHORD_SECONDS * 1000);
  }

  private playChord(notes: number[], index: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    const t = ctx.currentTime;

    for (const note of notes) {
      const freq = midiToFreq(note);
      // Two detuned voices per note make the pad feel warm instead of sterile.
      for (const [oscType, detune, level] of [
        ["sine", 0, 0.6],
        ["triangle", 7, 0.35],
      ] as const) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = oscType;
        osc.frequency.value = freq;
        osc.detune.value = detune;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.05 * level, t + 1.0);
        gain.gain.setValueAtTime(0.05 * level, t + CHORD_SECONDS - 1.4);
        gain.gain.linearRampToValueAtTime(0, t + CHORD_SECONDS + 1.2);
        osc.connect(gain);
        gain.connect(this.musicBus);
        osc.start(t);
        osc.stop(t + CHORD_SECONDS + 1.4);
      }
    }

    // An occasional, very quiet sparkle note so the loop never sounds mechanical.
    if (index % 2 === 1) {
      const note = SPARKLE_SCALE[Math.floor(Math.random() * SPARKLE_SCALE.length)];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = midiToFreq(note);
      const start = t + 0.4 + Math.random() * 1.2;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.035, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.6);
      osc.connect(gain);
      gain.connect(this.musicBus);
      osc.start(start);
      osc.stop(start + 1.8);
    }
  }
}

export const audio = new AudioSynth();
