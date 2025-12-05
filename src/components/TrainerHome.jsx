import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { FiLogOut, FiHome, FiAward } from 'react-icons/fi';
import Dashboard from './Dashboard';
import Evaluations from './Evaluations';

export default function TrainerHome() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();

  // Logo URL
  const companyLogoUrl = "https://res.cloudinary.com/dcjmaapvi/image/upload/v1730120218/Gryphon_Academy_Bird_Logo_yzzl3q.png";

  const handleLogout = async () => {
    const confirmed = window.confirm('Are you sure you want to logout?');
    if (!confirmed) return;

    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Blue Theme Navbar */}
      <nav className="bg-gradient-to-r from-blue-800 to-blue-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <img 
                  className="h-10 w-10 mr-3" 
                  src={companyLogoUrl} 
                  alt="Gryphon Academy Logo" 
                />
                <span className="text-xl font-bold">ASSESS HUB</span>
              </div>
              <div className="hidden md:ml-10 md:flex md:space-x-2">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
                    activeTab === 'dashboard'
                      ? 'bg-blue-700 border-b-2 border-white'
                      : 'hover:bg-blue-700'
                  }`}
                >
                  <FiHome className="mr-1" size={18} /> Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('evaluations')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
                    activeTab === 'evaluations'
                      ? 'bg-blue-700 border-b-2 border-white'
                      : 'hover:bg-blue-700'
                  }`}
                >
                  <FiAward className="mr-1" size={18} /> Evaluations
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="md:hidden flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all duration-200 text-xs ${
                    activeTab === 'dashboard'
                      ? 'bg-blue-700'
                      : 'hover:bg-blue-700'
                  }`}
                >
                  <FiHome size={16} />
                </button>
                <button
                  onClick={() => setActiveTab('evaluations')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all duration-200 text-xs ${
                    activeTab === 'evaluations'
                      ? 'bg-blue-700'
                      : 'hover:bg-blue-700'
                  }`}
                >
                  <FiAward size={16} />
                </button>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-md transition-colors"
              >
                <FiLogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content Area */}
      <div className="pt-0">
        {activeTab === 'dashboard' && <Dashboard hideNavbar={true} onViewEvaluations={() => setActiveTab('evaluations')} />}
        {activeTab === 'evaluations' && <Evaluations hideNavbar={true} />}
      </div>
    </div>
  );
}
