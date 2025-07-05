import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Toast from './Toast';

const Signup = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const { signup, clearError, isAuthenticated } = useAuth();
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
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username) newErrors.username = 'Username is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const { username, email, password } = formData;
      const result = await signup({ username, email, password });
      if (result.success) {
        navigate('/videos');
      } else {
        setToast({ message: result.error || 'Signup failed', type: 'error' });
      }
    } catch (error) {
      console.error('Signup error:', error);
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
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">Create your account</h2>
          <p className="mt-2 text-center text-sm text-gray-500">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-purple-500 transition-colors"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={formData.username}
                onChange={handleChange}
                className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${errors.username ? 'border-red-400' : 'border-gray-300'} placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 sm:text-sm`}
                placeholder="Enter your username"
              />
              {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username}</p>}
            </div>
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
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${errors.password ? 'border-red-400' : 'border-gray-300'} placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 sm:text-sm`}
                placeholder="Enter your password"
              />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${errors.confirmPassword ? 'border-red-400' : 'border-gray-300'} placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 sm:text-sm`}
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
            </div>
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 shadow"
              >
                {isSubmitting ? 'Signing up...' : 'Sign Up'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup; 