/**
 * soundEngine.ts — Procedural Web Audio Engine
 * 
 * Generates various SFX procedurally without needing external mp3/wav files.
 * Uses Web Audio API. Requires user interaction (like clicking login) 
 * before it can officially run context.resume().
 */

export class SoundEngine {
    private ctx: AudioContext | null = null;
    public enabled: boolean = true;

    public init() {
        if (typeof window === 'undefined') return;
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /** Schedules a tone with envelope to play precisely at a given time offset */
    private scheduleTone(
        freq: number,
        type: OscillatorType,
        duration: number,
        vol: number,
        startTimeOffset: number = 0,
        freqSlide?: number
    ) {
        if (!this.ctx || !this.enabled) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = this.ctx.currentTime + startTimeOffset;

        osc.type = type;

        // Quick attack, exponential decay for a crisp plop/ding
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.frequency.setValueAtTime(freq, startTime);
        if (freqSlide) {
            osc.frequency.exponentialRampToValueAtTime(freqSlide, startTime + duration);
        }

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    // ─── Playable SFX ─────────────────────────────────────────────

    public playLogin() {
        this.init();
        // A nice ascending major chord conveying welcome/start
        this.scheduleTone(440, 'sine', 0.6, 0.3, 0.0);       // A4
        this.scheduleTone(554.37, 'sine', 0.6, 0.3, 0.15);   // C#5
        this.scheduleTone(659.25, 'sine', 0.8, 0.3, 0.3);    // E5
        this.scheduleTone(880, 'sine', 1.0, 0.4, 0.45);      // A5
    }

    public playLogout() {
        // A descending chord conveying closing/sleep
        this.scheduleTone(880, 'triangle', 0.4, 0.2, 0.0);
        this.scheduleTone(659.25, 'triangle', 0.4, 0.2, 0.1);
        this.scheduleTone(554.37, 'triangle', 0.4, 0.2, 0.2);
        this.scheduleTone(440, 'triangle', 0.6, 0.2, 0.3);
    }

    public playCall() {
        // A pleasant bright dual-tone bell for a new number
        this.scheduleTone(784, 'sine', 0.5, 0.3, 0);       // G5
        this.scheduleTone(1046.5, 'sine', 0.8, 0.3, 0.1);  // C6
    }

    public playMark() {
        // A soft, satisfying popping sound resembling a dauber mark
        this.scheduleTone(600, 'sine', 0.2, 0.4, 0, 150);
    }

    public playBingo() {
        // A fast, triumphant Mario-esque success arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50, 1567.98];
        notes.forEach((freq, i) => {
            this.scheduleTone(freq, 'square', 0.4, 0.15, i * 0.08);
        });
    }

    public playTick() {
        // A sharp quiet clock tick for countdown
        this.scheduleTone(1200, 'sine', 0.05, 0.1, 0, 400);
    }

    public playError() {
        // A dull buzz rejecting an action
        this.scheduleTone(150, 'sawtooth', 0.3, 0.3, 0, 100);
        this.scheduleTone(150, 'sawtooth', 0.4, 0.3, 0.15, 100);
    }
}

export const soundManager = new SoundEngine();
