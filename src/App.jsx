import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import NewGD from './components/NewGD';
import GDView from './components/GDView';
import Evaluations from './components/Evaluations';

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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Auth />} />
        <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/new-gd" element={user ? <NewGD /> : <Navigate to="/login" />} />
        <Route path="/gd/:gdId" element={user ? <GDView /> : <Navigate to="/login" />} />
        <Route path="/evaluations" element={user ? <Evaluations /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}