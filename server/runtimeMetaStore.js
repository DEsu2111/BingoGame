const DEFAULT_PREFIX = 'bingo:meta';

function presenceKey(prefix, userId) {
  return `${prefix}:presence:${encodeURIComponent(userId)}`;
}

export class InMemoryRuntimeMetaStore {
  constructor() {
    this.winners = [];
    this.presence = new Map(); // userId -> { token, expiresAt }
  }

  async getWinners(limit = 10) {
    return this.winners.slice(0, limit);
  }

  async addWinner(winner, limit = 10) {
    this.winners.unshift(winner);
    this.winners = this.winners.slice(0, limit);
  }

  async claimPresence(userId, token, ttlMs) {
    const now = Date.now();
    const existing = this.presence.get(userId);
    if (!existing || existing.expiresAt <= now || existing.token === token) {
      this.presence.set(userId, { token, expiresAt: now + ttlMs });
      return true;
    }
    return false;
  }

  async refreshPresence(userId, token, ttlMs) {
    const now = Date.now();
    const existing = this.presence.get(userId);
    if (!existing || existing.expiresAt <= now || existing.token !== token) {
      this.presence.delete(userId);
      return false;
    }
    this.presence.set(userId, { token, expiresAt: now + ttlMs });
    return true;
  }

  async releasePresence(userId, token) {
    const existing = this.presence.get(userId);
    if (existing?.token === token) {
      this.presence.delete(userId);
    }
  }
}

export class RedisRuntimeMetaStore {
  constructor(redisClient, { prefix = DEFAULT_PREFIX } = {}) {
    this.redis = redisClient;
    this.prefix = prefix;
    this.winnersKey = `${prefix}:winners`;
  }

  async getWinners(limit = 10) {
    const raw = await this.redis.lRange(this.winnersKey, 0, Math.max(0, limit - 1));
    return raw
      .map((item) => {
        try {
          return JSON.parse(item);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  async addWinner(winner, limit = 10) {
    await this.redis.multi().lPush(this.winnersKey, JSON.stringify(winner)).lTrim(this.winnersKey, 0, Math.max(0, limit - 1)).exec();
  }

  async claimPresence(userId, token, ttlMs) {
    const key = presenceKey(this.prefix, userId);
    const script = `
      local current = redis.call("GET", KEYS[1])
      if not current then
        redis.call("SET", KEYS[1], ARGV[1], "PX", ARGV[2])
        return 1
      end
      if current == ARGV[1] then
        redis.call("PEXPIRE", KEYS[1], ARGV[2])
        return 1
      end
      return 0
    `;
    const claimed = await this.redis.eval(script, {
      keys: [key],
      arguments: [token, String(ttlMs)],
    });
    return Number(claimed) === 1;
  }

  async refreshPresence(userId, token, ttlMs) {
    const key = presenceKey(this.prefix, userId);
    const script = `
      local current = redis.call("GET", KEYS[1])
      if not current then
        return 0
      end
      if current == ARGV[1] then
        redis.call("PEXPIRE", KEYS[1], ARGV[2])
        return 1
      end
      return 0
    `;
    const refreshed = await this.redis.eval(script, {
      keys: [key],
      arguments: [token, String(ttlMs)],
    });
    return Number(refreshed) === 1;
  }

  async releasePresence(userId, token) {
    const key = presenceKey(this.prefix, userId);
    const script = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      end
      return 0
    `;
    await this.redis.eval(script, {
      keys: [key],
      arguments: [token],
    });
  }
}
