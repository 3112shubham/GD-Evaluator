import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { FiPlus, FiUsers, FiLayers, FiUser, FiFileText, FiLogOut } from 'react-icons/fi';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import HierarchyView from './HierarchyView';
import AddTrainer from './AddTrainer';
import AdminEvaluations from './AdminEvaluations';

const logoUrl = "https://res.cloudinary.com/dcjmaapvi/image/upload/v1730120218/Gryphon_Academy_Bird_Logo_yzzl3q.png";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('hierarchy');
  const navigate = useNavigate();

  const handleLogout = async () => {
    const confirmed = window.confirm('Are you sure you want to logout?');
    if (!confirmed) return;

    try {
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error("Logout error: ", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header with Logo and Title */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-800 rounded-full flex items-center justify-center shadow-lg p-3">
              <img 
                src={logoUrl} 
                alt="Gryphon Academy Logo" 
                className="h-12 w-12 object-contain" 
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
              <p className="text-gray-600">ASSESS HUB</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            title="Logout"
          >
            <FiLogOut /> Logout
          </button>
        </div>
        
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('hierarchy')}
              className={`flex items-center gap-2 px-4 py-2 font-medium ${activeTab === 'hierarchy' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
            >
              <FiLayers /> Hierarchy
            </button>
            <button
              onClick={() => setActiveTab('trainers')}
              className={`flex items-center gap-2 px-4 py-2 font-medium ${activeTab === 'trainers' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
            >
              <FiUser /> Trainers
            </button>
            <button
              onClick={() => setActiveTab('evaluations')}
              className={`flex items-center gap-2 px-4 py-2 font-medium ${activeTab === 'evaluations' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
            >
              <FiFileText /> Evaluations
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'hierarchy' && <HierarchyView />}
        {activeTab === 'trainers' && <AddTrainer />}
        {activeTab === 'evaluations' && <AdminEvaluations />}
      </div>
    </div>
  );
}