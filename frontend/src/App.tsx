import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssVarsProvider } from '@mui/joy/styles';
import JoyCssBaseline from '@mui/joy/CssBaseline';
import Dashboard from './components/Dashboard';
import CallManagement from './components/CallManagement';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import './App.css';

function App() {
  return (
    <CssVarsProvider defaultMode="system">
      <JoyCssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calls" element={<CallManagement />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Router>
    </CssVarsProvider>
  );
}

export default App;
