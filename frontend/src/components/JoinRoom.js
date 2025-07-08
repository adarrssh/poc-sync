import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiArrowRight, FiCopy } from 'react-icons/fi';

const JoinRoom = () => {
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!roomId.trim()) {
      setError('Room ID is required');
      return;
    }
    setError('');
    setIsJoining(true);
    
    // Simulate a brief loading state for better UX
    setTimeout(() => {
      navigate(`/viewer?roomId=${encodeURIComponent(roomId.trim())}`);
    }, 500);
  };

  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      // You could add a toast notification here
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-md border border-gray-200 dark:border-gray-700 transition-colors duration-300">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiUsers className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Join a Room</h2>
          <p className="text-gray-600 dark:text-gray-300">Enter the room ID to join a live stream</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
              Room ID <span className="text-red-500">*</span>
            </label>
            
            {/* Room ID Input with Copy Button */}
            <div className="relative">
              <input
                type="text"
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                placeholder="Enter Room ID"
                className={`block w-full rounded-lg border-2 text-base px-4 py-3 pr-12 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                  error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                maxLength={100}
                required
              />
              {roomId && (
                <button
                  type="button"
                  onClick={copyRoomId}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  title="Copy Room ID"
                >
                  <FiCopy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              )}
            </div>
            
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
            )}
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={isJoining}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isJoining ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                Joining...
              </>
            ) : (
              <>
                <FiArrowRight className="w-4 h-4" />
                Join Room
              </>
            )}
          </button>
        </form>

        {/* Help Section */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">How to join a room?</h3>
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p>1. Ask the host for the Room ID</p>
              <p>2. Enter the Room ID above</p>
              <p>3. Click "Join Room" to start watching</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinRoom; 