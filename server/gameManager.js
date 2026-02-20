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

    this.players = new Map(); // socketId -> { nickname, telegramUserId, cards, markedByCard:Set<string>[], reservedSlots:number[] }
    this.reservedSlots = new Set(); // shared slot ids (1..30) reserved this round
    this.cardPool = this.createCardPool(30); // fixed card pool per round
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

  getCurrentState() {
    const calledNumbers = [...this.calledNumbers];
    const lastNumber = calledNumbers.length ? calledNumbers[calledNumbers.length - 1] : null;
    return {
      phase: this.phase,
      countdown: this.phase === PHASES.COUNTDOWN ? this.countdown : 0,
      calledNumbers,
      lastNumber,
      winners: this.lastWinners,
      takenSlots: [...this.reservedSlots],
    };
  }

  startCountdown() {
    this.phase = PHASES.COUNTDOWN;
    this.countdown = this.countdownSeconds;
    this.calledNumbers.clear();
    this.cardPool = this.createCardPool(30);
    this.reservedSlots.clear();
    for (const [socketId, player] of this.players.entries()) {
      this.clearPlayerCards(player);
      this.io.to(socketId).emit('cardsAssigned', { cards: [] });
    }
    this.io.emit('cardsTaken', { slots: [] });
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
    socket.on('syncState', () => this.handleSyncState(socket));
    socket.on('reserveCards', ({ slots }) => this.handleReserve(socket, slots));
    socket.on('releaseCards', ({ slots }) => this.handleRelease(socket, slots));
    socket.on('markCell', (payload) => this.handleMark(socket, payload));
    socket.on('claimBingo', () => this.handleClaim(socket));
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  handleJoin(socket, { nickname, token } = {}) {
    if (this.players.size >= 15) {
      socket.emit('gameError', { message: 'Game is full (max 15 players).' });
      return;
    }
    if (!token || typeof token !== 'string') {
      socket.emit('gameError', { message: 'Authorization required.' });
      return;
    }
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || '');
    } catch {
      socket.emit('gameError', { message: 'Invalid authorization.' });
      return;
    }
    const telegramUserId = String(payload.telegramUserId || '');
    const safeNickname = String(payload.nickname || nickname || 'Player').trim();
    if (!telegramUserId) {
      socket.emit('gameError', { message: 'Invalid user.' });
      return;
    }
    for (const player of this.players.values()) {
      if (player.telegramUserId === telegramUserId) {
        socket.emit('gameError', { message: 'This Telegram user is already in the game.' });
        return;
      }
    }

    const existing = this.players.get(socket.id);
    if (existing) {
      existing.nickname = safeNickname;
      existing.telegramUserId = telegramUserId;
    } else {
      this.players.set(socket.id, {
        nickname: safeNickname,
        telegramUserId,
        cards: [],
        markedByCard: [],
        reservedSlots: [],
      });
    }
    const player = this.players.get(socket.id);

    socket.emit('joined', {
      playerId: socket.id,
      cards: player?.cards ?? [],
      currentState: this.getCurrentState(),
    });

    this.io.emit('playerJoined', { nickname: safeNickname, playerCount: this.players.size });

    // Send immediate timer snapshot if in countdown
    if (this.phase === PHASES.COUNTDOWN) socket.emit('countdown', { timeLeft: this.countdown });
    if (this.phase === PHASES.ACTIVE) socket.emit('gameStart');
  }

  handleSyncState(socket) {
    const player = this.players.get(socket.id);
    socket.emit('stateSync', {
      currentState: this.getCurrentState(),
      player: {
        cards: player?.cards ?? [],
        reservedSlots: player?.reservedSlots ?? [],
      },
    });
  }

  handleReserve(socket, slots) {
    const player = this.players.get(socket.id);
    if (!player || !Array.isArray(slots)) return;
    if (this.reservedSlots.size >= 30) {
      socket.emit('gameError', { message: 'All cards are reserved for this round.' });
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
      socket.emit('gameError', { message: 'Select 2 cards to join the game.' });
      return;
    }

    const blocked = requested.filter((n) => this.reservedSlots.has(n));
    if (blocked.length) {
      if (prevSlots.length) {
        this.io.emit('cardsTaken', { slots: [...this.reservedSlots] });
      }
      socket.emit('gameError', {
        message: `Card${blocked.length > 1 ? 's' : ''} ${blocked.join(', ')} ${blocked.length > 1 ? 'are' : 'is'} already reserved.`
      });
      return;
    }

    for (const n of requested) {
      this.reservedSlots.add(n);
      player.reservedSlots.push(n);
    }
    this.assignCardsForPlayer(player, requested);
    socket.emit('cardsAssigned', { cards: player.cards });
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
      this.clearPlayerCards(player);
      socket.emit('cardsAssigned', { cards: [] });
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

  handleMark(socket, { cardIndex, row, col }) {
    const player = this.players.get(socket.id);
    if (!player) return;

    if (this.phase !== PHASES.ACTIVE) return;
    if (!Number.isInteger(cardIndex) || !Number.isInteger(row) || !Number.isInteger(col)) return;
    if (cardIndex < 0 || cardIndex > 1) return;
    if (row < 0 || row > 4 || col < 0 || col > 4) return;

    const card = player.cards?.[cardIndex];
    if (!card) return;

    const markedSet = player.markedByCard?.[cardIndex];
    if (!markedSet) return;

    const key = `${row}-${col}`;
    if (markedSet.has(key)) return;

    const cell = card?.[row]?.[col];
    if (!cell) return;
    if (cell.value !== 0 && !this.calledNumbers.has(cell.value)) return;

    markedSet.add(key);
    card[row][col] = { ...cell, marked: true };
    socket.emit('markConfirmed', { cardIndex, row, col });

    if (checkWin(markedSet)) {
      this.endRoundWithWinner(player, cardIndex);
    }
  }

  handleClaim(socket) {
    const player = this.players.get(socket.id);
    if (!player || this.phase !== PHASES.ACTIVE) return;

    const winningCardIndex = player.markedByCard.findIndex((markedSet) => checkWin(markedSet));
    if (winningCardIndex >= 0) {
      this.endRoundWithWinner(player, winningCardIndex);
      return;
    }
    socket.emit('gameError', { message: 'No valid Bingo yet.' });
  }

  endRoundWithWinner(player, winningCardIndex) {
    if (this.phase !== PHASES.ACTIVE) return;
    this.phase = PHASES.ENDED;
    clearInterval(this.callTimer);
    const winner = { nickname: player.nickname, at: Date.now() };
    this.lastWinners.unshift(winner);
    this.lastWinners = this.lastWinners.slice(0, 10);

    this.io.emit('gameEnd', {
      winnerNickname: player.nickname,
      winningCard: player.cards?.[winningCardIndex] ?? null,
      winningCards: player.cards ?? [],
    });
    setTimeout(() => this.startCountdown(), 3000);
  }

  createCardPool(count) {
    const pool = [];
    const seen = new Set();
    while (pool.length < count) {
      const rawCard = generateCard();
      const key = cardKey(rawCard);
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push(this.toCellCard(rawCard));
    }
    return pool;
  }

  toCellCard(rawCard) {
    return rawCard.map((row, r) =>
      row.map((value, c) => ({
        value: value === 'FREE' ? 0 : Number(value),
        marked: r === 2 && c === 2,
        row: r,
        col: c,
      })),
    );
  }

  cloneCellCard(card) {
    return card.map((row) => row.map((cell) => ({ ...cell })));
  }

  assignCardsForPlayer(player, slots) {
    const cards = slots
      .map((slot) => this.cardPool[slot - 1])
      .filter(Boolean)
      .map((card) => this.cloneCellCard(card));

    player.cards = cards;
    player.markedByCard = cards.map(() => new Set(['2-2']));
  }

  clearPlayerCards(player) {
    player.cards = [];
    player.markedByCard = [];
    player.reservedSlots = [];
  }
}
