const isServer = typeof window === 'undefined';

export function requireServerEnv(name: string): string {
  if (!isServer) {
    throw new Error(`Server-only env access on client: ${name}`);
  }
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getServerEnv(name: string, fallback = ''): string {
  if (!isServer) return fallback;
  return process.env[name] ?? fallback;
}
