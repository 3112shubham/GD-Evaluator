// src/App.jsx
import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import NewGD from './components/NewGD';
import NewPI from './components/NewPI';
import GDView from './components/GDView';
import PIView from './components/PIView';
import Evaluations from './components/Evaluations';
import GDVolunteer from './components/GDVolunteer';
import GDVolunteerSuccess from './components/GDVolunteerSuccess';
import { FiLogOut } from 'react-icons/fi';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout error: ", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <Router basename='/'>
      
      <main className="min-h-[calc(100vh-64px)] bg-gray-50">
        <Routes>
          <Route path="/gd/login" element={user ? <Navigate to="/gd" /> : <Auth />} />
          <Route path="/gd" element={user ? <Dashboard /> : <Navigate to="/gd/login" />} />
          <Route path="/gd/new-gd" element={user ? <NewGD /> : <Navigate to="/gd/login" />} />
          <Route path="/gd/new-pi" element={user ? <NewPI /> : <Navigate to="/gd/login" />} />
          <Route path="/gd/:gdId" element={user ? <GDView /> : <Navigate to="/gd/login" />} />
          <Route path="/gd/pi/:piId" element={user ? <PIView /> : <Navigate to="/gd/login" />} />
          <Route path="/gd/evaluations" element={user ? <Evaluations /> : <Navigate to="/gdlogin" />} />
          <Route path="/gd/gd-volunteer/:linkId" element={<GDVolunteer />} />
          <Route path="/gd/gd-volunteer-success" element={<GDVolunteerSuccess />} />
          <Route path="*" element={<Navigate to={user ? "/" : "/gd/login"} />} />
          <Route path="/gd/admin" element={user?.email === 'training@gmail.com' ? <AdminDashboard /> : <Navigate to="/gd" />} />
        </Routes>
      </main>
    </Router>
  );
}