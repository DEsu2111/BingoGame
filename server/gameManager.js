import { generateCard } from './utils/cardGenerator.js';
import jwt from 'jsonwebtoken';
import { InMemoryGameStateStore } from './gameStateStore.js';
import { InMemoryCommandGuardStore } from './commandGuardStore.js';
import { InMemoryRuntimeMetaStore } from './runtimeMetaStore.js';

// Import New Services
import { TimerService } from './services/TimerService.js';
import { PresenceService } from './services/PresenceService.js';
import { BingoEngine } from './services/BingoEngine.js';

const PHASES = { COUNTDOWN: 'COUNTDOWN', ACTIVE: 'ACTIVE', ENDED: 'ENDED' };
const MAX_CALLS_PER_ROUND = 5;
const RESULT_ANNOUNCE_DELAY_MS = 5000;

function cardKey(card) {
  return card.flat().join(',');
}

export class GameManager {
  constructor(
    io,
    {
      countdownSeconds = 60,
      callIntervalMs = 4000,
      stateStore,
      commandGuardStore,
      runtimeMetaStore,
      serverInstanceId,
      presenceTtlMs = 120_000,
      presenceHeartbeatMs = 30_000,
    } = {},
  ) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required to start the game server.');
    }
    this.io = io;
    this.jwtSecret = process.env.JWT_SECRET;
    this.countdownSeconds = countdownSeconds;
    this.callIntervalMs = callIntervalMs;
    this.stateStore = stateStore ?? new InMemoryGameStateStore(countdownSeconds);
    this.commandGuardStore = commandGuardStore ?? new InMemoryCommandGuardStore();
    this.runtimeMetaStore = runtimeMetaStore ?? new InMemoryRuntimeMetaStore();
    this.serverInstanceId = serverInstanceId ?? `srv-${process.pid}`;

    // Initialize Services
    this.presenceService = new PresenceService(this.runtimeMetaStore, this.serverInstanceId, presenceTtlMs);
    this.timerService = new TimerService(io, {
      countdownSeconds,
      callIntervalMs,
      onCountdownTick: () => this.tickCountdown(),
      onCallNextNumber: () => this.callNextNumber()
    });

    this.presenceHeartbeatMs = presenceHeartbeatMs;
    this.players = new Map();
    this.cardPool = this.createCardPool(30);
    this.presenceHeartbeatTimer = null;
    this.noWinnerTimeout = null;
    this.commandReplayTtlMs = 60_000;
    this.rateLimits = {
      join: { windowMs: 10_000, max: 6 },
      reserveCards: { windowMs: 10_000, max: 12 },
      releaseCards: { windowMs: 10_000, max: 12 },
      markCell: { windowMs: 4_000, max: 36 },
      claimBingo: { windowMs: 10_000, max: 6 },
    };
  }

  async start() {
    this.startPresenceHeartbeat();
    await this.startCountdown();
  }

  async getCurrentState() {
    const state = await this.stateStore.getRoundState();
    const takenSlots = await this.stateStore.getTakenSlots();
    const winners = await this.runtimeMetaStore.getWinners(10);
    return {
      phase: state.phase,
      countdown: state.countdown,
      calledNumbers: state.calledNumbers,
      lastNumber: state.lastNumber,
      winners,
      takenSlots,
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

  startPresenceHeartbeat() {
    if (this.presenceHeartbeatTimer) {
      clearInterval(this.presenceHeartbeatTimer);
    }
    this.presenceHeartbeatTimer = setInterval(() => {
      void this.refreshPresenceForPlayers();
    }, this.presenceHeartbeatMs);
  }

  async refreshPresenceForPlayers() {
    const jobs = [];
    for (const [socketId, player] of this.players.entries()) {
      if (!player?.telegramUserId) continue;
      jobs.push(this.refreshPresenceForPlayer(socketId, player.telegramUserId));
    }
    await Promise.allSettled(jobs);
  }

  async refreshPresenceForPlayer(socketId, telegramUserId) {
    const ok = await this.presenceService.refreshPresence(telegramUserId, socketId);
    if (ok) return;

    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit('gameError', { code: 'SESSION_TAKEN', message: 'Session is active elsewhere.' });
      socket.disconnect(true);
    } else {
      this.players.delete(socketId);
    }
  }

  storeReplayResponse(socket, action, requestId, response) {
    if (!requestId) return;
    const actorKey = this.getActorKey(socket);
    void this.commandGuardStore
      .storeReplayResponse(actorKey, action, requestId, response, this.commandReplayTtlMs)
      .catch((error) => console.error('Failed to store replay response:', error));
  }

  async isRateLimited(socket, action) {
    const limit = this.rateLimits[action];
    if (!limit) return false;
    const actorKey = this.getActorKey(socket);
    return this.commandGuardStore.isRateLimited(actorKey, action, limit.windowMs, limit.max);
  }

  async guardCommand(socket, action, rawPayload, ack) {
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {};
    const requestId = typeof payload.requestId === 'string' ? payload.requestId.trim() : '';
    const actorKey = this.getActorKey(socket);

    const replayResponse = await this.commandGuardStore.getReplayResponse(actorKey, action, requestId);
    if (replayResponse) {
      this.safeAck(ack, replayResponse);
      return null;
    }

    if (await this.isRateLimited(socket, action)) {
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

  async withLock(lockName, ttlMs, fn) {
    const token = await this.stateStore.acquireLock(lockName, ttlMs);
    if (!token) return null;
    try {
      return await fn();
    } finally {
      await this.stateStore.releaseLock(lockName, token);
    }
  }

  async startCountdown() {
    await this.withLock('round-reset', 4000, async () => {
      if (this.noWinnerTimeout) {
        clearTimeout(this.noWinnerTimeout);
        this.noWinnerTimeout = null;
      }
      await this.stateStore.initRound(this.countdownSeconds);
      this.cardPool = this.createCardPool(30);
      for (const [socketId, player] of this.players.entries()) {
        this.clearPlayerCards(player);
        this.io.to(socketId).emit('cardsAssigned', { cards: [] });
      }
      this.io.emit('cardsTaken', { slots: [] });
      this.io.emit('countdown', { timeLeft: this.countdownSeconds });

      this.timerService.startCountdown();
    });
  }

  async tickCountdown() {
    await this.withLock('countdown-tick', 900, async () => {
      const state = await this.stateStore.getRoundState();
      if (state.phase !== PHASES.COUNTDOWN) return;
      const timeLeft = await this.stateStore.decrementCountdown();
      this.io.emit('countdown', { timeLeft });
      if (timeLeft <= 0) {
        await this.beginActive();
      }
    });
  }

  async beginActive() {
    await this.withLock('phase-active', 3000, async () => {
      const state = await this.stateStore.getRoundState();
      if (state.phase !== PHASES.COUNTDOWN) return;
      await this.stateStore.setPhase(PHASES.ACTIVE);
      await this.stateStore.setCountdown(0);
      this.io.emit('gameStart');

      this.timerService.beginActive();
      // Call first number immediately
      await this.callNextNumber();
    });
  }

  async callNextNumber() {
    await this.withLock('call-next-number', Math.max(1000, this.callIntervalMs - 250), async () => {
      const state = await this.stateStore.getRoundState();
      if (state.phase !== PHASES.ACTIVE) return;
      if (state.calledNumbers.length >= MAX_CALLS_PER_ROUND) return;

      let num;
      do {
        num = Math.floor(Math.random() * 75) + 1;
      } while (state.calledNumbers.includes(num));
      const { calledNumbers } = await this.stateStore.addCalledNumber(num);
      this.io.emit('numberCalled', { number: num, calledNumbers });

      if (calledNumbers.length >= MAX_CALLS_PER_ROUND) {
        this.timerService.stopAll();
        if (this.noWinnerTimeout) {
          clearTimeout(this.noWinnerTimeout);
        }
        this.noWinnerTimeout = setTimeout(() => {
          this.noWinnerTimeout = null;
          void this.endRoundWithWinner({ nickname: 'No winner', cards: [] }, -1, false);
        }, RESULT_ANNOUNCE_DELAY_MS);
      }
    });
  }

  registerSocket(socket) {
    const safe = (handler) => (...args) => {
      Promise.resolve(handler(...args)).catch((error) => {
        console.error('Socket handler error:', error);
        socket.emit('gameError', { code: 'SERVER_ERROR', message: 'Internal server error.' });
      });
    };

    socket.on('join', safe((payload, ack) => this.handleJoin(socket, payload, ack)));
    socket.on('syncState', safe(() => this.handleSyncState(socket)));
    socket.on('reserveCards', safe((payload, ack) => this.handleReserve(socket, payload, ack)));
    socket.on('releaseCards', safe((payload, ack) => this.handleRelease(socket, payload, ack)));
    socket.on('markCell', safe((payload, ack) => this.handleMark(socket, payload, ack)));
    socket.on(
      'claimBingo',
      safe((payloadOrAck, maybeAck) => {
        const payload = typeof payloadOrAck === 'function' || payloadOrAck == null ? {} : payloadOrAck;
        const ack = typeof payloadOrAck === 'function' ? payloadOrAck : maybeAck;
        return this.handleClaim(socket, payload, ack);
      }),
    );
    socket.on('disconnect', safe(() => this.handleDisconnect(socket)));
  }

  async handleJoin(socket, rawPayload = {}, ack) {
    const guarded = await this.guardCommand(socket, 'join', rawPayload, ack);
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

    // Use Presence Service check
    const claimed = await this.presenceService.claimPresence(telegramUserId, socket.id);
    if (!claimed) {
      this.respondError(socket, 'join', requestId, ack, 'ALREADY_ACTIVE', 'This Telegram user is already in the game.');
      return;
    }

    const existing = this.players.get(socket.id);
    if (existing?.telegramUserId && existing.telegramUserId !== telegramUserId) {
      await this.presenceService.releasePresence(existing.telegramUserId, socket.id);
    }

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
      currentState: await this.getCurrentState(),
    };
    socket.emit('joined', joinedPayload);
    this.respondSuccess(socket, 'join', requestId, ack, 'JOINED', 'Joined successfully.', joinedPayload);

    this.io.emit('playerJoined', { nickname: safeNickname, playerCount: this.players.size });

    const state = await this.stateStore.getRoundState();
    if (state.phase === PHASES.COUNTDOWN) socket.emit('countdown', { timeLeft: state.countdown });
    if (state.phase === PHASES.ACTIVE) socket.emit('gameStart');
  }

  async handleSyncState(socket) {
    const player = this.players.get(socket.id);
    socket.emit('stateSync', {
      currentState: await this.getCurrentState(),
      player: {
        cards: player?.cards ?? [],
        reservedSlots: player?.reservedSlots ?? [],
      },
    });
  }

  async handleReserve(socket, rawPayload = {}, ack) {
    const guarded = await this.guardCommand(socket, 'reserveCards', rawPayload, ack);
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
    const takenSlots = await this.stateStore.getTakenSlots();
    if (takenSlots.length >= 30) {
      this.respondError(socket, 'reserveCards', requestId, ack, 'CARDS_FULL', 'All cards are reserved for this round.');
      return;
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

    const ownerId = player.telegramUserId || socket.id;
    const reservation = await this.stateStore.reserveSlots(ownerId, requested);
    if (!reservation.ok) {
      this.respondError(socket, 'reserveCards', requestId, ack, 'SLOTS_TAKEN', `Card(s) ${reservation.blocked.join(', ')} taken.`);
      return;
    }

    player.reservedSlots = reservation.reservedSlots;
    this.assignCardsForPlayer(player, reservation.reservedSlots);
    socket.emit('cardsAssigned', { cards: player.cards });
    this.io.emit('cardsTaken', { slots: reservation.takenSlots });
    this.respondSuccess(socket, 'reserveCards', requestId, ack, 'RESERVED', 'Cards reserved.', {
      cards: player.cards,
      takenSlots: reservation.takenSlots,
      reservedSlots: [...player.reservedSlots],
    });
  }

  async handleRelease(socket, rawPayload = {}, ack) {
    const guarded = await this.guardCommand(socket, 'releaseCards', rawPayload, ack);
    if (!guarded) return;
    const { payload, requestId } = guarded;
    const slots = payload.slots;

    const player = this.players.get(socket.id);
    if (!player) return;
    const ownerId = player.telegramUserId || socket.id;
    const result = await this.stateStore.releaseSlots(ownerId, slots);
    player.reservedSlots = result.reservedSlots;

    if (result.changed) {
      this.clearPlayerCards(player);
      socket.emit('cardsAssigned', { cards: [] });
      this.io.emit('cardsTaken', { slots: result.takenSlots });
    }
    this.respondSuccess(socket, 'releaseCards', requestId, ack, 'RELEASED', 'Cards released.', {
      takenSlots: result.takenSlots,
      reservedSlots: [...player.reservedSlots],
    });
  }

  async handleDisconnect(socket) {
    const player = this.players.get(socket.id);
    if (player) {
      const ownerId = player.telegramUserId || socket.id;
      if (player.telegramUserId) {
        await this.presenceService.releasePresence(player.telegramUserId, socket.id);
      }
      const result = await this.stateStore.releaseAll(ownerId);
      this.io.emit('cardsTaken', { slots: result.takenSlots });
      this.players.delete(socket.id);
    }
  }

  async handleMark(socket, rawPayload = {}, ack) {
    const guarded = await this.guardCommand(socket, 'markCell', rawPayload, ack);
    if (!guarded) return;
    const { payload, requestId } = guarded;
    const { cardIndex, row, col } = payload;
    const player = this.players.get(socket.id);
    if (!player) return;

    const state = await this.stateStore.getRoundState();
    if (state.phase !== PHASES.ACTIVE) return;

    const card = player.cards?.[cardIndex];
    const validation = BingoEngine.validateMark(card, row, col, state.calledNumbers);

    if (!validation.valid) {
      this.respondError(socket, 'markCell', requestId, ack, validation.error, 'Invalid mark.', false);
      return;
    }

    const markedSet = player.markedByCard?.[cardIndex];
    const key = `${row}-${col}`;
    if (markedSet.has(key)) return;

    markedSet.add(key);
    card[row][col].marked = true;
    socket.emit('markConfirmed', { cardIndex, row, col });
    this.respondSuccess(socket, 'markCell', requestId, ack, 'MARKED', 'Cell marked.', { cardIndex, row, col });

    if (BingoEngine.checkBingo(markedSet)) {
      await this.endRoundWithWinner(player, cardIndex);
    }
  }

  async handleClaim(socket, rawPayload = {}, ack) {
    const guarded = await this.guardCommand(socket, 'claimBingo', rawPayload, ack);
    if (!guarded) return;
    const { requestId } = guarded;

    const player = this.players.get(socket.id);
    if (!player) return;

    const winningCardIndex = player.markedByCard.findIndex((markedSet) => BingoEngine.checkBingo(markedSet));
    if (winningCardIndex >= 0) {
      await this.endRoundWithWinner(player, winningCardIndex);
      this.respondSuccess(socket, 'claimBingo', requestId, ack, 'BINGO_ACCEPTED', 'Bingo accepted.');
      return;
    }
    this.respondError(socket, 'claimBingo', requestId, ack, 'NO_BINGO', 'No valid Bingo yet.');
  }

  async endRoundWithWinner(player, winningCardIndex, persistWinner = true) {
    await this.withLock('end-round', 3000, async () => {
      const state = await this.stateStore.getRoundState();
      if (state.phase !== PHASES.ACTIVE) return;
      await this.stateStore.setPhase(PHASES.ENDED);

      this.timerService.stopAll();

      if (this.noWinnerTimeout) {
        clearTimeout(this.noWinnerTimeout);
        this.noWinnerTimeout = null;
      }

      if (persistWinner && player?.nickname && player.nickname !== 'No winner') {
        const winner = { nickname: player.nickname, at: Date.now() };
        await this.runtimeMetaStore.addWinner(winner, 10);
      }

      this.io.emit('gameEnd', {
        winnerNickname: player.nickname,
        winningCard: player.cards?.[winningCardIndex] ?? null,
        winningCards: player.cards ?? [],
      });
      setTimeout(() => {
        void this.startCountdown();
      }, RESULT_ANNOUNCE_DELAY_MS);
    });
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
