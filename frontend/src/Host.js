import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { SOCKET_CONFIG } from './config';
import { useAuth } from './context/AuthContext';
import Hls from 'hls.js';
import Chat from './components/Chat';
import { FaRegCopy } from "react-icons/fa6";
import { FiCopy, FiUsers, FiShare2, FiArrowLeft } from "react-icons/fi";
import { MdPlayArrow, MdPause, MdVolumeUp, MdFullscreen } from 'react-icons/md';

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
      console.log('viewer-joined', data);
      setViewers((prev) => {
        if (prev.some(v => v.id === data.viewerId)) return prev;
        return [...prev, { id: data.viewerId, username: data.username }];
      });
    });
    socket.on('viewers-list', (data) => {
      // data.viewers: array of { id, username } objects
      console.log('viewers-list', data);
      setViewers(Array.isArray(data.viewers) ? data.viewers : []);
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
    <div className="h-full w-full flex flex-col items-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <div className="w-full bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 py-4 flex justify-center px-8 transition-colors duration-300">
        <div className="w-full flex flex-row items-center justify-between">
          <button
            onClick={() => navigate('/videos')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to My Videos
          </button>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Host View</h1>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                {viewers.length} {viewers.length === 1 ? 'viewer' : 'viewers'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="w-full h-full flex flex-row gap-5 p-4 overflow-y-hidden">
        {/* Left: Video and info */}
        <div className="h-full w-[70%] flex-1 flex flex-col items-start">
          {/* Video Player Card */}
          <div className="w-full h-full rounded-xl shadow-lg p-6 flex flex-col gap-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <div className="w-full h-[75%]">
              <video
                ref={videoRef}
                controls
                className="w-full rounded-lg shadow-lg bg-black"
                style={{ 
                  aspectRatio: '16/9',  
                  background: '#000',
                  height: '100%'
                }}
              />
            </div>
            
            {/* Room info and viewers below video */}
            <div className="flex flex-row justify-between gap-4 w-full h-[25%]">
              <div className="flex flex-col gap-4 w-full">
                {/* Room ID Section */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gray-700 dark:text-gray-200 font-medium text-sm">Room ID:</span>
                    <span className="font-mono font-semibold text-blue-700 dark:text-blue-300 text-sm">{roomId}</span>
                    <button
                      onClick={handleCopyRoomId}
                      className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      title="Copy Room ID"
                    >
                      <FiCopy className="w-4 h-4 text-blue-700 dark:text-blue-300" />
                    </button>
                    {copiedRoomId && <span className="text-xs text-green-600 dark:text-green-400 ml-1">Copied!</span>}
                  </div>
                </div>

                {/* Share Link Section */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FiShare2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    <span className="text-gray-700 dark:text-gray-200 font-medium text-sm">Share with viewers:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded text-xs break-all select-all">
                      {shareUrl}
                    </span>
                    <button
                      onClick={handleCopyLink}
                      className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      title="Copy Link"
                    >
                      <FiCopy className="w-4 h-4 text-blue-700 dark:text-blue-300" />
                    </button>
                    {copiedLink && <span className="text-xs text-green-600 dark:text-green-400 ml-1">Copied!</span>}
                  </div>
                </div>
              </div>
              
              {/* Viewers List */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 min-w-[220px] h-full overflow-y-auto shadow-inner border border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-2 mb-3">
                  <FiUsers className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm">Viewers in Room</span>
                </div>
                {viewers.length === 0 ? (
                  <div className="text-gray-400 dark:text-gray-500 text-xs flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                    No viewers have joined yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {viewers.map((viewer) => (
                      <div key={viewer.id} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="truncate">{viewer.username || 'Unknown User'}</span>
                        {viewer.id === socketId && (
                          <span className="ml-1 text-blue-600 dark:text-blue-400 font-medium text-xs">(You)</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Right: Chat */}
        <div className="w-[30%] h-full overflow-hidden rounded-xl shadow-lg">
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 p-4 h-full flex flex-col overflow-y-hidden transition-colors duration-300">
            <Chat socket={socketRef.current} roomId={roomId} />
          </div>
        </div>
      </div>
    </div>
  );
} 