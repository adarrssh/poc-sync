# POC Sync - Simple MP4 Streaming

This is the restored version with simple MP4 streaming and video synchronization.

## 🎯 **What's Restored**

✅ **Simple MP4 Streaming** - Direct MP4 video playback  
✅ **Video Synchronization** - Host controls, viewers sync automatically  
✅ **Socket-based Sync** - Real-time play/pause/seek synchronization  
✅ **Room Management** - Host creates room, viewers join via link  
✅ **Clean UI** - Simple, focused interface  

## 📁 **File Structure**

```
src/
├── App.js          # Main app with routing
├── Host.js         # Host view with video controlsvi
├── Viewer.js       # Viewer view (no controls, syncs with host)
├── config.js       # Socket configuration
└── index.js        # App entry point
```

## 🚀 **How It Works**

### **Host View** (`/host`)
- Creates a room with unique ID
- Controls the video (play, pause, seek)
- Shares room link with viewers
- Sees list of connected viewers

### **Viewer View** (`/viewer?roomId=xxx`)
- Joins room via shared link
- Video automatically syncs with host
- No controls (controlled by host)
- Auto-resumes when host plays

## 🔧 **Setup**

1. **Install dependencies:**
```bash
npm install
```

2. **Start the backend server:**
```bash
# In the backend directory
npm start
```

3. **Start the frontend:**
```bash
npm start
```

4. **Access the app:**
- Host: `http://localhost:3000/host`
- Viewer: `http://localhost:3000/viewer?roomId=xxx`

## 🎬 **Video Source**

The app uses a simple MP4 video from S3:
```
https://s3.ap-south-1.amazonaws.com/stream.sync.videos/HarryPotter.mp4
```

## 🔄 **Synchronization Features**

- **Play/Pause Sync** - When host plays/pauses, viewers follow
- **Seek Sync** - When host seeks, viewers jump to same time
- **Auto-resume** - Viewers auto-resume when joining active session
- **Real-time** - Socket-based for instant synchronization

## 🎯 **Benefits of This Approach**

1. **Simple** - No complex HLS setup
2. **Reliable** - Direct MP4 streaming works everywhere
3. **Fast** - No encoding/transcoding needed
4. **Compatible** - Works on all browsers
5. **Easy to Debug** - Simple video element

## 🔧 **Configuration**

Edit `src/config.js` to change socket server URL:
```javascript
export const SOCKET_CONFIG = {
  url: 'http://localhost:4000'  // Change to your backend URL
};
```

## 🎉 **Usage**

1. **Host starts session:**
   - Go to `/host`
   - Share the generated link with viewers
   - Control video playback

2. **Viewers join:**
   - Click the shared link
   - Click "Start Watching"
   - Video automatically syncs with host

The video synchronization is now working with simple MP4 streaming! 🚀 