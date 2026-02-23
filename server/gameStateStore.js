const DEFAULT_PREFIX = 'bingo:runtime';

function uniqSlots(slots) {
  return Array.from(
    new Set(
      slots
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 30),
    ),
  );
}

function toSortedNumbers(items) {
  return items
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v))
    .sort((a, b) => a - b);
}

function toNumbers(items) {
  return items
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v));
}

export class InMemoryGameStateStore {
  constructor(countdownSeconds) {
    this.phase = 'COUNTDOWN';
    this.countdown = countdownSeconds;
    this.calledNumbers = [];
    this.reservedSlots = new Set();
    this.playerReservedSlots = new Map();
    this.locks = new Map();
  }

  async initRound(countdownSeconds) {
    this.phase = 'COUNTDOWN';
    this.countdown = countdownSeconds;
    this.calledNumbers = [];
    this.reservedSlots.clear();
    this.playerReservedSlots.clear();
  }

  async getRoundState() {
    const calledNumbers = [...this.calledNumbers];
    const lastNumber = calledNumbers.length ? calledNumbers[calledNumbers.length - 1] : null;
    return {
      phase: this.phase,
      countdown: this.phase === 'COUNTDOWN' ? this.countdown : 0,
      calledNumbers,
      lastNumber,
    };
  }

  async setPhase(phase) {
    this.phase = phase;
  }

  async setCountdown(countdown) {
    this.countdown = Math.max(0, Number(countdown) || 0);
  }

  async decrementCountdown() {
    this.countdown = Math.max(0, this.countdown - 1);
    return this.countdown;
  }

  async getCalledNumbers() {
    return [...this.calledNumbers];
  }

  async addCalledNumber(num) {
    if (this.calledNumbers.includes(num)) {
      return { added: false, calledNumbers: [...this.calledNumbers] };
    }
    this.calledNumbers.push(num);
    return { added: true, calledNumbers: [...this.calledNumbers] };
  }

  async getTakenSlots() {
    return [...this.reservedSlots].sort((a, b) => a - b);
  }

  async reserveSlots(ownerId, requestedSlots) {
    const requested = uniqSlots(requestedSlots).slice(0, 2);
    const current = this.playerReservedSlots.get(ownerId) ?? [];
    const effectiveReserved = new Set([...this.reservedSlots]);
    for (const slot of current) {
      effectiveReserved.delete(slot);
    }

    const blocked = requested.filter((slot) => effectiveReserved.has(slot));
    if (blocked.length) {
      return {
        ok: false,
        blocked,
        reservedSlots: [...current],
        takenSlots: await this.getTakenSlots(),
      };
    }

    for (const slot of current) {
      this.reservedSlots.delete(slot);
    }
    for (const slot of requested) {
      this.reservedSlots.add(slot);
    }
    this.playerReservedSlots.set(ownerId, requested);

    return {
      ok: true,
      reservedSlots: [...requested],
      takenSlots: await this.getTakenSlots(),
    };
  }

  async releaseSlots(ownerId, slots) {
    const target = uniqSlots(slots);
    const existing = this.playerReservedSlots.get(ownerId) ?? [];
    const next = existing.filter((slot) => !target.includes(slot));
    const released = existing.filter((slot) => target.includes(slot));

    for (const slot of released) {
      this.reservedSlots.delete(slot);
    }
    if (next.length) {
      this.playerReservedSlots.set(ownerId, next);
    } else {
      this.playerReservedSlots.delete(ownerId);
    }

    return {
      changed: released.length > 0,
      reservedSlots: next,
      takenSlots: await this.getTakenSlots(),
    };
  }

  async releaseAll(ownerId) {
    const existing = this.playerReservedSlots.get(ownerId) ?? [];
    for (const slot of existing) {
      this.reservedSlots.delete(slot);
    }
    this.playerReservedSlots.delete(ownerId);
    return { changed: existing.length > 0, takenSlots: await this.getTakenSlots() };
  }

  async acquireLock(name, ttlMs) {
    const now = Date.now();
    const existing = this.locks.get(name);
    if (existing && existing.expiresAt > now) {
      return null;
    }
    const token = `${now}:${Math.random().toString(36).slice(2)}`;
    this.locks.set(name, { token, expiresAt: now + ttlMs });
    return token;
  }

  async releaseLock(name, token) {
    const existing = this.locks.get(name);
    if (existing?.token === token) {
      this.locks.delete(name);
    }
  }
}

export class RedisGameStateStore {
  constructor(redisClient, { prefix = DEFAULT_PREFIX } = {}) {
    this.redis = redisClient;
    this.prefix = prefix;
    this.roundKey = `${prefix}:round`;
    this.calledSetKey = `${prefix}:called:set`;
    this.calledListKey = `${prefix}:called:list`;
    this.reservedSlotsKey = `${prefix}:slots:all`;
    this.playersWithReservedKey = `${prefix}:slots:players`;
    this.lockKeyPrefix = `${prefix}:lock:`;
  }

  playerSlotsKey(ownerId) {
    return `${this.prefix}:slots:player:${encodeURIComponent(ownerId)}`;
  }

  async initRound(countdownSeconds) {
    const owners = await this.redis.sMembers(this.playersWithReservedKey);
    const multi = this.redis.multi();
    multi.hSet(this.roundKey, {
      phase: 'COUNTDOWN',
      countdown: String(countdownSeconds),
      lastNumber: '',
    });
    multi.del(this.calledSetKey, this.calledListKey, this.reservedSlotsKey, this.playersWithReservedKey);
    for (const owner of owners) {
      multi.del(this.playerSlotsKey(owner));
    }
    await multi.exec();
  }

  async getRoundState() {
    const [round, calledNumbers] = await Promise.all([
      this.redis.hGetAll(this.roundKey),
      this.getCalledNumbers(),
    ]);
    const phase = round.phase || 'COUNTDOWN';
    const countdown = phase === 'COUNTDOWN' ? Number(round.countdown || 0) : 0;
    const lastNumber = round.lastNumber ? Number(round.lastNumber) : null;
    return { phase, countdown, calledNumbers, lastNumber };
  }

  async setPhase(phase) {
    await this.redis.hSet(this.roundKey, 'phase', phase);
  }

  async setCountdown(countdown) {
    await this.redis.hSet(this.roundKey, 'countdown', String(Math.max(0, Number(countdown) || 0)));
  }

  async decrementCountdown() {
    const countdown = await this.redis.hIncrBy(this.roundKey, 'countdown', -1);
    if (countdown <= 0) {
      await this.redis.hSet(this.roundKey, 'countdown', '0');
      return 0;
    }
    return countdown;
  }

  async getCalledNumbers() {
    const list = await this.redis.lRange(this.calledListKey, 0, -1);
    return toNumbers(list);
  }

  async addCalledNumber(num) {
    const added = await this.redis.sAdd(this.calledSetKey, String(num));
    if (!added) {
      return { added: false, calledNumbers: await this.getCalledNumbers() };
    }
    await this.redis
      .multi()
      .rPush(this.calledListKey, String(num))
      .hSet(this.roundKey, 'lastNumber', String(num))
      .exec();
    return { added: true, calledNumbers: await this.getCalledNumbers() };
  }

  async getTakenSlots() {
    const slots = await this.redis.sMembers(this.reservedSlotsKey);
    return toSortedNumbers(slots);
  }

  async reserveSlots(ownerId, requestedSlots) {
    const ownerSlotsKey = this.playerSlotsKey(ownerId);
    const requested = uniqSlots(requestedSlots).slice(0, 2);

    for (let attempts = 0; attempts < 5; attempts += 1) {
      await this.redis.watch(this.reservedSlotsKey, ownerSlotsKey);
      const [reservedRaw, currentRaw] = await Promise.all([
        this.redis.sMembers(this.reservedSlotsKey),
        this.redis.sMembers(ownerSlotsKey),
      ]);
      const reserved = new Set(toSortedNumbers(reservedRaw));
      const current = toSortedNumbers(currentRaw);
      for (const slot of current) {
        reserved.delete(slot);
      }

      const blocked = requested.filter((slot) => reserved.has(slot));
      if (blocked.length) {
        await this.redis.unwatch();
        return {
          ok: false,
          blocked,
          reservedSlots: current,
          takenSlots: await this.getTakenSlots(),
        };
      }

      const multi = this.redis.multi();
      if (current.length) {
        multi.sRem(this.reservedSlotsKey, ...current.map(String));
      }
      multi.del(ownerSlotsKey);
      if (requested.length) {
        multi.sAdd(this.reservedSlotsKey, ...requested.map(String));
        multi.sAdd(ownerSlotsKey, ...requested.map(String));
        multi.sAdd(this.playersWithReservedKey, ownerId);
      } else {
        multi.sRem(this.playersWithReservedKey, ownerId);
      }
      const result = await multi.exec();
      if (result) {
        return {
          ok: true,
          reservedSlots: requested,
          takenSlots: await this.getTakenSlots(),
        };
      }
    }

    throw new Error('Reservation conflict. Please retry.');
  }

  async releaseSlots(ownerId, slots) {
    const ownerSlotsKey = this.playerSlotsKey(ownerId);
    const target = uniqSlots(slots);

    for (let attempts = 0; attempts < 5; attempts += 1) {
      await this.redis.watch(ownerSlotsKey, this.reservedSlotsKey);
      const current = toSortedNumbers(await this.redis.sMembers(ownerSlotsKey));
      const toRelease = current.filter((slot) => target.includes(slot));
      if (!toRelease.length) {
        await this.redis.unwatch();
        return {
          changed: false,
          reservedSlots: current,
          takenSlots: await this.getTakenSlots(),
        };
      }

      const next = current.filter((slot) => !target.includes(slot));
      const multi = this.redis.multi();
      multi.sRem(this.reservedSlotsKey, ...toRelease.map(String));
      multi.sRem(ownerSlotsKey, ...toRelease.map(String));
      if (!next.length) {
        multi.sRem(this.playersWithReservedKey, ownerId);
      }
      const result = await multi.exec();
      if (result) {
        return {
          changed: true,
          reservedSlots: next,
          takenSlots: await this.getTakenSlots(),
        };
      }
    }

    throw new Error('Release conflict. Please retry.');
  }

  async releaseAll(ownerId) {
    const ownerSlotsKey = this.playerSlotsKey(ownerId);
    for (let attempts = 0; attempts < 5; attempts += 1) {
      await this.redis.watch(ownerSlotsKey, this.reservedSlotsKey);
      const current = toSortedNumbers(await this.redis.sMembers(ownerSlotsKey));
      if (!current.length) {
        await this.redis.unwatch();
        return { changed: false, takenSlots: await this.getTakenSlots() };
      }
      const multi = this.redis.multi();
      multi.sRem(this.reservedSlotsKey, ...current.map(String));
      multi.del(ownerSlotsKey);
      multi.sRem(this.playersWithReservedKey, ownerId);
      const result = await multi.exec();
      if (result) {
        return { changed: true, takenSlots: await this.getTakenSlots() };
      }
    }
    throw new Error('Release conflict. Please retry.');
  }

  async acquireLock(name, ttlMs) {
    const token = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const lockKey = `${this.lockKeyPrefix}${name}`;
    const acquired = await this.redis.set(lockKey, token, { NX: true, PX: ttlMs });
    return acquired === 'OK' ? token : null;
  }

  async releaseLock(name, token) {
    const lockKey = `${this.lockKeyPrefix}${name}`;
    const script = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      end
      return 0
    `;
    await this.redis.eval(script, {
      keys: [lockKey],
      arguments: [token],
    });
  }
}
