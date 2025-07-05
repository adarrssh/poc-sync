import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const VideoUpload = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const { error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    clearError();
    setMessage('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage('Please select a file.');
      return;
    }

    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await api.post('/api/upload/video', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      if (response.status === 200 || response.status === 201) {
        setMessage('Upload successful! Redirecting to your videos...');
        setTimeout(() => {
          navigate('/videos');
        }, 2000);
      } else {
        setMessage('Upload failed: ' + (response.data?.message || response.status));
      }
    } catch (err) {
      console.error(err);
      setMessage('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Video</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Video File
                </label>
                <input 
                  type="file" 
                  accept="video/*" 
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <button 
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Upload Video
              </button>
            </form>
            {message && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800">{message}</p>
              </div>
            )}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoUpload; 