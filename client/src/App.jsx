import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layout/Layout';
import Dashboard from './pages/Dashboard';
import Database from './pages/Database';
import Revision from './pages/Revision';
import Analytics from './pages/Analytics';
import TopicPage from './pages/TopicPage';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="database" element={<Database />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="revision" element={<Revision />} />
        <Route path="topic/:id" element={<TopicPage />} />
      </Route>
    </Routes>
  );
};

export default App;
