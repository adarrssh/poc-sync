import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const Chat = ({ socket, roomId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Set initial connection state
    setIsConnected(socket.connected);

    const handleConnect = () => {
      setIsConnected(true);
      console.log('Chat: Connected to socket');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      console.log('Chat: Disconnected from socket');
    };

    const handleChatMessage = (data) => {
      console.log('Chat: Received message:', data);
      setMessages(prev => [...prev, {
        id: Date.now() + Math.random(),
        username: data.username,
        message: data.message,
        timestamp: new Date(),
        isOwn: data.userId === user?.id
      }]);
    };

    const handleUserJoined = (data) => {
      setMessages(prev => [...prev, {
        id: Date.now() + Math.random(),
        type: 'system',
        message: `${data.username} joined the room`,
        timestamp: new Date()
      }]);
    };

    const handleUserLeft = (data) => {
      setMessages(prev => [...prev, {
        id: Date.now() + Math.random(),
        type: 'system',
        message: `${data.username} left the room`,
        timestamp: new Date()
      }]);
    };

    // Listen for socket events
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('chat-message', handleChatMessage);
    socket.on('user-joined-chat', handleUserJoined);
    socket.on('user-left-chat', handleUserLeft);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('chat-message', handleChatMessage);
      socket.off('user-joined-chat', handleUserJoined);
      socket.off('user-left-chat', handleUserLeft);
    };
  }, [socket, user]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !user) return;

    const messageData = {
      roomId,
      message: newMessage.trim(),
      username: user.username,
      userId: user.id
    };

    socket.emit('send-chat-message', messageData);
    setNewMessage('');
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">Chat</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px] md:max-h-[600px]">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">💬</div>
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div className="flex flex-col items-end max-w-xs lg:max-w-md">
                {/* Username (always show for all messages except system) */}
                {msg.type !== 'system' && (
                  <div className={`text-xs font-medium mb-1 ${msg.isOwn ? 'text-blue-700 text-right' : 'text-gray-600 text-left'}`}>
                    {msg.username}
                  </div>
                )}
                <div
                  className={`w-full px-3 py-2 rounded-lg ${
                    msg.type === 'system'
                      ? 'bg-gray-100 text-gray-600 text-center mx-auto text-sm'
                      : msg.isOwn
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  <div className="text-sm">{msg.message}</div>
                </div>
                {/* Time (always show) */}
                <div
                  className={`text-xs mt-1 ${
                    msg.type === 'system'
                      ? 'text-gray-500 text-center w-full'
                      : msg.isOwn
                      ? 'text-blue-400 text-right'
                      : 'text-gray-500 text-left'
                  }`}
                >
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={sendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={!isConnected}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !isConnected}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat; 