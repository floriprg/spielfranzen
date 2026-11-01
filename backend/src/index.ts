import cors from 'cors';
import express from 'express';
import fs from 'fs';
import { createServer } from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import { disconnectPrisma } from './db/prisma.js';
import { authenticateSocket } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { matchesRouter } from './routes/matches.js';
import { GameSocketHandler } from './sockets/gameSocket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Enable CORS
app.use(
  cors({
    origin: '*',
    credentials: true,
  }),
);

app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/leaderboard', leaderboardRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve Frontend Static Files in production or when dist exists
const candidatePaths = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../../../frontend/dist'),
  path.resolve(process.cwd(), 'frontend/dist'),
];
const distPath = candidatePaths.find((p) => fs.existsSync(p));

if (distPath) {
  console.log(`📦 Serving static frontend from: ${distPath}`);
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Socket.io initialization with strict typing
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Socket authentication middleware
io.use(authenticateSocket);

// Initialize Game Socket handler
const gameSocketHandler = new GameSocketHandler(io as any);
gameSocketHandler.register();

// Start Server
const PORT = config.port;
httpServer.listen(PORT, () => {
  console.log(`🚀 Franzen Game Backend server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await disconnectPrisma();
  httpServer.close(() => {
    process.exit(0);
  });
});
