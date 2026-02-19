import { generateCard } from './utils/cardGenerator.js';
import { checkWin } from './utils/winChecker.js';
import jwt from 'jsonwebtoken';

const PHASES = { COUNTDOWN: 'COUNTDOWN', ACTIVE: 'ACTIVE', ENDED: 'ENDED' };

function cardKey(card) {
  return card.flat().join(',');
}

export class GameManager {
  constructor(io, { countdownSeconds = 60, callIntervalMs = 4000 } = {}) {
    this.io = io;
    this.countdownSeconds = countdownSeconds;
    this.callIntervalMs = callIntervalMs;

    this.players = new Map(); // socketId -> { nickname, telegramUserId, card, marked:Set<string>, reservedSlots:number[] }
    this.usedCards = new Set(); // unique card signatures this round
    this.reservedSlots = new Set(); // shared slot ids (1..30) reserved this round
    this.calledNumbers = new Set();
    this.phase = PHASES.COUNTDOWN;
    this.countdown = countdownSeconds;
    this.countdownTimer = null;
    this.callTimer = null;
    this.lastWinners = []; // { nickname, at }
  }

  start() {
    this.startCountdown();
  }

  startCountdown() {
    this.phase = PHASES.COUNTDOWN;
    this.countdown = this.countdownSeconds;
    this.calledNumbers.clear();
    this.usedCards.clear();
    this.reservedSlots.clear();
    this.io.emit('countdown', { timeLeft: this.countdown });

    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
    this.countdownTimer = setInterval(() => {
      this.countdown -= 1;
      this.io.emit('countdown', { timeLeft: this.countdown });
      if (this.countdown <= 0) {
        clearInterval(this.countdownTimer);
        this.beginActive();
      }
    }, 1000);
  }

  beginActive() {
    this.phase = PHASES.ACTIVE;
    this.io.emit('gameStart');
    this.callNextNumber();
    if (this.callTimer) {
      clearInterval(this.callTimer);
    }
    this.callTimer = setInterval(() => this.callNextNumber(), this.callIntervalMs);
  }

  callNextNumber() {
    if (this.phase !== PHASES.ACTIVE) return;
    if (this.calledNumbers.size >= 75) return;

    let num;
    do {
      num = Math.floor(Math.random() * 75) + 1;
    } while (this.calledNumbers.has(num));
    this.calledNumbers.add(num);
    this.io.emit('numberCalled', { number: num, calledNumbers: [...this.calledNumbers] });

    // Auto-end round after 5 numbers for demo/quick cycle if no winner claimed
    if (this.calledNumbers.size >= 5) {
      this.phase = PHASES.ENDED;
      clearInterval(this.callTimer);
      this.io.emit('gameEnd', { winnerNickname: 'No winner', winningCard: null });
      setTimeout(() => this.startCountdown(), 3000);
    }
  }

  registerSocket(socket) {
    socket.on('join', (payload) => this.handleJoin(socket, payload));
    socket.on('reserveCards', ({ slots }) => this.handleReserve(socket, slots));
    socket.on('releaseCards', ({ slots }) => this.handleRelease(socket, slots));
    socket.on('markCell', (payload) => this.handleMark(socket, payload));
    socket.on('claimBingo', () => this.handleClaim(socket));
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  handleJoin(socket, { nickname, token } = {}) {
    if (this.players.size >= 15) {
      socket.emit('error', { message: 'Game is full (max 15 players).' });
      return;
    }
    if (!token || typeof token !== 'string') {
      socket.emit('error', { message: 'Authorization required.' });
      return;
    }
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || '');
    } catch {
      socket.emit('error', { message: 'Invalid authorization.' });
      return;
    }
    const telegramUserId = String(payload.telegramUserId || '');
    const safeNickname = String(payload.nickname || nickname || 'Player').trim();
    if (!telegramUserId) {
      socket.emit('error', { message: 'Invalid user.' });
      return;
    }
    for (const player of this.players.values()) {
      if (player.telegramUserId === telegramUserId) {
        socket.emit('error', { message: 'This Telegram user is already in the game.' });
        return;
      }
    }

    const card = this.generateUniqueCard();
    const marked = new Set(['2-2']); // free
    this.players.set(socket.id, { nickname: safeNickname, telegramUserId, card, marked, reservedSlots: [] });

    socket.emit('joined', {
      playerId: socket.id,
      card,
      currentState: {
        phase: this.phase,
        countdown: this.phase === PHASES.COUNTDOWN ? this.countdown : 0,
        calledNumbers: [...this.calledNumbers],
        winners: this.lastWinners,
        takenSlots: [...this.reservedSlots],
      }
    });

    this.io.emit('playerJoined', { nickname: safeNickname, playerCount: this.players.size });

    // Send immediate timer snapshot if in countdown
    if (this.phase === PHASES.COUNTDOWN) socket.emit('countdown', { timeLeft: this.countdown });
    if (this.phase === PHASES.ACTIVE) socket.emit('gameStart');
  }

  handleReserve(socket, slots) {
    const player = this.players.get(socket.id);
    if (!player || !Array.isArray(slots)) return;
    if (this.reservedSlots.size >= 30) {
      socket.emit('error', { message: 'All cards are reserved for this round.' });
      return;
    }
    const prevSlots = [...player.reservedSlots];
    if (prevSlots.length) {
      for (const n of prevSlots) {
        this.reservedSlots.delete(n);
      }
      player.reservedSlots = [];
    }

    const normalized = Array.from(
      new Set(
        slots
          .map((n) => Number(n))
          .filter((n) => Number.isInteger(n) && n >= 1 && n <= 30),
      ),
    );
    const requested = normalized.slice(0, 2);
    if (requested.length < 2) {
      socket.emit('error', { message: 'Select 2 cards to join the game.' });
      return;
    }

    const blocked = requested.filter((n) => this.reservedSlots.has(n));
    if (blocked.length) {
      if (prevSlots.length) {
        this.io.emit('cardsTaken', { slots: [...this.reservedSlots] });
      }
      socket.emit('error', {
        message: `Card${blocked.length > 1 ? 's' : ''} ${blocked.join(', ')} ${blocked.length > 1 ? 'are' : 'is'} already reserved.`
      });
      return;
    }

    for (const n of requested) {
      this.reservedSlots.add(n);
      player.reservedSlots.push(n);
    }
    this.io.emit('cardsTaken', { slots: [...this.reservedSlots] });
  }

  handleRelease(socket, slots) {
    const player = this.players.get(socket.id);
    if (!player || !Array.isArray(slots)) return;
    const normalized = slots
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 30);
    let changed = false;
    player.reservedSlots = player.reservedSlots.filter((n) => {
      if (normalized.includes(n)) {
        this.reservedSlots.delete(n);
        changed = true;
        return false;
      }
      return true;
    });
    if (changed) {
      this.io.emit('cardsTaken', { slots: [...this.reservedSlots] });
    }
  }

  handleDisconnect(socket) {
    const player = this.players.get(socket.id);
    if (player) {
      for (const n of player.reservedSlots) {
        this.reservedSlots.delete(n);
      }
      this.io.emit('cardsTaken', { slots: [...this.reservedSlots] });
      this.players.delete(socket.id);
    }
  }

  handleMark(socket, { row, col }) {
    const player = this.players.get(socket.id);
    if (!player) return;

    if (this.phase !== PHASES.ACTIVE) return;
    const key = `${row}-${col}`;
    if (player.marked.has(key)) return;

    const value = player.card?.[row]?.[col];
    if (value === undefined) return;
    if (value !== 'FREE' && !this.calledNumbers.has(value)) return;

    player.marked.add(key);
    socket.emit('markConfirmed', { row, col }); // optional ack
  }

  handleClaim(socket) {
    const player = this.players.get(socket.id);
    if (!player || this.phase !== PHASES.ACTIVE) return;

    if (checkWin(player.marked)) {
      this.phase = PHASES.ENDED;
      clearInterval(this.callTimer);
      const winner = { nickname: player.nickname, at: Date.now() };
      this.lastWinners.unshift(winner);
      this.lastWinners = this.lastWinners.slice(0, 10);

      this.io.emit('gameEnd', { winnerNickname: player.nickname, winningCard: player.card });
      setTimeout(() => this.startCountdown(), 3000);
    } else {
      socket.emit('error', { message: 'No valid Bingo yet.' });
    }
  }

  generateUniqueCard() {
    let card;
    let key;
    let attempts = 0;
    do {
      card = generateCard();
      key = cardKey(card);
      attempts += 1;
    } while (this.usedCards.has(key) && attempts < 200);
    this.usedCards.add(key);
    return card;
  }
}
