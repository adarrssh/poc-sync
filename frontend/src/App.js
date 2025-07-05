import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navigation from './components/Navigation';
import Login from './components/Login';
import Signup from './components/Signup';
import Host from './Host';
import Viewer from './Viewer';
import VideoUpload from './components/VideoUpload';
import VideoDashboard from './components/VideoDashboard';

// Layout wrapper for protected routes
const ProtectedLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Protected routes with navigation */}
          <Route 
            path="/host" 
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <Host />
                </ProtectedLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/viewer" 
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <Viewer />
                </ProtectedLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/videos" 
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <VideoDashboard />
                </ProtectedLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/upload" 
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <VideoUpload />
                </ProtectedLayout>
              </ProtectedRoute>
            } 
          />
          
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/videos" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
