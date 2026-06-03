import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { Layout } from './components/layout/Layout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateApi from './pages/CreateApi';
import Workspace from './pages/Workspace';
import WorkspaceNext from './pages/WorkspaceNext';
import ApiDetails from './pages/ApiDetails';
import Settings from './pages/Settings';

function App() {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  return (
    <>
      <Toaster position="top-right" toastOptions={{ className: 'dark-toast' }} />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create" element={<CreateApi />} />
            <Route path="/workspace/:id" element={<Workspace />} />
            <Route path="/workspace/:id/next" element={<WorkspaceNext />} />
            <Route path="/api/:id" element={<ApiDetails />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;
