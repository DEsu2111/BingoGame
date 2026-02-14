export function playWinSound() {
  try {
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const now = context.currentTime;

    const boom = context.createOscillator();
    const boomGain = context.createGain();
    boom.type = 'triangle';
    boom.frequency.setValueAtTime(180, now);
    boom.frequency.exponentialRampToValueAtTime(80, now + 0.35);
    boomGain.gain.setValueAtTime(0.28, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    boom.connect(boomGain);
    boomGain.connect(context.destination);
    boom.start(now);
    boom.stop(now + 0.45);

    const chime = context.createOscillator();
    const chimeGain = context.createGain();
    chime.type = 'sine';
    chime.frequency.setValueAtTime(780, now + 0.08);
    chime.frequency.setValueAtTime(1040, now + 0.16);
    chimeGain.gain.setValueAtTime(0.001, now + 0.08);
    chimeGain.gain.exponentialRampToValueAtTime(0.14, now + 0.12);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
    chime.connect(chimeGain);
    chimeGain.connect(context.destination);
    chime.start(now + 0.08);
    chime.stop(now + 0.52);
  } catch {
    // Ignore unsupported audio environments.
  }
}
