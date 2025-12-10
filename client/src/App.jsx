import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './layout/Layout';
import Dashboard from './pages/Dashboard';
import Database from './pages/Database';
import Analytics from './pages/Analytics';
import TopicPage from './pages/TopicPage';
import StudyPlanner from './pages/StudyPlanner';
import Login from './pages/Login';
import Signup from './pages/Signup';

const App = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="planner" element={<StudyPlanner />} />
          <Route path="database" element={<Database />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="topic/:id" element={<TopicPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
};

export default App;
