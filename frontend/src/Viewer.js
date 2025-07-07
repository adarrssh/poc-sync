import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { SOCKET_CONFIG } from './config';
import { useAuth } from './context/AuthContext';
import Hls from 'hls.js';
import Chat from './components/Chat';
import { FiCopy } from "react-icons/fi";

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
      <div className="h-full w-full flex flex-col items-center bg-gray-50">
        <div className="w-full bg-white shadow-sm border-b px-6 py-4 flex justify-center">
          <div className="w-full max-w-7xl flex items-center justify-end lg:pl-8 lg:pr-10">
            <button
              onClick={() => navigate('/join')}
              className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors h-10 mr-auto"
              style={{minHeight: '2.5rem'}}
            >
              ← Back to Join Room
            </button>
            <div className="flex items-center gap-4 h-10" style={{minHeight: '2.5rem'}}>
              <h1 className="text-2xl font-bold text-gray-900">Viewer View</h1>
              {videoUrl && (
                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  Watching: {videoUrl.split('/').pop()?.split('?')[0] || 'Custom Video'}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          <button
            className="px-6 py-3 bg-blue-600 text-white rounded text-lg hover:bg-blue-700 transition-colors"
            onClick={() => setReady(true)}
          >
            Start Watching
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col items-center bg-gray-50">
      {/* Header  */}
      <div className="w-full bg-white shadow-sm border-b py-4 flex justify-center px-8">
        <div className="w-full flex flex-row items-center justify-between">
          <button
            onClick={() => navigate('/join')}
            className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors h-10 mr-auto"
            style={{minHeight: '2.5rem'}}
          >
            ← Back to Join Room
          </button>
          <div className="flex items-center gap-4 h-10" style={{minHeight: '2.5rem'}}>
            <h1 className="text-2xl font-bold text-gray-900">Viewer's View</h1>
            {/* {videoUrl && (
              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                Watching: {videoUrl.split('/').pop()?.split('?')[0] || 'Custom Video'}
              </div>
            )} */}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="w-full h-full flex flex-row gap-5 p-4 overflow-y-hidden">
        {/* Left: Video and info */}
        <div className="h-full w-[70%] flex-1 flex flex-col items-start">
          {/* Video Player Card */}
          <div className="w-full h-full rounded-xl shadow-lg p-6 flex flex-col gap-5  bg-grey-50 border">
            {/* {joinStatus && (
              <div className={`mb-4 px-4 py-2 rounded ${joinStatus.startsWith('Error') ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>{joinStatus}</div>
            )} */}
            {/* HLS Video Player */}
            <div className="w-full h-[80%]">
              <video
                  ref={videoRef}
                  controls = {false}
                  className="w-full rounded-lg shadow"
                  style={{ 
                    aspectRatio: '16/5',  
                    background: '#000',
                    height: '100%'
                  }}
              />
            </div>
            {/* Room info and viewers below video */}
            <div className="flex flex-row justify-end gap-4 w-full h-[20%]">
            <div className="flex flex-col gap-4 w-full">
              {/* Room ID Section */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700 font-medium">Room ID:</span>
                    <span className="font-mono font-semibold text-blue-700 text-base">{getRoomId()}</span>
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
                  <div className="text-gray-700 font-medium mb-1">Share with others:</div>
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
              <div className="bg-gray-50 rounded-lg pl-4 pt-2 min-w-[220px] h-full overflow-scroll scrollbar-hide shadow-inner border border-gray-200">
                <div className="font-semibold mb-2 text-gray-700 text-sm">Viewers in Room</div>
                {viewers.length === 0 ? (
                  <div className="text-gray-400 text-xs">No viewers have joined yet.</div>
                ) : (
                  <ul className="list-disc pl-5">
                    {viewers.map((viewer) => (
                      <li key={viewer.id} className="text-xs text-gray-700">
                        {viewer.username || 'Unknown User'}
                        {viewer.id === socketId && (
                          <span className="ml-1 text-blue-600 font-medium">(You)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Right: Chat */}
        <div className="w-[30%] h-full overflow-hidden rounded-xl shadow-lg">
        <div className="border rounded-xl  p-4 h-full flex flex-col overflow-y-hidden">
        {ready && socketRef.current ? (
              <Chat socket={socketRef.current} roomId={getRoomId()} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
} 