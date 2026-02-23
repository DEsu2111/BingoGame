let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ensureAudio() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return null;

  if (!ctx) {
    ctx = new AudioContextClass();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  return { ctx, master: master as GainNode };
}

function tone(
  context: AudioContext,
  destination: GainNode,
  frequency: number,
  startAt: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
) {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(startAt);
  osc.stop(startAt + duration);
}

export function primeSoundEngine() {
  try {
    ensureAudio();
  } catch {
    // Ignore unsupported audio environments.
  }
}

export function playLoginSuccessSound() {
  try {
    const audio = ensureAudio();
    if (!audio) return;
    const { ctx: context, master: destination } = audio;
    const now = context.currentTime;
    tone(context, destination, 440, now, 0.16, 0.09, 'triangle');
    tone(context, destination, 660, now + 0.09, 0.17, 0.11, 'triangle');
    tone(context, destination, 880, now + 0.18, 0.2, 0.1, 'sine');
  } catch {
    // Ignore unsupported audio environments.
  }
}

export function playRoundStartSound() {
  try {
    const audio = ensureAudio();
    if (!audio) return;
    const { ctx: context, master: destination } = audio;
    const now = context.currentTime;
    tone(context, destination, 220, now, 0.22, 0.13, 'square');
    tone(context, destination, 330, now + 0.11, 0.2, 0.1, 'triangle');
    tone(context, destination, 494, now + 0.22, 0.24, 0.09, 'sine');
  } catch {
    // Ignore unsupported audio environments.
  }
}

export function playNumberCalledSound(number: number) {
  try {
    const audio = ensureAudio();
    if (!audio) return;
    const { ctx: context, master: destination } = audio;
    const now = context.currentTime;
    const pitch = 420 + (number % 12) * 22;
    tone(context, destination, pitch, now, 0.11, 0.07, 'triangle');
  } catch {
    // Ignore unsupported audio environments.
  }
}

export function playLoseSound() {
  try {
    const audio = ensureAudio();
    if (!audio) return;
    const { ctx: context, master: destination } = audio;
    const now = context.currentTime;
    tone(context, destination, 240, now, 0.2, 0.09, 'sawtooth');
    tone(context, destination, 190, now + 0.12, 0.24, 0.08, 'triangle');
  } catch {
    // Ignore unsupported audio environments.
  }
}

export function playWinSound() {
  try {
    const audio = ensureAudio();
    if (!audio) return;
    const { ctx: context, master: destination } = audio;
    const now = context.currentTime;

    tone(context, destination, 180, now, 0.45, 0.18, 'triangle');
    tone(context, destination, 780, now + 0.08, 0.36, 0.12, 'sine');
    tone(context, destination, 1040, now + 0.18, 0.4, 0.1, 'sine');
  } catch {
    // Ignore unsupported audio environments.
  }
}
