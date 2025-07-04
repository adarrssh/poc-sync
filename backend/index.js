require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

// Import routes and middleware
const authRoutes = require('./routes/auth');
const { authenticate, optionalAuth } = require('./middleware/auth');

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5000', 'http://localhost:5001', 'http://127.0.0.1:3000', 'http://127.0.0.1:5000', 'http://127.0.0.1:5001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/video-sync-app');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for development
    methods: ['GET', 'POST']
  }
});

// API Routes
app.use('/api/auth', authRoutes);

/**
 * ROOM MANAGEMENT STRUCTURE
 * 
 * Each room contains:
 * - host: Socket ID of the room host (only one per room)
 * - viewers: Set of viewer socket IDs (multiple viewers allowed)
 * - videoState: Current state of video playback (isPlaying, currentTime)
 * 
 * Structure: { [roomId]: { host: socketId, viewers: Set<socketId>, videoState: { isPlaying: boolean, currentTime: number } } }
 */
const rooms = {};

// Handle new socket connections
io.on('connection', (socket) => {
  // Track which room this socket is in and their role
  let joinedRoom = null;
  let isHost = false;

  /**
   * JOIN ROOM EVENT
   * 
   * Handles when a client (host or viewer) wants to join a room
   * Flow:
   * 1. Validate roomId and role parameters
   * 2. Create room if it doesn't exist
   * 3. Assign role (host or viewer)
   * 4. Notify other participants
   * 5. Send initial video state to new viewers
   */
  socket.on('join', ({ roomId, role, userInfo }) => {
    console.log(`[JOIN ATTEMPT] socket.id=${socket.id}, role=${role}, roomId=${roomId}, user=${userInfo?.username || 'Unknown'}`);
    
    // Validate required parameters
    if (!roomId || !role) {
      socket.emit('join-error', { message: 'Missing roomId or role' });
      console.log(`[JOIN ERROR] socket.id=${socket.id}, reason=Missing roomId or role`);
      return;
    }
    
    // Store room reference and user info for this socket
    joinedRoom = roomId;
    socket.username = userInfo?.username || 'Unknown User';
    socket.userId = userInfo?.id;
    
    // Create room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = { 
        host: null, 
        viewers: new Set(),
        videoState: { isPlaying: false, currentTime: 0 }
      };
    }
    
    // Handle host joining
    if (role === 'host') {
      rooms[roomId].host = socket.id;
      isHost = true;
      console.log(`[HOST JOINED] socket.id=${socket.id}, roomId=${roomId}, user=${socket.username}`);
      
      // Send current viewers list to the host
      socket.emit('viewers-list', { viewers: Array.from(rooms[roomId].viewers) });
    } 
    // Handle viewer joining
    else {
      rooms[roomId].viewers.add(socket.id);
      console.log(`[VIEWER JOINED] socket.id=${socket.id}, roomId=${roomId}, user=${socket.username}`);
      
      const hostId = rooms[roomId].host;
      if (hostId) {
        // Notify host about new viewer
        io.to(hostId).emit('viewer-joined', { viewerId: socket.id, roomId });
        io.to(hostId).emit('viewers-list', { viewers: Array.from(rooms[roomId].viewers) });
        
        // Request current video state from host for the new viewer
        // This ensures the viewer gets the most up-to-date state
        io.to(hostId).emit('request-video-state', { viewerId: socket.id });
      }
      
      // Send current video state to the new viewer (fallback)
      // This provides immediate sync even if host doesn't respond
      const currentVideoState = rooms[roomId].videoState;
      socket.emit('initial-sync', currentVideoState);
      console.log(`[INITIAL SYNC] Sent to viewer ${socket.id}:`, currentVideoState);
      console.log(`[ROOM STATE] Room ${roomId} state:`, rooms[roomId]);
    }
    
    // Join the socket to the room for broadcasting
    socket.join(roomId);
    
    // Notify all users in the room about the new user joining (for chat)
    socket.to(roomId).emit('user-joined-chat', {
      username: socket.username,
      userId: socket.userId
    });
    
    // Confirm successful join
    socket.emit('join-success', { roomId, role, socketId: socket.id });
  });

  /**
   * SYNC EVENT HANDLER
   * 
   * Handles video synchronization events from the host
   * Only the host can emit these events to maintain control
   * 
   * Event types:
   * - 'play': Video started playing
   * - 'pause': Video paused
   * - 'seek': Video seeked to new position
   * 
   * Flow:
   * 1. Validate sender is host
   * 2. Update room's video state
   * 3. Broadcast to all viewers in the room
   */
  socket.on('sync-event', (data) => {
    // Only host can emit sync events (security check)
    if (isHost && joinedRoom) {
      // Update the room's video state based on event type
      if (data.type === 'play') {
        rooms[joinedRoom].videoState = { isPlaying: true, currentTime: data.currentTime };
      } else if (data.type === 'pause') {
        rooms[joinedRoom].videoState = { isPlaying: false, currentTime: data.currentTime };
      } else if (data.type === 'seek') {
        rooms[joinedRoom].videoState = { 
          isPlaying: rooms[joinedRoom].videoState.isPlaying, 
          currentTime: data.currentTime 
        };
      }
      
      // Broadcast the sync event to all viewers in the room
      // socket.to() sends to all sockets in the room EXCEPT the sender
      socket.to(joinedRoom).emit('sync-event', data);
      console.log(`[SYNC EVENT] ${data.type} at ${data.currentTime}s, isPlaying: ${rooms[joinedRoom].videoState.isPlaying}`);
    }
  });

  /**
   * SEND VIDEO STATE HANDLER
   * 
   * Handles requests from host to send current video state to a specific viewer
   * This is used when a new viewer joins and needs to sync with current playback
   * 
   * Flow:
   * 1. Host receives 'request-video-state' event for new viewer
   * 2. Host responds with current video state via this event
   * 3. Server forwards the state to the specific viewer
   */
  socket.on('send-video-state', (data) => {
    // Only host can send video state (security check)
    if (isHost && joinedRoom && data.viewerId) {
      const videoState = {
        isPlaying: data.isPlaying,
        currentTime: data.currentTime
      };
      
      // Send to specific viewer by their socket ID
      io.to(data.viewerId).emit('initial-sync', videoState);
      console.log(`[VIDEO STATE SENT] To viewer ${data.viewerId}:`, videoState);
    }
  });

  /**
   * SEND VIDEO URL HANDLER
   * 
   * Handles requests from host to send current video URL to a specific viewer
   * This is used when a new viewer joins and needs to know which video to load
   * 
   * Flow:
   * 1. Host receives 'viewer-joined' event for new viewer
   * 2. Host responds with current video URL via this event
   * 3. Server forwards the URL to the specific viewer
   */
  socket.on('send-video-url', (data) => {
    // Only host can send video URL (security check)
    if (isHost && joinedRoom && data.viewerId && data.videoUrl) {
      // Send to specific viewer by their socket ID
      io.to(data.viewerId).emit('video-url-update', { videoUrl: data.videoUrl });
      console.log(`[VIDEO URL SENT] To viewer ${data.viewerId}: ${data.videoUrl}`);
    }
  });

  /**
   * CHAT MESSAGE HANDLER
   * 
   * Handles chat messages from users in a room
   * Broadcasts messages to all users in the same room
   * 
   * Flow:
   * 1. Validate message data
   * 2. Broadcast message to all users in the room
   * 3. Log the message for debugging
   */
  socket.on('send-chat-message', (data) => {
    if (!joinedRoom || !data.message || !data.username) {
      console.log(`[CHAT ERROR] Invalid message data from ${socket.id}`);
      return;
    }

    const messageData = {
      message: data.message,
      username: data.username,
      userId: data.userId,
      timestamp: new Date().toISOString()
    };

    // Broadcast to all users in the room (including sender)
    io.to(joinedRoom).emit('chat-message', messageData);
    console.log(`[CHAT MESSAGE] ${data.username} in room ${joinedRoom}: ${data.message}`);
  });

  /**
   * DISCONNECT HANDLER
   * 
   * Handles when a socket disconnects (user leaves or connection lost)
   * 
   * Flow:
   * 1. Remove user from room data structure
   * 2. Notify other participants about the departure
   * 3. Clean up empty rooms
   */
  socket.on('disconnect', () => {
    if (joinedRoom) {
      // Get user info before cleanup for chat notifications
      const userInfo = {
        username: socket.username || 'Unknown User',
        userId: socket.userId
      };

      if (isHost) {
        // Host disconnected
        rooms[joinedRoom].host = null;
        
        // Notify all viewers that host has left
        io.to(joinedRoom).emit('user-left', { role: 'host', socketId: socket.id });
        io.to(joinedRoom).emit('user-left-chat', userInfo);
      } else {
        // Viewer disconnected
        rooms[joinedRoom].viewers.delete(socket.id);
        
        // Notify host that viewer has left
        const hostId = rooms[joinedRoom].host;
        if (hostId) {
          io.to(hostId).emit('user-left', { role: 'viewer', socketId: socket.id });
        }
        io.to(joinedRoom).emit('user-left-chat', userInfo);
      }
      
      // Clean up room if it's completely empty
      // This prevents memory leaks from abandoned rooms
      if (!rooms[joinedRoom].host && rooms[joinedRoom].viewers.size === 0) {
        delete rooms[joinedRoom];
        console.log(`[ROOM CLEANUP] Deleted empty room: ${joinedRoom}`);
      }
    }
  });
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Video Sync Backend Running',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// API health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log(`Socket.IO available at http://localhost:${PORT}`);
}); 