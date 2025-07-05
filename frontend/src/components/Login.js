import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ApiTest from './ApiTest';
import Toast from './Toast';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const { login,  clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/videos');
    }
  }, [isAuthenticated, navigate]);

  // Clear auth error when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await login(formData);
      if (result.success) {
        navigate('/videos');
        console.log('Login successful! inside handleSubmit');
      } else {
        setToast({ message: result.error || 'Login failed', type: 'error' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setToast({ message: 'An unexpected error occurred', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="w-full max-w-md space-y-8">
        <div>
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow">
              <span className="text-blue-600 font-bold text-2xl">S</span>
            </div>
          </div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
          <p className="mt-2 text-center text-sm text-gray-500">
            Or{' '}
            <Link
              to="/signup"
              className="font-medium text-blue-600 hover:text-purple-500 transition-colors"
            >
              create a new account
            </Link>
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${errors.email ? 'border-red-400' : 'border-gray-300'} placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 sm:text-sm`}
                placeholder="Enter your email"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${errors.password ? 'border-red-400' : 'border-gray-300'} placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 sm:text-sm`}
                placeholder="Enter your password"
              />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 shadow"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login; 