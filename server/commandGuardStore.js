const DEFAULT_PREFIX = 'bingo:guard';

function replayKey(prefix, actorKey, action, requestId) {
  return `${prefix}:replay:${encodeURIComponent(actorKey)}:${action}:${encodeURIComponent(requestId)}`;
}

function rateKey(prefix, actorKey, action) {
  return `${prefix}:rate:${encodeURIComponent(actorKey)}:${action}`;
}

export class InMemoryCommandGuardStore {
  constructor() {
    this.replayResponses = new Map(); // key -> { response, at, ttlMs }
    this.rateWindows = new Map(); // key -> { startedAt, count }
  }

  async getReplayResponse(actorKey, action, requestId) {
    if (!requestId) return null;
    const key = replayKey('memory', actorKey, action, requestId);
    const entry = this.replayResponses.get(key);
    if (!entry) return null;
    if (Date.now() - entry.at > entry.ttlMs) {
      this.replayResponses.delete(key);
      return null;
    }
    return entry.response;
  }

  async storeReplayResponse(actorKey, action, requestId, response, ttlMs) {
    if (!requestId) return;
    const key = replayKey('memory', actorKey, action, requestId);
    this.replayResponses.set(key, { response, at: Date.now(), ttlMs });
    if (this.replayResponses.size > 3000) {
      const now = Date.now();
      for (const [entryKey, entry] of this.replayResponses.entries()) {
        if (now - entry.at > entry.ttlMs) {
          this.replayResponses.delete(entryKey);
        }
      }
    }
  }

  async isRateLimited(actorKey, action, windowMs, max) {
    const key = rateKey('memory', actorKey, action);
    const now = Date.now();
    const entry = this.rateWindows.get(key);
    if (!entry || now - entry.startedAt >= windowMs) {
      this.rateWindows.set(key, { startedAt: now, count: 1 });
      return false;
    }
    entry.count += 1;
    return entry.count > max;
  }
}

export class RedisCommandGuardStore {
  constructor(redisClient, { prefix = DEFAULT_PREFIX } = {}) {
    this.redis = redisClient;
    this.prefix = prefix;
  }

  async getReplayResponse(actorKey, action, requestId) {
    if (!requestId) return null;
    const key = replayKey(this.prefix, actorKey, action, requestId);
    const raw = await this.redis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async storeReplayResponse(actorKey, action, requestId, response, ttlMs) {
    if (!requestId) return;
    const key = replayKey(this.prefix, actorKey, action, requestId);
    await this.redis.set(key, JSON.stringify(response), { PX: ttlMs });
  }

  async isRateLimited(actorKey, action, windowMs, max) {
    const key = rateKey(this.prefix, actorKey, action);
    const script = `
      local current = redis.call("INCR", KEYS[1])
      if current == 1 then
        redis.call("PEXPIRE", KEYS[1], ARGV[1])
      end
      if current > tonumber(ARGV[2]) then
        return 1
      end
      return 0
    `;
    const limited = await this.redis.eval(script, {
      keys: [key],
      arguments: [String(windowMs), String(max)],
    });
    return Number(limited) === 1;
  }
}
