import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { GameManager } from './gameManager.js';

const PORT = process.env.PORT || 3001;
if (!process.env.JWT_SECRET) {
  console.error('Missing required environment variable: JWT_SECRET');
  process.exit(1);
}
const ORIGIN = (process.env.CLIENT_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
app.use(cors({ origin: ORIGIN }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ORIGIN, methods: ['GET', 'POST'] }
});

const game = new GameManager(io, { countdownSeconds: 60, callIntervalMs: 4000 });
io.on('connection', (socket) => game.registerSocket(socket));
game.start();

server.listen(PORT, () => console.log(`Bingo server running on ${PORT}`));
