import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MdCloudUpload, MdVideoLibrary, MdCancel, MdCheckCircle } from 'react-icons/md';

const VideoUpload = () => {
  const [file, setFile] = useState(null);
  const [videoName, setVideoName] = useState("");
  const [nameError, setNameError] = useState("");
  const [message, setMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const { error, clearError } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const abortControllerRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
    clearError();
    setMessage('');
    setUploadError('');
  };

  const validateAndSetFile = (file) => {
    // Check file type
    if (!file.type.startsWith('video/')) {
      setUploadError('Please select a valid video file.');
      return;
    }

    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      setUploadError('File size must be less than 100MB.');
      return;
    }

    setFile(file);
    setUploadError('');
    
    // Auto-generate name if empty
    if (!videoName.trim()) {
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
      setVideoName(nameWithoutExtension);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
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
    setUploadProgress(0);
    
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
        signal: abortController.signal,
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
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
      setUploadProgress(0);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setUploading(false);
    setUploadProgress(0);
    setUploadError('Upload cancelled.');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors duration-300">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Upload Video</h2>
              <p className="text-gray-600 dark:text-gray-300">Share your videos with the world. Supported formats: MP4, AVI, MOV, and more.</p>
            </div>
            
            <form onSubmit={handleUpload} className="space-y-6">
              {/* File Upload Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
                  Select Video File
                </label>
                
                {/* Drag & Drop Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 cursor-pointer ${
                    isDragOver
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploading}
                  />
                  
                  {file ? (
                    <div className="space-y-3">
                      <MdVideoLibrary className="mx-auto h-12 w-12 text-green-500" />
                      <div>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">{file.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          setVideoName("");
                        }}
                        className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                        disabled={uploading}
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <MdCloudUpload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                      <div>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">
                          Drop your video here, or click to browse
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          MP4, AVI, MOV up to 100MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Video Name Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Video Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={videoName}
                  onChange={e => setVideoName(e.target.value)}
                  placeholder="Enter a name for your video"
                  className={`block w-full rounded-lg border-2 text-base px-4 py-3 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                    nameError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } disabled:bg-gray-100 dark:disabled:bg-gray-600`}
                  maxLength={100}
                  disabled={uploading}
                  required
                />
                {nameError && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-medium">{nameError}</p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {videoName.length}/100 characters
                </p>
              </div>

              {/* Upload Progress */}
              {uploading && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button 
                  type="submit"
                  className="flex-1 flex justify-center items-center gap-2 py-3 px-6 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                  disabled={uploading || !file}
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <MdCloudUpload className="h-5 w-5" />
                      Upload Video
                    </>
                  )}
                </button>
                
                {uploading && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 transition-colors duration-200"
                  >
                    <MdCancel className="h-5 w-5" />
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* Success Message */}
            {message && (
              <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <MdCheckCircle className="h-5 w-5 text-green-500" />
                  <p className="text-green-800 dark:text-green-200">{message}</p>
                </div>
              </div>
            )}

            {/* Error Messages */}
            {(error || uploadError) && (
              <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <MdCancel className="h-5 w-5 text-red-500" />
                  <p className="text-red-800 dark:text-red-200">{error || uploadError}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoUpload; 