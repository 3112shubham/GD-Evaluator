// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './context/UserContext';
import Auth from './components/Auth';
import TrainerHome from './components/TrainerHome';
import NewGD from './components/NewGD';
import GDView from './components/GDView';
import GDVolunteer from './components/GDVolunteer';
import GDVolunteerSuccess from './components/GDVolunteerSuccess';
import AdminDashboard from './components/AdminDashboard';
import RoleManagement from './components/RoleManagement';

function AppContent() {
  const { user, userRole, loading } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  // If user exists but role is 'dead', prevent access to any protected route
  const isDead = user && userRole === 'dead';
  
  // Route based on user role - admin goes to admin dashboard, others go to normal dashboard
  const homeRoute = user && userRole === 'admin' ? '/admin' : '/';

  return (
    <main className="min-h-[calc(100vh-64px)] bg-gray-50">
      <Routes>
        <Route path="/login" element={user && !isDead ? <Navigate to={homeRoute} /> : <Auth />} />
        <Route path="/" element={isDead ? <Navigate to="/login" /> : user && userRole !== 'admin' ? <TrainerHome /> : user && userRole === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/login" />} />
        <Route path="/admin" element={isDead ? <Navigate to="/login" /> : user && userRole === 'admin' ? <AdminDashboard /> : user ? <Navigate to="/" /> : <Navigate to="/login" />} />
        <Route path="/role" element={isDead ? <Navigate to="/login" /> : user && userRole === 'admin' ? <RoleManagement /> : user ? <Navigate to="/" /> : <Navigate to="/login" />} />
        <Route path="/new-gd" element={isDead ? <Navigate to="/login" /> : user && userRole !== 'admin' ? <NewGD /> : <Navigate to={homeRoute} />} />
        <Route path="/gd/:gdId" element={isDead ? <Navigate to="/login" /> : user ? <GDView /> : <Navigate to="/login" />} />
        <Route path="/gd-volunteer/:linkId" element={<GDVolunteer />} />
        <Route path="/gd-volunteer-success" element={<GDVolunteerSuccess />} />
        <Route path="*" element={<Navigate to={isDead ? "/login" : user ? homeRoute : "/login"} />} />
      </Routes>
    </main>
  );
}

export default function App() {
  return (
    <Router>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </Router>
  );
}