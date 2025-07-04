import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { SOCKET_CONFIG } from './config';
import { useAuth } from './context/AuthContext';
import Hls from 'hls.js';
import Chat from './components/Chat';

// Get video URL from query parameters or use default
function getVideoUrl() {
  const params = new URLSearchParams(window.location.search);
  const videoUrl = params.get('video');
  return videoUrl || 'https://stream-sync-video.s3.ap-south-1.amazonaws.com/hls/1751191482472-49b0d462-15e3-4c4a-b7af-4f6fc801aa4f/master.m3u8';
}

function generateRoomId() {
  // Simple random string generator
  return Math.random().toString(36).substr(2, 12) + Date.now().toString(36).substr(-4);
}

function getOrCreateRoomId() {
  const params = new URLSearchParams(window.location.search);
  let roomId = params.get('roomId');
  if (!roomId) {
    roomId = generateRoomId();
    params.set('roomId', roomId);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }
  return roomId;
}

export default function Host() {
  const videoRef = useRef();
  const socketRef = useRef();
  const hlsRef = useRef();
  const [socketId, setSocketId] = useState('');
  const roomId = getOrCreateRoomId();
  const [joinStatus, setJoinStatus] = useState('');
  const [viewers, setViewers] = useState([]);
  const [videoUrl, setVideoUrl] = useState(getVideoUrl());
  
  // Authentication
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Initialize HLS player
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest loaded successfully');
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // For Safari which has native HLS support
      video.src = videoUrl;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [videoUrl]);

  useEffect(() => {
    const socket = io(SOCKET_CONFIG.url);
    socketRef.current = socket;
    socket.on('connect', () => {
      setSocketId(socket.id);
    });
    socket.on('join-success', (data) => {
      console.log('join-success', data);
      setJoinStatus('Successfully joined room!');
    });
    socket.on('join-error', (err) => {
      console.error('join-error', err);
      setJoinStatus('Error: ' + (err.message || 'Could not join room'));
    });
    socket.on('viewer-joined', (data) => {
      console.log(`Viewer joined the room! Viewer socketId: ${data.viewerId}, Room: ${data.roomId}`);
      setViewers((prev) => prev.includes(data.viewerId) ? prev : [...prev, data.viewerId]);
    });
    socket.on('viewers-list', (data) => {
      setViewers(data.viewers);
    });
    socket.on('user-left', (data) => {
      console.log(`User left: ${data.role} with socketId: ${data.socketId}`);
      if (data.role === 'viewer') {
        setViewers((prev) => prev.filter(id => id !== data.socketId));
      }
    });
    socket.on('request-video-state', (data) => {
      console.log(`Request for video state from viewer: ${data.viewerId}`);
      const video = videoRef.current;
      if (video) {
        socket.emit('send-video-state', {
          viewerId: data.viewerId,
          isPlaying: !video.paused,
          currentTime: video.currentTime
        });
        console.log('Sent current video state to viewer:', {
          isPlaying: !video.paused,
          currentTime: video.currentTime
        });
      }
    });
    socket.emit('join', { 
      roomId, 
      role: 'host',
      userInfo: {
        id: user?.id,
        username: user?.username
      }
    });

    // Add navigation warning
    const handleBeforeUnload = (e) => {
      if (viewers.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have active viewers in your room. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      socket.disconnect();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomId]);

  // Emit play, pause, and seek events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const socket = socketRef.current;
    if (!socket) return;

    const emitEvent = (type) => {
      socket.emit('sync-event', {
        type,
        currentTime: video.currentTime,
      });
    };
    const onPlay = () => emitEvent('play');
    const onPause = () => emitEvent('pause');
    const onSeeked = () => emitEvent('seek');

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
    };
  }, []);

  // Send initial video state when video is ready
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const socket = socketRef.current;
    if (!socket) return;

    const onLoadedData = () => {
      // Send current video state to sync with any existing viewers
      socket.emit('sync-event', {
        type: video.paused ? 'pause' : 'play',
        currentTime: video.currentTime,
      });
      console.log('Sent initial video state:', {
        type: video.paused ? 'pause' : 'play',
        currentTime: video.currentTime,
      });
    };

    video.addEventListener('loadeddata', onLoadedData);

    return () => {
      video.removeEventListener('loadeddata', onLoadedData);
    };
  }, []);

  // Periodic sync to keep room state updated
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const socket = socketRef.current;
    if (!socket) return;

    const interval = setInterval(() => {
      // Only send periodic sync if video is playing
      if (!video.paused) {
        socket.emit('sync-event', {
          type: 'play',
          currentTime: video.currentTime,
        });
      }
    }, 5000); // Sync every 5 seconds when playing

    return () => clearInterval(interval);
  }, []);

  const shareUrl = `${window.location.origin}/viewer?roomId=${roomId}`;

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header with user info and logout */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Host View</h1>
            <div className="text-sm text-gray-600">
              Welcome, <span className="font-semibold">{user?.username}</span>
            </div>
            {videoUrl && videoUrl !== getVideoUrl() && (
              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                Streaming: {videoUrl.split('/').pop()?.split('?')[0] || 'Custom Video'}
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Video and controls section */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          <div className="mb-2 text-gray-700">Room ID: <span className="font-mono">{roomId}</span></div>
          <div className="mb-2 text-gray-700">Share this link with viewers:</div>
          <div className="mb-4 font-mono text-blue-700 bg-blue-100 px-2 py-1 rounded break-all select-all">{shareUrl}</div>
          <div className="mb-4 text-gray-700">Your Socket ID: <span className="font-mono">{socketId}</span></div>
          {joinStatus && (
            <div className={`mb-4 px-4 py-2 rounded ${joinStatus.startsWith('Error') ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>{joinStatus}</div>
          )}
          <div className="mb-4 w-full max-w-2xl">
            <div className="font-semibold mb-1">Viewers in Room:</div>
            {viewers.length === 0 ? (
              <div className="text-gray-500">No viewers have joined yet.</div>
            ) : (
              <ul className="list-disc pl-5">
                {viewers.map((id) => (
                  <li key={id} className="font-mono text-sm text-gray-700">{id}</li>
                ))}
              </ul>
            )}
          </div>
          
          {/* HLS Video Player */}
          <video
            ref={videoRef}
            controls
            className="w-full max-w-2xl rounded shadow"
          />
        </div>

        {/* Chat sidebar */}
        <div className="w-80 h-full">
          <Chat socket={socketRef.current} roomId={roomId} />
        </div>
      </div>
    </div>
  );
} 