const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Room structure: { [roomId]: { host: socketId, viewers: Set<socketId>, videoState: { isPlaying: boolean, currentTime: number } } }
const rooms = {};

io.on('connection', (socket) => {
  let joinedRoom = null;
  let isHost = false;

  socket.on('join', ({ roomId, role }) => {
    console.log(`[JOIN ATTEMPT] socket.id=${socket.id}, role=${role}, roomId=${roomId}`);
    if (!roomId || !role) {
      socket.emit('join-error', { message: 'Missing roomId or role' });
      console.log(`[JOIN ERROR] socket.id=${socket.id}, reason=Missing roomId or role`);
      return;
    }
    joinedRoom = roomId;
    if (!rooms[roomId]) {
      rooms[roomId] = { 
        host: null, 
        viewers: new Set(),
        videoState: { isPlaying: false, currentTime: 0 }
      };
    }
    if (role === 'host') {
      rooms[roomId].host = socket.id;
      isHost = true;
      console.log(`[HOST JOINED] socket.id=${socket.id}, roomId=${roomId}`);
      socket.emit('viewers-list', { viewers: Array.from(rooms[roomId].viewers) });
    } else {
      rooms[roomId].viewers.add(socket.id);
      console.log(`[VIEWER JOINED] socket.id=${socket.id}, roomId=${roomId}`);
      const hostId = rooms[roomId].host;
      if (hostId) {
        io.to(hostId).emit('viewer-joined', { viewerId: socket.id, roomId });
        io.to(hostId).emit('viewers-list', { viewers: Array.from(rooms[roomId].viewers) });
        
        // Request current video state from host for the new viewer
        io.to(hostId).emit('request-video-state', { viewerId: socket.id });
      }
      
      // Send current video state to the new viewer (fallback)
      const currentVideoState = rooms[roomId].videoState;
      socket.emit('initial-sync', currentVideoState);
      console.log(`[INITIAL SYNC] Sent to viewer ${socket.id}:`, currentVideoState);
      console.log(`[ROOM STATE] Room ${roomId} state:`, rooms[roomId]);
    }
    socket.join(roomId);
    socket.emit('join-success', { roomId, role, socketId: socket.id });
  });

  socket.on('sync-event', (data) => {
    // Only host can emit sync events
    if (isHost && joinedRoom) {
      // Update the room's video state
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
      
      // Broadcast to all viewers in the room
      socket.to(joinedRoom).emit('sync-event', data);
      console.log(`[SYNC EVENT] ${data.type} at ${data.currentTime}s, isPlaying: ${rooms[joinedRoom].videoState.isPlaying}`);
    }
  });

  socket.on('send-video-state', (data) => {
    // Only host can send video state
    if (isHost && joinedRoom && data.viewerId) {
      const videoState = {
        isPlaying: data.isPlaying,
        currentTime: data.currentTime
      };
      
      // Send to specific viewer
      io.to(data.viewerId).emit('initial-sync', videoState);
      console.log(`[VIDEO STATE SENT] To viewer ${data.viewerId}:`, videoState);
    }
  });

  socket.on('disconnect', () => {
    if (joinedRoom) {
      if (isHost) {
        rooms[joinedRoom].host = null;
        // Notify all viewers that host has left
        io.to(joinedRoom).emit('user-left', { role: 'host', socketId: socket.id });
      } else {
        rooms[joinedRoom].viewers.delete(socket.id);
        // Notify host that viewer has left
        const hostId = rooms[joinedRoom].host;
        if (hostId) {
          io.to(hostId).emit('user-left', { role: 'viewer', socketId: socket.id });
        }
      }
      // Clean up room if empty
      if (!rooms[joinedRoom].host && rooms[joinedRoom].viewers.size === 0) {
        delete rooms[joinedRoom];
      }
    }
  });
});

app.get('/', (req, res) => {
  res.send('Video Sync Backend Running');
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
}); 