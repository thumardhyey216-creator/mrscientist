import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DatabaseProvider } from './context/DatabaseContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './layout/Layout';

// Lazy Load Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Database = lazy(() => import('./pages/Database'));
const Analytics = lazy(() => import('./pages/Analytics'));
const TopicPage = lazy(() => import('./pages/TopicPage'));
const StudyPlanner = lazy(() => import('./pages/StudyPlanner'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Subscription = lazy(() => import('./pages/Subscription'));

// Loading Component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]">
      <div className="spinner"></div>
  </div>
);

const App = () => {
  return (
    <AuthProvider>
      <DatabaseProvider>
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
      </DatabaseProvider>
    </AuthProvider>
  );
};

export default App;
