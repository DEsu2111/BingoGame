export function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function readPort(defaultPort = 3001) {
  const raw = process.env.PORT;
  if (!raw) return defaultPort;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('PORT must be a positive integer.');
  }
  return parsed;
}

export function readOrigins(defaultOrigin = 'http://localhost:3000') {
  const source = process.env.CLIENT_ORIGIN || defaultOrigin;
  const origins = source
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!origins.length) {
    throw new Error('CLIENT_ORIGIN must contain at least one origin.');
  }
  return origins;
}
