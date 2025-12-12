import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DatabaseProvider } from './context/DatabaseContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './layout/Layout';
import Dashboard from './pages/Dashboard';
import Database from './pages/Database';
import Analytics from './pages/Analytics';
import TopicPage from './pages/TopicPage';
import StudyPlanner from './pages/StudyPlanner';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Subscription from './pages/Subscription';

const App = () => {
  return (
    <AuthProvider>
      <DatabaseProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          <Route path="/subscription" element={
            <ProtectedRoute requireSubscription={false}>
              <Subscription />
            </ProtectedRoute>
          } />

          <Route path="/" element={
            <ProtectedRoute requireSubscription={false}>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="planner" element={
              <ProtectedRoute requireSubscription={true}>
                <StudyPlanner />
              </ProtectedRoute>
            } />
            <Route path="database" element={
              <ProtectedRoute requireSubscription={true}>
                <Database />
              </ProtectedRoute>
            } />
            <Route path="analytics" element={
              <ProtectedRoute requireSubscription={true}>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="topic/:id" element={
              <ProtectedRoute requireSubscription={true}>
                <TopicPage />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </DatabaseProvider>
    </AuthProvider>
  );
};

export default App;
