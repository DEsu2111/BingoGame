export class TimerService {
    constructor(io, { countdownSeconds, callIntervalMs, onCountdownTick, onCountdownEnd, onCallNextNumber }) {
        this.io = io;
        this.countdownSeconds = countdownSeconds;
        this.callIntervalMs = callIntervalMs;
        this.onCountdownTick = onCountdownTick;
        this.onCountdownEnd = onCountdownEnd;
        this.onCallNextNumber = onCallNextNumber;

        this.countdownTimer = null;
        this.callTimer = null;
    }

    startCountdown() {
        this.stopAll();
        this.countdownTimer = setInterval(() => {
            this.onCountdownTick();
        }, 1000);
    }

    stopAll() {
        if (this.countdownTimer) clearInterval(this.countdownTimer);
        if (this.callTimer) clearInterval(this.callTimer);
        this.countdownTimer = null;
        this.callTimer = null;
    }

    beginActive() {
        this.stopAll();
        this.callTimer = setInterval(() => {
            this.onCallNextNumber();
        }, this.callIntervalMs);
    }
}
