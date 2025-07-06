import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { SOCKET_CONFIG } from './config';
import { useAuth } from './context/AuthContext';
import Hls from 'hls.js';
import Chat from './components/Chat';
import { FaRegCopy } from "react-icons/fa6";
import { FiCopy } from "react-icons/fi";

// Get video URL from query parameters or use default
function getVideoUrl() {
  const params = new URLSearchParams(window.location.search);
  const videoUrl = params.get('video');
  return videoUrl
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

  // Copy helpers
  const [copiedRoomId, setCopiedRoomId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedRoomId(true);
    setTimeout(() => setCopiedRoomId(false), 1200);
  };
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1200);
  };

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
      // data: { viewerId, roomId, username }
      console.log(`Viewer joined the room! Viewer socketId: ${data.viewerId}, Room: ${data.roomId}, Username: ${data.username}`);
      setViewers((prev) => {
        if (prev.some(v => v.id === data.viewerId)) return prev;
        return [...prev, { id: data.viewerId, username: data.username }];
      });
    });
    socket.on('viewers-list', (data) => {
      // data.viewers: array of { id, username }
      setViewers(Array.isArray(data.viewers)
        ? data.viewers.map(v => typeof v === 'object' ? v : { id: v, username: v })
        : []);
    });
    socket.on('user-left', (data) => {
      console.log(`User left: ${data.role} with socketId: ${data.socketId}`);
      if (data.role === 'viewer') {
        setViewers((prev) => prev.filter(v => v.id !== data.socketId));
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
      },
      videoUrl: videoUrl
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
    <div className="h-full w-full flex flex-col items-center bg-gray-50">
      {/* Header */}
      <div className="w-full bg-white shadow-sm border-b px-6 py-4 flex justify-center">
        <div className="w-full max-w-7xl flex flex-row items-center justify-between lg:pl-8 lg:pr-10 ">
          <button
            onClick={() => navigate('/videos')}
            className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors h-10"
            style={{minHeight: '2.5rem'}}
          >
            ← Back to My Videos
          </button>
          <div className="flex items-center gap-4 h-10" style={{minHeight: '2.5rem'}}>
            <h1 className="text-2xl font-bold text-gray-900">Host View</h1>
            {videoUrl && videoUrl !== getVideoUrl() && (
              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                Streaming: {videoUrl.split('/').pop()?.split('?')[0] || 'Custom Video'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="w-full h-full max-w-7xl flex-1 flex flex-row bg-gray-50">
        {/* Left: Video and info */}
        <div className="flex-1 flex flex-col items-start h-full min-h-0">
          {/* Video Player Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-3xl mb-4 h-full flex flex-col">
            <video
              ref={videoRef}
              controls
              className="w-full rounded-lg shadow"
              style={{ aspectRatio: '16/5', minHeight: '400px', background: '#000' }}
            />
            {/* Room info and viewers below video */}
            <div className="mt-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4 w-full">
              <div className="flex flex-col gap-4 w-full max-w-lg">
                {/* Room ID Section */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700 font-medium">Room ID:</span>
                    <span className="font-mono font-semibold text-blue-700 text-base">{roomId}</span>
                    <button
                      onClick={handleCopyRoomId}
                      className="p-1 rounded hover:bg-blue-100 transition-colors"
                      title="Copy Room ID"
                    >
                      <FiCopy className="w-4 h-4 text-blue-700" />
                    </button>
                    {copiedRoomId && <span className="text-xs text-green-600 ml-1">Copied!</span>}
                  </div>
                </div>

                {/* Share Link Section */}
                <div>
                  <div className="text-gray-700 font-medium mb-1">Share with viewers:</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-blue-700 bg-blue-50 px-2 py-1 rounded break-all select-all text-xs">
                      {shareUrl}
                    </span>
                    <button
                      onClick={handleCopyLink}
                      className="p-1 rounded hover:bg-blue-100 transition-colors"
                      title="Copy Link"
                    >
                      <FiCopy className="w-4 h-4 text-blue-700" />
                    </button>
                    {copiedLink && <span className="text-xs text-green-600 ml-1">Copied!</span>}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 min-w-[220px] max-w-xs shadow-inner border border-gray-200">
                <div className="font-semibold mb-2 text-gray-700 text-sm">Viewers in Room</div>
                {viewers.length === 0 ? (
                  <div className="text-gray-400 text-xs">No viewers have joined yet.</div>
                ) : (
                  <ul className="list-disc pl-5">
                    {viewers.map((viewer) => (
                      <li key={viewer.id || viewer.viewerId || viewer} className="font-mono text-xs text-gray-700 break-all">
                        {viewer.username || viewer.id || viewer}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Right: Chat */}
        <div className="w-full md:w-96 flex-shrink-0 h-full min-h-0">
          <div className="bg-white rounded-xl shadow-lg p-4 h-full flex flex-col">
            <Chat socket={socketRef.current} roomId={roomId} />
          </div>
        </div>
      </div>
    </div>
  );
} 