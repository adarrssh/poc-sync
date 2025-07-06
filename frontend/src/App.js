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
import JoinRoom from './components/JoinRoom';

// Layout wrapper for protected routes
const ProtectedLayout = ({ children }) => {
  return (
    <div className="flex flex-col h-screen w-screen">
      <Navigation />
      <main className="flex-1 w-full overflow-auto">
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
          {/* Public join room page for viewers */}
          <Route path="/join" element={<ProtectedLayout><JoinRoom /></ProtectedLayout>} />
          
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/videos" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
