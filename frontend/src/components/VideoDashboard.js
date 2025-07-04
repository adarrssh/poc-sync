import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../context/AuthContext';
import Navigation from './Navigation';

const VideoDashboard = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
      console.error('Error fetching videos:', err);
      setError(err.response?.data?.message || 'Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  };

  // Load videos on component mount and when filters change
  useEffect(() => {
    fetchVideos(1, statusFilter);
  }, [statusFilter]);

  // Handle page change
  const handlePageChange = (newPage) => {
    fetchVideos(newPage, statusFilter);
  };

  // Handle status filter change
  const handleStatusFilterChange = (newStatus) => {
    setStatusFilter(newStatus);
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'uploaded':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'processing':
        return '🔄';
      case 'failed':
        return '❌';
      case 'uploaded':
        return '📤';
      default:
        return '📄';
    }
  };

  // Handle video conversion
  const handleConvertToHLS = async (videoId, s3Key) => {
    try {
      setError(null);
      const response = await api.post(`/api/upload/convert-to-hls/${videoId}`, {
        s3Key: s3Key
      });
      
      // Refresh videos to show updated status
      fetchVideos(pagination.page, statusFilter);
      
      alert('Video encoding started successfully!');
    } catch (err) {
      console.error('Error starting conversion:', err);
      setError(err.response?.data?.message || 'Failed to start video conversion');
    }
  };

  // Handle streaming
  const handleStreaming = async (videoId) => {
    try {
      setError(null);
      const response = await api.get(`/api/upload/streaming/${videoId}`);
      
      if (response.data.streamingUrls) {
        // Open streaming URL in new tab
        window.open(response.data.streamingUrls.master, '_blank');
      } else {
        alert('Video is still being processed. Please wait for encoding to complete.');
      }
    } catch (err) {
      console.error('Error getting streaming URLs:', err);
      setError(err.response?.data?.message || 'Failed to get streaming URLs');
    }
  };

  if (loading && videos.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Videos</h1>
          <p className="mt-2 text-gray-600">
            Welcome back, {user?.username}! Here are your uploaded videos.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">❌</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Videos</option>
              <option value="uploaded">Uploaded</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          
          <div className="text-sm text-gray-600">
            {pagination.total > 0 && (
              <span>Showing {videos.length} of {pagination.total} videos</span>
            )}
          </div>
        </div>

        {/* Videos Grid */}
        {videos.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📹</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No videos found</h3>
            <p className="text-gray-600">
              {statusFilter 
                ? `No videos with status "${statusFilter}" found.`
                : "You haven't uploaded any videos yet."
              }
            </p>
            {!statusFilter && (
              <a
                href="/upload"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Upload Your First Video
              </a>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div
                key={video.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
              >
                {/* Video Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {video.originalName}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatFileSize(video.size)}
                      </p>
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(video.status)}`}>
                        {getStatusIcon(video.status)} {video.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Video Details */}
                <div className="p-4">
                  <div className="space-y-3">
                    {/* Progress Bar */}
                    {video.status === 'processing' && (
                      <div>
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Encoding Progress</span>
                          <span>{video.encodingProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${video.encodingProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Upload Date */}
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Uploaded:</span> {formatDate(video.uploadedAt)}
                    </div>

                    {/* Encoding Times */}
                    {video.encodingStartedAt && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Encoding Started:</span> {formatDate(video.encodingStartedAt)}
                      </div>
                    )}
                    
                    {video.encodingCompletedAt && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Completed:</span> {formatDate(video.encodingCompletedAt)}
                      </div>
                    )}

                    {/* Error Message */}
                    {video.error && (
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        <span className="font-medium">Error:</span> {video.error}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {video.status === 'uploaded' && (
                      <button
                        onClick={() => handleConvertToHLS(video.id, video.s3Key)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        🔄 Convert to HLS
                      </button>
                    )}
                    
                    {video.status === 'completed' && video.streamingUrls && (
                      <button
                        onClick={() => handleStreaming(video.id)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        ▶️ Stream Video
                      </button>
                    )}
                    
                    {video.status === 'processing' && (
                      <button
                        onClick={() => fetchVideos(pagination.page, statusFilter)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        🔄 Refresh Status
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrev}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNext}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{pagination.page}</span> of{' '}
                  <span className="font-medium">{pagination.pages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrev}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default VideoDashboard; 