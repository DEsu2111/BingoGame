import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { readOrigins, readPort, requireEnv } from './env.js';
import { GameManager } from './gameManager.js';
import { setupRedisAdapter, closeRedisAdapter } from './redis.js';
import { InMemoryGameStateStore, RedisGameStateStore } from './gameStateStore.js';
import { InMemoryCommandGuardStore, RedisCommandGuardStore } from './commandGuardStore.js';
import { InMemoryRuntimeMetaStore, RedisRuntimeMetaStore } from './runtimeMetaStore.js';

const PORT = readPort(3001);
const ORIGIN = readOrigins('http://localhost:3000');
requireEnv('JWT_SECRET');

const app = express();
app.use(cors({ origin: ORIGIN }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ORIGIN, methods: ['GET', 'POST'] }
});

const GAME_OPTIONS = { countdownSeconds: 60, callIntervalMs: 4000 };
let game = null;
const SERVER_INSTANCE_ID = process.env.SERVER_INSTANCE_ID || `srv-${process.pid}`;

let redisClients = null;

async function bootstrap() {
  let stateStore = new InMemoryGameStateStore(GAME_OPTIONS.countdownSeconds);
  let commandGuardStore = new InMemoryCommandGuardStore();
  let runtimeMetaStore = new InMemoryRuntimeMetaStore();
  if (process.env.REDIS_URL) {
    redisClients = await setupRedisAdapter(io, process.env.REDIS_URL);
    stateStore = new RedisGameStateStore(redisClients.stateClient);
    commandGuardStore = new RedisCommandGuardStore(redisClients.stateClient);
    runtimeMetaStore = new RedisRuntimeMetaStore(redisClients.stateClient);
    console.log('Redis adapter, game state store, command guard store, and runtime meta store enabled.');
  } else {
    console.log('Redis disabled (REDIS_URL is not set). Using in-memory stores.');
  }

  game = new GameManager(io, {
    ...GAME_OPTIONS,
    stateStore,
    commandGuardStore,
    runtimeMetaStore,
    serverInstanceId: SERVER_INSTANCE_ID,
  });
  io.on('connection', (socket) => game.registerSocket(socket));
  await game.start();

  server.listen(PORT, () => console.log(`Bingo server running on ${PORT}`));
}

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received. Shutting down server...`);

  await closeRedisAdapter(redisClients);

  server.close(() => {
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 5000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
