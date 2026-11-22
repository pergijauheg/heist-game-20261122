// The Velvet Vault — every sound, synthesized, no audio files.
// One job: tiny WebAudio bleeps and stings (footstep, coin, alarm, win, lose)
// so the game plays 100% offline with zero network references.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicOn = false;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  tone(freq, dur, type = 'sine', vol = 0.12, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  footstep(sneaking) {
    this.tone(sneaking ? 90 : 140, 0.07, 'triangle', sneaking ? 0.03 : 0.06);
  }

  pickup() {
    this.tone(880, 0.09, 'sine', 0.12);
    this.tone(1318, 0.14, 'sine', 0.1, 0.08);
  }

  vaultOpen() {
    this.tone(220, 0.12, 'square', 0.07);
    this.tone(330, 0.12, 'square', 0.07, 0.1);
    this.tone(440, 0.22, 'square', 0.08, 0.2);
  }

  smoke() {
    this.tone(300, 0.4, 'sawtooth', 0.05, 0, 90);
  }

  emp() {
    this.tone(1200, 0.25, 'square', 0.06, 0, 180);
    this.tone(900, 0.2, 'square', 0.05, 0.12, 140);
  }

  spotted() {
    this.tone(620, 0.16, 'square', 0.1);
    this.tone(620, 0.16, 'square', 0.1, 0.18);
  }

  alarmSting() {
    this.tone(740, 0.2, 'sawtooth', 0.09);
    this.tone(520, 0.2, 'sawtooth', 0.09, 0.2);
  }

  caught() {
    this.tone(392, 0.18, 'sawtooth', 0.1);
    this.tone(311, 0.18, 'sawtooth', 0.1, 0.16);
    this.tone(233, 0.34, 'sawtooth', 0.11, 0.32);
  }

  levelClear() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.11, i * 0.11));
  }

  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.11, i * 0.13));
  }

  gameOver() {
    [330, 262, 196, 131].forEach((f, i) => this.tone(f, 0.32, 'triangle', 0.1, i * 0.16));
  }

  click() {
    this.tone(600, 0.05, 'square', 0.05);
  }

  // A quiet, tense bass pulse while playing — started once, on first input.
  startMusic() {
    if (this.musicOn || !this.ctx) return;
    this.musicOn = true;
    const notes = [110, 0, 130.8, 0, 98, 0, 123.5, 0];
    let i = 0;
    this.musicTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const f = notes[i % notes.length];
      i += 1;
      if (f) this.tone(f, 0.42, 'sine', 0.035);
    }, 480);
  }
}
