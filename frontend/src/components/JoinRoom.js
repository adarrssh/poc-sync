import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const JoinRoom = () => {
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    if (!roomId.trim()) {
      setError('Room ID is required');
      return;
    }
    setError('');
    navigate(`/viewer?roomId=${encodeURIComponent(roomId.trim())}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Join a Room</h2>
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Room ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              placeholder="Enter Room ID"
              className={`block w-full rounded-lg border-2 text-base px-4 py-2 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm ${error ? 'border-red-500' : 'border-gray-300'} disabled:bg-gray-100`}
              maxLength={100}
              required
            />
            {error && (
              <p className="mt-1 text-sm text-red-600 font-medium">{error}</p>
            )}
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinRoom; 