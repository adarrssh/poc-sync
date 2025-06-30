import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Signup from './components/Signup';
import Host from './Host';
import Viewer from './Viewer';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Protected routes */}
          <Route 
            path="/host" 
            element={
              <ProtectedRoute>
                <Host />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/viewer" 
            element={
              <ProtectedRoute>
                <Viewer />
              </ProtectedRoute>
            } 
          />
          
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/host" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
