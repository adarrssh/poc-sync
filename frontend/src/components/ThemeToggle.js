import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { FaSun, FaMoon } from 'react-icons/fa';

const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${className}`}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Background */}
      <div className={`h-8 w-16 rounded-full transition-colors duration-300 ${
        isDark 
          ? 'bg-gradient-to-r from-blue-600 to-purple-600' 
          : 'bg-gray-200'
      }`}>
        {/* Sliding circle */}
        <div className={`absolute top-1 h-6 w-6 transform rounded-full bg-white shadow-lg transition-all duration-300 ease-in-out ${
          isDark ? 'translate-x-8' : 'translate-x-1'
        }`}>
          {/* Icons inside the sliding circle */}
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
            isDark ? 'opacity-0' : 'opacity-100'
          }`}>
            <FaSun className="h-3 w-3 text-yellow-500" />
          </div>
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
            isDark ? 'opacity-100' : 'opacity-0'
          }`}>
            <FaMoon className="h-3 w-3 text-blue-600" />
          </div>
        </div>
      </div>
    </button>
  );
};

export default ThemeToggle; 