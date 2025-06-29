import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Host from './Host';
import Viewer from './Viewer';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/host" element={<Host />} />
        <Route path="/viewer" element={<Viewer />} />
        <Route path="*" element={<Navigate to="/host" />} />
      </Routes>
    </Router>
  );
}

export default App;
