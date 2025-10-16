import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';

// No environment concepts - unified behavior
const hostname = '0.0.0.0';
// Always use port 5000 - only port not firewalled in Replit
const port = 5000;
const dev = process.env.NODE_ENV !== 'production';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling request:', err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Get allowed origins from environment variables ONLY
  const getAllowedOrigins = (): string[] => {
    const origins: string[] = [];
    
    // Add origins from specific environment variables
    if (process.env.NEXT_PUBLIC_BASE_URL) origins.push(process.env.NEXT_PUBLIC_BASE_URL);
    if (process.env.NEXT_PUBLIC_DASHBOARD_URL) origins.push(process.env.NEXT_PUBLIC_DASHBOARD_URL);
    if (process.env.NEXT_PUBLIC_BACKEND_URL) origins.push(process.env.NEXT_PUBLIC_BACKEND_URL);
    if (process.env.NEXT_PUBLIC_API_BASE_URL) origins.push(process.env.NEXT_PUBLIC_API_BASE_URL);
    
    // Add additional origins from ALLOWED_ORIGINS env var
    if (process.env.ALLOWED_ORIGINS) {
      origins.push(...process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()));
    }
    
    return origins;
  };

  // Initialize Socket.IO server
  const io = new SocketIOServer(server, {
    path: '/socket.io',
    addTrailingSlash: false,
    cors: {
      origin: getAllowedOrigins(),
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Global WebSocket namespace for real-time updates
  const globalNamespace = io.of('/global');
  
  globalNamespace.on('connection', (socket) => {
    console.log(`[SOCKET] Client connected: ${socket.id}`);
    
    socket.on('disconnect', () => {
      console.log(`[SOCKET] Client disconnected: ${socket.id}`);
    });

    // Handle quota updates
    socket.on('quota-update', (data) => {
      socket.broadcast.emit('quota-updated', data);
    });

    // Handle job status updates
    socket.on('job-status-update', (data) => {
      socket.broadcast.emit('job-status-updated', data);
    });

    // Handle rank tracking updates
    socket.on('rank-update', (data) => {
      socket.broadcast.emit('rank-updated', data);
    });
  });

  // Make io instance available globally
  (global as any).io = io;
  (global as any).globalNamespace = globalNamespace;

  server.listen(port, hostname, () => {
    console.log(`🚀 IndexNow Studio server ready on http://${hostname}:${port}`);
    console.log(`📡 WebSocket server initialized on http://${hostname}:${port}/socket.io`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});