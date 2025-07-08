import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { SOCKET_CONFIG } from './config';
import { useAuth } from './context/AuthContext';
import Hls from 'hls.js';
import Chat from './components/Chat';
import { FiCopy, FiUsers, FiShare2, FiArrowLeft, FiPlay } from "react-icons/fi";

// Get video URL from query parameters or use default
function getVideoUrl() {
  const params = new URLSearchParams(window.location.search);
  const videoUrl = params.get('video');
  return videoUrl;
}

function getRoomId() {
  return new URLSearchParams(window.location.search).get('roomId') || 'default';
}

export default function Viewer() {
  const videoRef = useRef();
  const socketRef = useRef();
  const pendingSeek = useRef(null);
  const hasReceivedInitialSync = useRef(false);
  const hlsRef = useRef();
  const [joinStatus, setJoinStatus] = useState('');
  const [ready, setReady] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [viewers, setViewers] = useState([]);
  const [socketId, setSocketId] = useState('');
  
  // Copy helpers
  const [copiedRoomId, setCopiedRoomId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  console.log('videoUrl', videoUrl);
  
  // Authentication
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Copy helpers
  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(getRoomId());
    setCopiedRoomId(true);
    setTimeout(() => setCopiedRoomId(false), 1200);
  };
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1200);
  };

  const shareUrl = `${window.location.origin}/viewer?roomId=${getRoomId()}`;

  // Initialize HLS player
  useEffect(() => {
    if (!ready || !videoUrl) return;
    
    const video = videoRef.current;
    if (!video) return;

    console.log('Initializing HLS player with URL:', videoUrl);

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
  }, [ready, videoUrl]);

  useEffect(() => {
    if (!ready) return;
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
      console.log('viewer-joined', data);
      setViewers((prev) => {
        if (prev.some(v => v.id === data.viewerId)) return prev;
        return [...prev, { id: data.viewerId, username: data.username }];
      });
    });
    socket.on('viewers-list', (data) => {
      console.log('viewers-list', data);
      setViewers(Array.isArray(data.viewers) ? data.viewers : []);
    });
    socket.on('user-left', (data) => {
      console.log(`User left: ${data.role} with socketId: ${data.socketId}`);
      if (data.role === 'host') {
        setJoinStatus('Host has left the room. The session has ended.');
      } else if (data.role === 'viewer') {
        setViewers((prev) => prev.filter(v => v.id !== data.socketId));
      }
    });
    
    // Handle initial sync when joining a room with active video
    socket.on('initial-sync', (syncData) => {
      console.log('Received initial sync:', syncData);
      const video = videoRef.current;
      if (!video) return;
      
      // Update video URL if provided
      if (syncData.videoUrl) {
        console.log('Received video URL in initial sync:', syncData.videoUrl);
        setVideoUrl(syncData.videoUrl);
      }
      
      // Mark that we've received initial sync
      hasReceivedInitialSync.current = true;
      
      const handleInitialSync = async () => {
        try {
          if (video.readyState < 1) {
            // Video not ready yet, store the sync info
            pendingSeek.current = { 
              time: syncData.currentTime, 
              play: syncData.isPlaying 
            };
            return;
          }
          
          // Set the current time
          video.currentTime = syncData.currentTime;
          
          // If video was playing, start playing
          if (syncData.isPlaying) {
            await video.play();
            console.log(`Auto-resumed video at ${syncData.currentTime}s`);
          } else {
            video.pause();
            console.log(`Synced to paused video at ${syncData.currentTime}s`);
          }
        } catch (err) {
          console.warn('Could not auto-resume video:', err);
        }
      };
      
      handleInitialSync();
    });
    
    const roomId = getRoomId();
    socket.emit('join', { 
      roomId, 
      role: 'viewer',
      userInfo: {
        id: user?.id,
        username: user?.username
      }
    });
    return () => socket.disconnect();
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const video = videoRef.current;
    const socket = socketRef.current;
    if (!video || !socket) return;

    const handleSync = async ({ type, currentTime }) => {
      try {
        if (type === 'play') {
          if (Math.abs(video.currentTime - currentTime) > 0.5) {
            await seekAndPlay(currentTime);
          } else {
            await video.play();
          }
        } else if (type === 'pause') {
          video.pause();
        } else if (type === 'seek') {
          seekAndPause(currentTime);
        }
      } catch (err) {
        // Optionally show a message to the user
        console.warn('Autoplay blocked, user interaction required.');
      }
    };

    const seekAndPlay = async (time) => {
      if (video.readyState < 1) {
        pendingSeek.current = { time, play: true };
        return;
      }
      video.currentTime = time;
      await video.play();
    };
    const seekAndPause = (time) => {
      if (video.readyState < 1) {
        pendingSeek.current = { time, play: false };
        return;
      }
      video.currentTime = time;
      video.pause();
    };

    socket.on('sync-event', handleSync);

    // Handle video load for pending seek
    const onLoaded = () => {
      if (pendingSeek.current) {
        video.currentTime = pendingSeek.current.time;
        if (pendingSeek.current.play) video.play();
        else video.pause();
        pendingSeek.current = null;
      }
    };
    video.addEventListener('loadeddata', onLoaded);

    return () => {
      socket.off('sync-event', handleSync);
      video.removeEventListener('loadeddata', onLoaded);
    };
  }, [ready]);

  if (!ready) {
    return (
      <div className="h-full w-full flex flex-col items-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="w-full bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-center transition-colors duration-300">
          <div className="w-full max-w-7xl flex items-center justify-end lg:pl-8 lg:pr-10">
            <button
              onClick={() => navigate('/join')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200 mr-auto"
            >
              <FiArrowLeft className="w-4 h-4" />
              Back to Join Room
            </button>
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Viewer View</h1>
              {videoUrl && (
                <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
                  Watching: {videoUrl.split('/').pop()?.split('?')[0] || 'Custom Video'}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          <div className="text-center space-y-6">
            <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto">
              <FiPlay className="w-12 h-12 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Ready to Watch?</h2>
              <p className="text-gray-600 dark:text-gray-300">Click the button below to join the live stream</p>
            </div>
            <button
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
              onClick={() => setReady(true)}
            >
              Start Watching
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col items-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header  */}
      <div className="w-full bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 py-4 flex justify-center px-8 transition-colors duration-300">
        <div className="w-full flex flex-row items-center justify-between">
          <button
            onClick={() => navigate('/join')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to Join Room
          </button>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Viewer's View</h1>
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
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
            {/* HLS Video Player */}
            <div className="w-full h-[75%]">
              <video
                  ref={videoRef}
                  controls={false}
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
                    <span className="font-mono font-semibold text-blue-700 dark:text-blue-300 text-sm">{getRoomId()}</span>
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
                    <span className="text-gray-700 dark:text-gray-200 font-medium text-sm">Share with others:</span>
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
            {ready && socketRef.current ? (
              <Chat socket={socketRef.current} roomId={getRoomId()} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
} 