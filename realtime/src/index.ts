import { Server } from 'socket.io';
import { createServer } from 'http';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from monorepo root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PORT = parseInt(process.env.REALTIME_PORT || '3001', 10);

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// Connection tracking
let connectionCount = 0;

io.on('connection', (socket) => {
  connectionCount++;
  console.log(`[Realtime] Client connected: ${socket.id} (total: ${connectionCount})`);

  // Send welcome event
  socket.emit('server:hello', {
    message: 'Connected to realtime service',
    socketId: socket.id,
    timestamp: new Date().toISOString(),
  });

  // Heartbeat echo
  socket.on('client:ping', (data: { timestamp: string }) => {
    socket.emit('server:pong', {
      clientTimestamp: data.timestamp,
      serverTimestamp: new Date().toISOString(),
    });
  });

  socket.on('disconnect', (reason) => {
    connectionCount--;
    console.log(`[Realtime] Client disconnected: ${socket.id} (${reason}) (total: ${connectionCount})`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[Realtime] Socket.IO server running on http://localhost:${PORT}`);
});

export { io };
