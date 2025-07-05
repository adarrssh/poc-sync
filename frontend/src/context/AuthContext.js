import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../config';

// Create auth context
const AuthContext = createContext();

// Axios instance with base URL
const api = axios.create({
  baseURL: API_CONFIG.url,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Debug logging
console.log('API Base URL:', API_CONFIG.url);

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Add request logging for debugging
  console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
  
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.log(`❌ API Error: ${error.response?.status} ${error.config?.url}`);
    
    // Only redirect on 401 if we have a token (meaning user was logged in)
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      console.log('🔄 Token expired, redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on app start
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      // Verify token is still valid
      verifyToken();
    } else {
      setLoading(false);
    }
  }, []);

  // Verify token with server
  const verifyToken = async () => {
    try {
      const response = await api.get('/api/auth/me');
      setUser(response.data.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    } catch (error) {
      console.error('Token verification failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  // Sign up function
  const signup = async (userData) => {
    try {
      setError(null);
      console.log('🚀 Signup function called with data:', { username: userData.username, email: userData.email });
      console.log('🌐 Making request to:', `${API_CONFIG.url}/api/auth/signup`);
      
      const response = await api.post('/api/auth/signup', userData);
      
      console.log('✅ Signup response received:', response.data);
      
      const { user, token } = response.data.data;
      
      // Save to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Update state
      setUser(user);
      
      console.log('✅ Signup successful, user set:', user.username);
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('💥 Signup error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        stack: error.stack
      });
      
      let responseData = error.response?.data;
      let errorMessage = 'Signup failed';
      
      if (error.response?.data?.errors && Array.isArray(error.response?.data?.errors)) {
        
        if (responseData.errors && Array.isArray(responseData.errors)) {
          // Format 2: {"success":false,"message":"Validation failed","errors":[...]}
          const firstError = responseData.errors[0];
          if (firstError && firstError.msg) {
            errorMessage = firstError.msg;
          } else {
            errorMessage = responseData.message || 'Validation failed';
          }
        }
      } else if (responseData.message) {
        // Format 1: {"success":false,"message":"Invalid email or password"}
        errorMessage = responseData.message;
      }  else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Unable to connect to server';
      } else {
        // Something else happened
        errorMessage = 'An unexpected error occurred';
      }
      
      setError(errorMessage);
      console.log('❌ Signup failed, error set:', errorMessage);
      
      return { success: false, error: errorMessage };
    }
  };

  // Login function
  const login = async (credentials) => {
    try {
      setError(null);
      console.log('🚀 Login function called with credentials:', { email: credentials.email });
      console.log('🌐 Making request to:', `${API_CONFIG.url}/api/auth/login`);
      
      const response = await api.post('/api/auth/login', credentials);
      
      console.log('✅ Login response received:', response.data);
      
      const { user, token } = response.data.data;
      
      // Save to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Update state
      setUser(user);
      
      console.log('✅ Login successful, user set:', user.username);
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('💥 Login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      let errorMessage = 'Login failed';
      
      if (error.response?.data) {
        const responseData = error.response.data;
        
        // Handle the two specific error formats
       if (responseData.errors && Array.isArray(responseData.errors)) {
          // Format 2: {"success":false,"message":"Validation failed","errors":[...]}
          const firstError = responseData.errors[0];
          if (firstError && firstError.msg) {
            errorMessage = firstError.msg;
          } else {
            errorMessage = responseData.message || 'Validation failed';
          }
        }else  if (responseData.message) {
          // Format 1: {"success":false,"message":"Invalid email or password"}
          errorMessage = responseData.message;
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Unable to connect to server';
      } else {
        // Something else happened
        errorMessage = 'An unexpected error occurred';
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = async () => {
    console.log('🚪 Logout function called');
    
    try {
      // Call logout API first (while we still have the token)
      const token = localStorage.getItem('token');
      if (token) {
        console.log('🌐 Making logout API call');
        await api.post('/api/auth/logout');
        console.log('✅ Logout API call successful');
      }
    } catch (error) {
      console.log('⚠️ Logout API call failed (this is okay):', error.message);
      // Don't throw error - logout should continue even if API call fails
    } finally {
      // Remove from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Update state
      setUser(null);
      setError(null);
      
      console.log('✅ Logout completed - token and user data cleared');
    }
  };

  // Update profile function
  const updateProfile = async (profileData) => {
    try {
      setError(null);
      const response = await api.put('/api/auth/profile', profileData);
      
      const updatedUser = response.data.data.user;
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update state
      setUser(updatedUser);
      
      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Profile update failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Clear error function
  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    signup,
    login,
    logout,
    updateProfile,
    clearError,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { api }; 