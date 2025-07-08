import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Toast from './Toast';

const getVideoTitle = (video) =>
  video.displayName?.trim() || video.originalName || 'Untitled Video';

const getVideoDate = (video) => {
  const dateStr = video.createdAt || video.uploadedAt || video.date;
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
};

const getHlsUrl = (video) => video.hlsUrl || video.hls_url || video.url;

const VideoDashboard = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [statusFilter, setStatusFilter] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch videos from API
  const fetchVideos = async (page = 1, status = '') => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      });
      if (status) {
        params.append('status', status);
      }
      const response = await api.get(`/api/upload/videos?${params}`);
      setVideos(response.data.videos);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos(1, statusFilter);
    // eslint-disable-next-line
  }, [statusFilter]);

  const handlePageChange = (newPage) => {
    fetchVideos(newPage, statusFilter);
  };

  const handleStatusFilterChange = (newStatus) => {
    setStatusFilter(newStatus);
  };

  // Real API call for Convert to HLS, with toast feedback
  const handleConvertToHLS = async (video) => {
    try {
      setError(null);
      const s3Key = video.s3Key || (getHlsUrl(video) ? getHlsUrl(video).split('.com/')[1] : null);
      if (!s3Key) {
        setToast({ message: 'S3 key is missing for this video. Please try refreshing the page.', type: 'error' });
        return;
      }
      const response = await api.post(`/api/upload/convert-to-hls/${video._id || video.id}`, {
        s3Key: s3Key
      });
      fetchVideos(pagination.page, statusFilter);
      setToast({ message: 'Video encoding started successfully!', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to start video conversion', type: 'error' });
    }
  };

  const handleStreaming = async (videoId) => {
    try {
      setError(null);
      const response = await api.get(`/api/upload/streaming/${videoId}`);
      
      if (response.data.streamingUrls) {
        // Navigate to host page with the streaming URL
        const streamingUrl = response.data.streamingUrls.master;
        navigate(`/host?video=${encodeURIComponent(streamingUrl)}`);
      } else {
        alert('Video is still being processed. Please wait for encoding to complete.');
      }
    } catch (err) {
      console.error('Error getting streaming URLs:', err);
      setError(err.response?.data?.message || 'Failed to get streaming URLs');
    }
  };

  // UI starts here
  if (loading && videos.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading your videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">My Videos</h1>
              <p className="text-gray-500 dark:text-gray-300 text-base">Welcome back, <span className="font-semibold text-blue-700 dark:text-blue-300">{user?.username}</span>! Here are your uploaded videos.</p>
            </div>
            {/* Filters */}
            <div className="flex gap-2 mt-4 sm:mt-0">
              <button
                onClick={() => handleStatusFilterChange('')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors duration-150 ${statusFilter === '' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-700'}`}
              >
                All
              </button>
              <button
                onClick={() => handleStatusFilterChange('processing')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors duration-150 ${statusFilter === 'processing' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-700'}`}
              >
                Processing
              </button>
              <button
                onClick={() => handleStatusFilterChange('completed')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors duration-150 ${statusFilter === 'completed' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-700'}`}
              >
                Completed
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-400">❌</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</div>
                </div>
              </div>
            </div>
          )}

          {/* Video Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {videos.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 dark:text-gray-400 py-16">
                <div className="text-5xl mb-2">📭</div>
                <p className="text-lg font-semibold dark:text-gray-200">No videos found</p>
                <p className="text-sm dark:text-gray-300">Upload a video to get started!</p>
              </div>
            ) : (
              videos.map((video) => {
                const hlsUrl = getHlsUrl(video);
                const isFailed = video.status === 'failed';
                return (
                  <div
                    key={video._id || video.id}
                    className={`rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 p-5 flex flex-col border ${isFailed ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-gray-800 border-transparent dark:border-gray-700'}`}
                  >
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate mb-1">{getVideoTitle(video)}</h2>
                      {/* <p className="text-sm text-gray-500 truncate mb-2">{video.originalName || video.originalname || video.filename || ''}</p> */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${video.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : video.status === 'processing' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' : video.status === 'failed' ? 'bg-red-200 dark:bg-red-900/30 text-red-800 dark:text-red-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{video.status || 'unknown'}</span>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">Uploaded: {getVideoDate(video)}</div>
                      {/* Progress bar for processing videos */}
                      {video.status === 'processing' && (
                        <div className="mb-2">
                          {typeof video.encodingProgress === 'number' ? (
                            <>
                              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                                <span>Encoding Progress</span>
                                <span>{video.encodingProgress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${video.encodingProgress}%` }}
                                ></div>
                              </div>
                            </>
                          ) : (
                            <span className="block text-xs text-gray-500 dark:text-gray-400">Processing...</span>
                          )}
                        </div>
                      )}
                      {/* Error message for failed videos */}
                      {isFailed && video.error && (
                        <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs">
                          <span className="font-semibold">Error:</span> {video.error}
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex gap-2">
                      {/* Convert to HLS button if not processing or completed */}
                      {video.status !== 'processing' && video.status !== 'completed' && !isFailed && (
                        <button
                          onClick={() => handleConvertToHLS(video)}
                          className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow hover:from-blue-700 hover:to-purple-700 transition-colors"
                        >
                          Convert to HLS
                        </button>
                      )}
                      {/* Host button if completed and hlsUrl exists */}
                      {video.status === 'completed' && hlsUrl && (
                        <button
                          onClick={() => handleStreaming(video.id)}
                          className="flex-1 px-4 py-2 rounded-lg border border-blue-600 dark:border-blue-400 text-blue-700 dark:text-blue-300 font-semibold bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          Host
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDashboard; 