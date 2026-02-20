import { generateCard } from './utils/cardGenerator.js';
import { checkWin } from './utils/winChecker.js';
import jwt from 'jsonwebtoken';

const PHASES = { COUNTDOWN: 'COUNTDOWN', ACTIVE: 'ACTIVE', ENDED: 'ENDED' };

function cardKey(card) {
  return card.flat().join(',');
}

export class GameManager {
  constructor(io, { countdownSeconds = 60, callIntervalMs = 4000 } = {}) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required to start the game server.');
    }
    this.io = io;
    this.jwtSecret = process.env.JWT_SECRET;
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
    this.commandResponses = new Map(); // `${actorKey}:${action}:${requestId}` -> { response, at }
    this.commandWindows = new Map(); // `${actorKey}:${action}` -> { startedAt, count }
    this.commandReplayTtlMs = 60_000;
    this.rateLimits = {
      join: { windowMs: 10_000, max: 6 },
      reserveCards: { windowMs: 10_000, max: 12 },
      releaseCards: { windowMs: 10_000, max: 12 },
      markCell: { windowMs: 4_000, max: 36 },
      claimBingo: { windowMs: 10_000, max: 6 },
    };
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

  buildAck(ok, code, message, data = null) {
    return { ok, code, message, data };
  }

  safeAck(ack, payload) {
    if (typeof ack === 'function') {
      ack(payload);
    }
  }

  getActorKey(socket) {
    const player = this.players.get(socket.id);
    return player?.telegramUserId ? `user:${player.telegramUserId}` : `socket:${socket.id}`;
  }

  pruneCommandCaches() {
    const now = Date.now();
    for (const [key, value] of this.commandResponses.entries()) {
      if (now - value.at > this.commandReplayTtlMs) {
        this.commandResponses.delete(key);
      }
    }
    if (this.commandResponses.size > 2000) {
      const sorted = [...this.commandResponses.entries()].sort((a, b) => a[1].at - b[1].at);
      const overflow = this.commandResponses.size - 1500;
      for (let i = 0; i < overflow; i += 1) {
        this.commandResponses.delete(sorted[i][0]);
      }
    }
  }

  getReplayKey(socket, action, requestId) {
    return `${this.getActorKey(socket)}:${action}:${requestId}`;
  }

  getReplayResponse(socket, action, requestId) {
    if (!requestId) return null;
    const replayKey = this.getReplayKey(socket, action, requestId);
    const replay = this.commandResponses.get(replayKey);
    if (!replay) return null;
    if (Date.now() - replay.at > this.commandReplayTtlMs) {
      this.commandResponses.delete(replayKey);
      return null;
    }
    return replay.response;
  }

  storeReplayResponse(socket, action, requestId, response) {
    if (!requestId) return;
    const replayKey = this.getReplayKey(socket, action, requestId);
    this.commandResponses.set(replayKey, { response, at: Date.now() });
    this.pruneCommandCaches();
  }

  isRateLimited(socket, action) {
    const limit = this.rateLimits[action];
    if (!limit) return false;

    const key = `${this.getActorKey(socket)}:${action}`;
    const now = Date.now();
    const entry = this.commandWindows.get(key);
    if (!entry || now - entry.startedAt >= limit.windowMs) {
      this.commandWindows.set(key, { startedAt: now, count: 1 });
      return false;
    }

    entry.count += 1;
    return entry.count > limit.max;
  }

  guardCommand(socket, action, rawPayload, ack) {
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {};
    const requestId = typeof payload.requestId === 'string' ? payload.requestId.trim() : '';

    const replayResponse = this.getReplayResponse(socket, action, requestId);
    if (replayResponse) {
      this.safeAck(ack, replayResponse);
      return null;
    }

    if (this.isRateLimited(socket, action)) {
      const response = this.buildAck(false, 'RATE_LIMIT', 'Too many requests. Slow down.');
      this.safeAck(ack, response);
      socket.emit('gameError', { code: response.code, message: response.message });
      this.storeReplayResponse(socket, action, requestId, response);
      return null;
    }

    return { payload, requestId };
  }

  respondSuccess(socket, action, requestId, ack, code, message, data = null) {
    const response = this.buildAck(true, code, message, data);
    this.safeAck(ack, response);
    this.storeReplayResponse(socket, action, requestId, response);
    return response;
  }

  respondError(socket, action, requestId, ack, code, message, emitGameError = true) {
    const response = this.buildAck(false, code, message);
    this.safeAck(ack, response);
    if (emitGameError) {
      socket.emit('gameError', { code, message });
    }
    this.storeReplayResponse(socket, action, requestId, response);
    return response;
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
    socket.on('join', (payload, ack) => this.handleJoin(socket, payload, ack));
    socket.on('syncState', () => this.handleSyncState(socket));
    socket.on('reserveCards', (payload, ack) => this.handleReserve(socket, payload, ack));
    socket.on('releaseCards', (payload, ack) => this.handleRelease(socket, payload, ack));
    socket.on('markCell', (payload, ack) => this.handleMark(socket, payload, ack));
    socket.on('claimBingo', (payloadOrAck, maybeAck) => {
      const payload = typeof payloadOrAck === 'function' || payloadOrAck == null ? {} : payloadOrAck;
      const ack = typeof payloadOrAck === 'function' ? payloadOrAck : maybeAck;
      this.handleClaim(socket, payload, ack);
    });
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  handleJoin(socket, rawPayload = {}, ack) {
    const guarded = this.guardCommand(socket, 'join', rawPayload, ack);
    if (!guarded) return;
    const { payload, requestId } = guarded;
    const nickname = payload.nickname;
    const token = payload.token;

    if (this.players.size >= 15) {
      this.respondError(socket, 'join', requestId, ack, 'GAME_FULL', 'Game is full (max 15 players).');
      return;
    }
    if (!token || typeof token !== 'string') {
      this.respondError(socket, 'join', requestId, ack, 'AUTH_REQUIRED', 'Authorization required.');
      return;
    }
    let tokenPayload;
    try {
      tokenPayload = jwt.verify(token, this.jwtSecret);
    } catch {
      this.respondError(socket, 'join', requestId, ack, 'AUTH_INVALID', 'Invalid authorization.');
      return;
    }
    const telegramUserId = String(tokenPayload.telegramUserId || '');
    const safeNickname = String(tokenPayload.nickname || nickname || 'Player').trim();
    if (!telegramUserId) {
      this.respondError(socket, 'join', requestId, ack, 'INVALID_USER', 'Invalid user.');
      return;
    }
    for (const player of this.players.values()) {
      if (player.telegramUserId === telegramUserId && player !== this.players.get(socket.id)) {
        this.respondError(socket, 'join', requestId, ack, 'ALREADY_ACTIVE', 'This Telegram user is already in the game.');
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

    const joinedPayload = {
      playerId: socket.id,
      nickname: safeNickname,
      cards: player?.cards ?? [],
      currentState: this.getCurrentState(),
    };
    socket.emit('joined', joinedPayload);
    this.respondSuccess(socket, 'join', requestId, ack, 'JOINED', 'Joined successfully.', joinedPayload);

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

  handleReserve(socket, rawPayload = {}, ack) {
    const guarded = this.guardCommand(socket, 'reserveCards', rawPayload, ack);
    if (!guarded) return;
    const { payload, requestId } = guarded;
    const slots = payload.slots;

    const player = this.players.get(socket.id);
    if (!player) {
      this.respondError(socket, 'reserveCards', requestId, ack, 'NOT_JOINED', 'Join first before reserving cards.');
      return;
    }
    if (!Array.isArray(slots)) {
      this.respondError(socket, 'reserveCards', requestId, ack, 'INVALID_SLOTS', 'Slots must be an array.');
      return;
    }
    if (this.reservedSlots.size >= 30) {
      this.respondError(socket, 'reserveCards', requestId, ack, 'CARDS_FULL', 'All cards are reserved for this round.');
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
      this.respondError(socket, 'reserveCards', requestId, ack, 'SELECT_TWO', 'Select 2 cards to join the game.');
      return;
    }

    const blocked = requested.filter((n) => this.reservedSlots.has(n));
    if (blocked.length) {
      if (prevSlots.length) {
        this.io.emit('cardsTaken', { slots: [...this.reservedSlots] });
      }
      this.respondError(
        socket,
        'reserveCards',
        requestId,
        ack,
        'SLOTS_TAKEN',
        `Card${blocked.length > 1 ? 's' : ''} ${blocked.join(', ')} ${blocked.length > 1 ? 'are' : 'is'} already reserved.`,
      );
      return;
    }

    for (const n of requested) {
      this.reservedSlots.add(n);
      player.reservedSlots.push(n);
    }
    this.assignCardsForPlayer(player, requested);
    socket.emit('cardsAssigned', { cards: player.cards });
    this.io.emit('cardsTaken', { slots: [...this.reservedSlots] });
    this.respondSuccess(socket, 'reserveCards', requestId, ack, 'RESERVED', 'Cards reserved.', {
      cards: player.cards,
      takenSlots: [...this.reservedSlots],
      reservedSlots: [...player.reservedSlots],
    });
  }

  handleRelease(socket, rawPayload = {}, ack) {
    const guarded = this.guardCommand(socket, 'releaseCards', rawPayload, ack);
    if (!guarded) return;
    const { payload, requestId } = guarded;
    const slots = payload.slots;

    const player = this.players.get(socket.id);
    if (!player) {
      this.respondError(socket, 'releaseCards', requestId, ack, 'NOT_JOINED', 'Join first before releasing cards.');
      return;
    }
    if (!Array.isArray(slots)) {
      this.respondError(socket, 'releaseCards', requestId, ack, 'INVALID_SLOTS', 'Slots must be an array.');
      return;
    }
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
    this.respondSuccess(socket, 'releaseCards', requestId, ack, 'RELEASED', 'Cards released.', {
      changed,
      cards: player.cards,
      takenSlots: [...this.reservedSlots],
      reservedSlots: [...player.reservedSlots],
    });
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
    for (const key of this.commandWindows.keys()) {
      if (key.includes(`socket:${socket.id}`)) {
        this.commandWindows.delete(key);
      }
    }
    for (const key of this.commandResponses.keys()) {
      if (key.includes(`socket:${socket.id}`)) {
        this.commandResponses.delete(key);
      }
    }
  }

  handleMark(socket, rawPayload = {}, ack) {
    const guarded = this.guardCommand(socket, 'markCell', rawPayload, ack);
    if (!guarded) return;
    const { payload, requestId } = guarded;
    const { cardIndex, row, col } = payload;
    const player = this.players.get(socket.id);
    if (!player) {
      this.respondError(socket, 'markCell', requestId, ack, 'NOT_JOINED', 'Join first before marking.', false);
      return;
    }

    if (this.phase !== PHASES.ACTIVE) {
      this.respondError(socket, 'markCell', requestId, ack, 'ROUND_NOT_ACTIVE', 'Round is not active.', false);
      return;
    }
    if (!Number.isInteger(cardIndex) || !Number.isInteger(row) || !Number.isInteger(col)) {
      this.respondError(socket, 'markCell', requestId, ack, 'INVALID_POSITION', 'Invalid cell position.', false);
      return;
    }
    if (cardIndex < 0 || cardIndex > 1 || row < 0 || row > 4 || col < 0 || col > 4) {
      this.respondError(socket, 'markCell', requestId, ack, 'INVALID_POSITION', 'Invalid cell position.', false);
      return;
    }

    const card = player.cards?.[cardIndex];
    if (!card) {
      this.respondError(socket, 'markCell', requestId, ack, 'CARD_NOT_ASSIGNED', 'Card not assigned.', false);
      return;
    }

    const markedSet = player.markedByCard?.[cardIndex];
    if (!markedSet) {
      this.respondError(socket, 'markCell', requestId, ack, 'CARD_NOT_ASSIGNED', 'Card not assigned.', false);
      return;
    }

    const key = `${row}-${col}`;
    if (markedSet.has(key)) {
      this.respondError(socket, 'markCell', requestId, ack, 'ALREADY_MARKED', 'Cell already marked.', false);
      return;
    }

    const cell = card?.[row]?.[col];
    if (!cell) {
      this.respondError(socket, 'markCell', requestId, ack, 'INVALID_POSITION', 'Invalid cell position.', false);
      return;
    }
    if (cell.value !== 0 && !this.calledNumbers.has(cell.value)) {
      this.respondError(socket, 'markCell', requestId, ack, 'NUMBER_NOT_CALLED', 'Number is not called yet.', false);
      return;
    }

    markedSet.add(key);
    card[row][col] = { ...cell, marked: true };
    socket.emit('markConfirmed', { cardIndex, row, col });
    this.respondSuccess(socket, 'markCell', requestId, ack, 'MARKED', 'Cell marked.', { cardIndex, row, col });

    if (checkWin(markedSet)) {
      this.endRoundWithWinner(player, cardIndex);
    }
  }

  handleClaim(socket, rawPayload = {}, ack) {
    const guarded = this.guardCommand(socket, 'claimBingo', rawPayload, ack);
    if (!guarded) return;
    const { requestId } = guarded;

    const player = this.players.get(socket.id);
    if (!player) {
      this.respondError(socket, 'claimBingo', requestId, ack, 'NOT_JOINED', 'Join first before claiming.');
      return;
    }
    if (this.phase !== PHASES.ACTIVE) {
      this.respondError(socket, 'claimBingo', requestId, ack, 'ROUND_NOT_ACTIVE', 'Round is not active.');
      return;
    }

    const winningCardIndex = player.markedByCard.findIndex((markedSet) => checkWin(markedSet));
    if (winningCardIndex >= 0) {
      this.endRoundWithWinner(player, winningCardIndex);
      this.respondSuccess(socket, 'claimBingo', requestId, ack, 'BINGO_ACCEPTED', 'Bingo accepted.', {
        winnerNickname: player.nickname,
        winningCardIndex,
      });
      return;
    }
    this.respondError(socket, 'claimBingo', requestId, ack, 'NO_BINGO', 'No valid Bingo yet.');
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
