import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import NewGD from './components/NewGD';
import GDView from './components/GDView';
import Evaluations from './components/Evaluations';
import { FiLogOut } from 'react-icons/fi';

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
    <Router>
      {user && (
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
            <h1 className="text-xl font-bold text-blue-600">GD Evaluator</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-500 transition flex items-center gap-1 text-sm"
              >
                <FiLogOut /> Logout
              </button>
            </div>
          </div>
        </header>
      )}
      
      <main className="min-h-[calc(100vh-64px)] bg-gray-50">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Auth />} />
          <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/new-gd" element={user ? <NewGD /> : <Navigate to="/login" />} />
          <Route path="/gd/:gdId" element={user ? <GDView /> : <Navigate to="/login" />} />
          <Route path="/evaluations" element={user ? <Evaluations /> : <Navigate to="/login" />} />
        </Routes>
      </main>
    </Router>
  );
}