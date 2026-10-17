/**
 * Harmonious Keyboard Sound Engine
 * Web Audio API — Soft Piano, Gentle Synth, Classic Typewriter
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.enabled = true;
        this.volume = 0.5;
        this.style = 'soft-piano';
        this.initialized = false;

        // A–Z note frequencies (C4–C#6)
        this.noteMap = {
            a: 261.63, b: 277.18, c: 293.66, d: 311.13, e: 329.63,
            f: 349.23, g: 369.99, h: 392.00, i: 415.30, j: 440.00,
            k: 466.16, l: 493.88, m: 523.25, n: 554.37, o: 587.33,
            p: 622.25, q: 659.25, r: 698.46, s: 739.99, t: 783.99,
            u: 830.61, v: 880.00, w: 932.33, x: 987.77, y: 1046.50,
            z: 1108.73
        };
    }

    init() {
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) {
                console.warn('Web Audio API not available');
                return;
            }
            if (!this.ctx) {
                this.ctx = new AC();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.value = this.volume;
                this.masterGain.connect(this.ctx.destination);
            }
            this.initialized = true;
            this._resume();
        } catch (e) {
            console.warn('Audio init failed', e);
        }
    }

    _resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            return this.ctx.resume().catch(() => {});
        }
        return Promise.resolve();
    }

    ensureRunning() {
        if (!this.ctx) this.init();
        return this._resume();
    }

    setEnabled(val) {
        this.enabled = !!val;
    }

    setVolume(val) {
        this.volume = Math.max(0, Math.min(1, Number(val) || 0));
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
    }

    setStyle(style) {
        this.style = style || 'soft-piano';
    }

    /** Call on every key press */
    playKey(key) {
        if (!this.enabled) return;
        if (!this.ctx || !this.initialized) {
            this.init();
        }
        if (!this.ctx || !this.masterGain) return;

        const run = () => {
            try {
                this._playTone(key);
            } catch (e) {
                console.warn('playTone error', e);
            }
        };

        if (this.ctx.state === 'suspended') {
            this.ctx.resume().then(run).catch(() => {});
        } else {
            run();
        }
    }

    /** Short test beep (e.g. on Start Typing) */
    playTest() {
        if (!this.enabled) return;
        this.playKey('a');
    }

    _playTone(key) {
        const lower = String(key || '').toLowerCase();
        if (/^[a-z]$/.test(lower)) {
            const freq = this.noteMap[lower];
            if (!freq) return;
            if (this.style === 'typewriter') {
                this._click();
            } else if (this.style === 'gentle-synth') {
                this._synth(freq);
            } else {
                this._piano(freq);
            }
        } else {
            // space / punctuation — soft click
            this._click();
        }
    }

    _piano(freq) {
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const out = this.masterGain;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2200, now);

        // Louder, clearer attack
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.55, now + 0.012);
        gain.gain.linearRampToValueAtTime(0, now + 0.32);

        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(0.18, now + 0.01);
        gain2.gain.linearRampToValueAtTime(0, now + 0.22);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(out);

        osc2.connect(gain2);
        gain2.connect(out);

        osc.start(now);
        osc.stop(now + 0.35);
        osc2.start(now);
        osc2.stop(now + 0.25);
    }

    _synth(freq) {
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const out = this.masterGain;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.Q.setValueAtTime(1.5, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.5, now + 0.015);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(out);

        osc.start(now);
        osc.stop(now + 0.22);
    }

    _click() {
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const out = this.masterGain;

        const duration = 0.045;
        const bufferSize = Math.floor(ctx.sampleRate * duration);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.12));
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2800, now);
        filter.Q.setValueAtTime(1.8, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.linearRampToValueAtTime(0, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(out);

        noise.start(now);
        noise.stop(now + duration);
    }
}

window.soundEngine = new SoundEngine();
