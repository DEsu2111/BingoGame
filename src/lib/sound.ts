let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let bgmAudio: HTMLAudioElement | null = null;
let bgmRetryBound = false;
let announceQueue: Array<{ number: number; strong: boolean }> = [];
let announcing = false;
const ETHIO_PENTATONIC_OFFSETS = [0, 2, 3, 7, 9];
const LOGIN_BGM_SRC = '/sounds/አንች_ነይማ.mp3';

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

function chime(
  context: AudioContext,
  destination: GainNode,
  frequency: number,
  startAt: number,
  duration: number,
  volume: number,
) {
  tone(context, destination, frequency, startAt, duration, volume, 'triangle');
  tone(context, destination, frequency * 2, startAt + 0.005, duration * 0.75, volume * 0.42, 'sine');
  tone(context, destination, frequency * 3, startAt + 0.01, duration * 0.5, volume * 0.2, 'sine');
}

function scaleFreq(base: number, step: number) {
  const octaveShift = Math.floor(step / ETHIO_PENTATONIC_OFFSETS.length);
  const scaleIndex = step % ETHIO_PENTATONIC_OFFSETS.length;
  const semitones = ETHIO_PENTATONIC_OFFSETS[scaleIndex] + octaveShift * 12;
  return base * 2 ** (semitones / 12);
}

function bindBgmRetry() {
  if (typeof window === 'undefined' || bgmRetryBound) return;
  const retry = () => {
    if (!bgmAudio) return;
    void bgmAudio.play().catch(() => {
      // Keep waiting for a future user gesture.
    });
  };
  window.addEventListener('pointerdown', retry, { passive: true });
  window.addEventListener('keydown', retry);
  bgmRetryBound = true;
}

function numberToBingoCall(value: number) {
  if (value >= 1 && value <= 15) return `B ${value}`;
  if (value >= 16 && value <= 30) return `I ${value}`;
  if (value >= 31 && value <= 45) return `N ${value}`;
  if (value >= 46 && value <= 60) return `G ${value}`;
  return `O ${value}`;
}

function pickBestEnglishVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const exact = voices.find((v) => /google us english|microsoft aria|samantha/i.test(v.name));
  if (exact) return exact;

  const byLocale = voices.find((v) => /^en(-|_)?(US)?/i.test(v.lang));
  return byLocale ?? voices[0];
}

function setBgmVolume(level: number) {
  if (!bgmAudio) return;
  bgmAudio.volume = Math.max(0, Math.min(1, level));
}

function hasSpeechSupport() {
  return typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && 'SpeechSynthesisUtterance' in window;
}

function playLoudAlertTone(strong: boolean) {
  try {
    const audio = ensureAudio();
    if (!audio) return;
    const { ctx: context, master: destination } = audio;
    const now = context.currentTime;
    const baseVolume = strong ? 0.25 : 0.18;
    tone(context, destination, 1046, now, 0.12, baseVolume, 'square');
    tone(context, destination, 1318, now + 0.08, 0.14, baseVolume * 0.85, 'triangle');
  } catch {
    // Ignore unsupported audio environments.
  }
}

function processAnnounceQueue() {
  if (announcing || !announceQueue.length) return;
  if (!hasSpeechSupport()) {
    announceQueue = [];
    announcing = false;
    return;
  }

  const next = announceQueue.shift();
  if (!next) return;

  announcing = true;
  const spoken = numberToBingoCall(next.number);
  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance(spoken);
  const selectedVoice = pickBestEnglishVoice();
  if (selectedVoice) utter.voice = selectedVoice;
  utter.lang = 'en-US';
  utter.rate = 0.88;
  utter.pitch = 1;
  utter.volume = 1;

  setBgmVolume(0.08);

  const finish = () => {
    setBgmVolume(0.35);
    announcing = false;
    window.setTimeout(processAnnounceQueue, 220);
  };

  utter.onend = finish;
  utter.onerror = finish;

  try {
    synth.cancel();
    window.setTimeout(() => {
      synth.speak(utter);
    }, 120);
  } catch {
    finish();
  }
}

export function primeSoundEngine() {
  try {
    ensureAudio();
  } catch {
    // Ignore unsupported audio environments.
  }
}

export function playUiTapSound() {
  try {
    const audio = ensureAudio();
    if (!audio) return;
    const { ctx: context, master: destination } = audio;
    chime(context, destination, 660, context.currentTime, 0.08, 0.04);
  } catch {
    // Ignore unsupported audio environments.
  }
}

export function playUiConfirmSound() {
  try {
    const audio = ensureAudio();
    if (!audio) return;
    const { ctx: context, master: destination } = audio;
    const now = context.currentTime;
    chime(context, destination, scaleFreq(330, 2), now, 0.13, 0.07);
    chime(context, destination, scaleFreq(330, 3), now + 0.09, 0.14, 0.08);
    chime(context, destination, scaleFreq(330, 5), now + 0.19, 0.2, 0.09);
  } catch {
    // Ignore unsupported audio environments.
  }
}

export function playUiErrorSound() {
  try {
    const audio = ensureAudio();
    if (!audio) return;
    const { ctx: context, master: destination } = audio;
    const now = context.currentTime;
    tone(context, destination, 240, now, 0.12, 0.06, 'sawtooth');
    tone(context, destination, 206, now + 0.08, 0.18, 0.07, 'triangle');
  } catch {
    // Ignore unsupported audio environments.
  }
}

export function playCardSelectSound(selectedCount: number) {
  try {
    const audio = ensureAudio();
    if (!audio) return;
    const { ctx: context, master: destination } = audio;
    const now = context.currentTime;
    chime(context, destination, scaleFreq(392, selectedCount), now, 0.12, 0.08);
    if (selectedCount >= 2) {
      chime(context, destination, scaleFreq(392, selectedCount + 2), now + 0.08, 0.18, 0.09);
    }
  } catch {
    // Ignore unsupported audio environments.
  }
}

export function playCardDeselectSound() {
  try {
    const audio = ensureAudio();
    if (!audio) return;
    const { ctx: context, master: destination } = audio;
    const now = context.currentTime;
    chime(context, destination, scaleFreq(330, 1), now, 0.12, 0.05);
  } catch {
    // Ignore unsupported audio environments.
  }
}

export function playCardMarkSound(value: number) {
  try {
    const audio = ensureAudio();
    if (!audio) return;
    const { ctx: context, master: destination } = audio;
    const now = context.currentTime;
    const step = Math.abs(value) % ETHIO_PENTATONIC_OFFSETS.length;
    chime(context, destination, scaleFreq(440, step), now, 0.09, 0.05);
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
    chime(context, destination, scaleFreq(349, 0), now, 0.16, 0.08);
    chime(context, destination, scaleFreq(349, 2), now + 0.08, 0.17, 0.1);
    chime(context, destination, scaleFreq(349, 4), now + 0.16, 0.22, 0.11);
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
    chime(context, destination, scaleFreq(294, 0), now, 0.2, 0.09);
    chime(context, destination, scaleFreq(294, 2), now + 0.09, 0.2, 0.1);
    chime(context, destination, scaleFreq(294, 4), now + 0.18, 0.26, 0.1);
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
    const step = Math.abs(number) % ETHIO_PENTATONIC_OFFSETS.length;
    chime(context, destination, scaleFreq(370, step), now, 0.1, 0.05);
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
    tone(context, destination, scaleFreq(220, 2), now, 0.2, 0.07, 'triangle');
    tone(context, destination, scaleFreq(220, 1), now + 0.11, 0.2, 0.06, 'triangle');
    tone(context, destination, scaleFreq(220, 0), now + 0.22, 0.24, 0.07, 'sawtooth');
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

    chime(context, destination, scaleFreq(330, 0), now, 0.22, 0.09);
    chime(context, destination, scaleFreq(330, 2), now + 0.08, 0.22, 0.1);
    chime(context, destination, scaleFreq(330, 4), now + 0.16, 0.25, 0.11);
    chime(context, destination, scaleFreq(330, 7), now + 0.26, 0.36, 0.12);
  } catch {
    // Ignore unsupported audio environments.
  }
}

export function startLoginBackgroundMusic() {
  try {
    if (typeof window === 'undefined') return;
    if (!bgmAudio) {
      bgmAudio = new Audio(LOGIN_BGM_SRC);
      bgmAudio.loop = true;
      bgmAudio.preload = 'auto';
      bgmAudio.volume = 0.35;
    }
    void bgmAudio.play().catch(() => {
      bindBgmRetry();
    });
  } catch {
    // Ignore unsupported audio environments.
  }
}

export function stopLoginBackgroundMusic() {
  try {
    if (!bgmAudio) return;
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
  } catch {
    // Ignore unsupported audio environments.
  }
}

export function announceCalledNumber(number: number, isFirstFive: boolean) {
  try {
    if (number < 1 || number > 75) return;
    // Always emit a loud reminder tone, even when voice synthesis is unavailable.
    playLoudAlertTone(isFirstFive);
    playNumberCalledSound(number);
    if (!hasSpeechSupport()) return;
    announceQueue.push({ number, strong: isFirstFive });
    processAnnounceQueue();
  } catch {
    // Ignore unsupported audio environments.
  }
}

export function stopCalledNumberAnnouncements() {
  try {
    announceQueue = [];
    announcing = false;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setBgmVolume(0.35);
  } catch {
    // Ignore unsupported audio environments.
  }
}
