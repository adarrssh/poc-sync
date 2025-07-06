import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const VideoUpload = () => {
  const [file, setFile] = useState(null);
  const [videoName, setVideoName] = useState("");
  const [nameError, setNameError] = useState("");
  const [message, setMessage] = useState('');
  const { error, clearError } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const abortControllerRef = useRef(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    clearError();
    setMessage('');
    setUploadError('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage('Please select a file.');
      return;
    }
    if (!videoName.trim()) {
      setNameError('Video name is required.');
      return;
    } else {
      setNameError("");
    }

    setUploading(true);
    setUploadError('');
    setMessage('');
    const formData = new FormData();
    formData.append('video', file);
    formData.append('displayName', videoName);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await api.post('/api/upload/video', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        signal: abortController.signal
      });
      if (response.status === 200 || response.status === 201) {
        setMessage('Upload successful! Redirecting to your videos...');
        setTimeout(() => {
          navigate('/videos');
        }, 2000);
      } else {
        setUploadError('Upload failed: ' + (response.data?.message || response.status));
      }
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') {
        setUploadError('Upload cancelled.');
      } else {
        setUploadError('Error: ' + (err.response?.data?.message || err.message));
      }
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setUploading(false);
    setUploadError('Upload cancelled.');
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
                  disabled={uploading}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Video Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={videoName}
                  onChange={e => setVideoName(e.target.value)}
                  placeholder="Enter a name for your video"
                  className={`block w-full rounded-lg border-2 text-base px-4 py-2 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm ${nameError ? 'border-red-500' : 'border-gray-300'} disabled:bg-gray-100`}
                  maxLength={100}
                  disabled={uploading}
                  required
                />
                {nameError && (
                  <p className="mt-1 text-sm text-red-600 font-medium">{nameError}</p>
                )}
              </div>
              <div className="flex gap-4">
                <button 
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60"
                  disabled={uploading}
                >
                  {uploading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                      Uploading...
                    </span>
                  ) : 'Upload Video'}
                </button>
                {uploading && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex items-center px-4 py-2 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
            {message && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800">{message}</p>
              </div>
            )}
            {(error || uploadError) && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800">{error || uploadError}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoUpload; 