import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/env.js';
import { disconnectPrisma } from './db/prisma.js';
import { authenticateSocket } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { matchesRouter } from './routes/matches.js';
import { GameSocketHandler } from './sockets/gameSocket.js';
const app = express();
const httpServer = createServer(app);
// Enable CORS
app.use(cors({
    origin: '*',
    credentials: true,
}));
app.use(express.json());
// API Routes
app.use('/api/auth', authRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/leaderboard', leaderboardRouter);
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
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
const gameSocketHandler = new GameSocketHandler(io);
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
//# sourceMappingURL=index.js.map