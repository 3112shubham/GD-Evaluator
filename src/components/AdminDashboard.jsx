import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { FiPlus, FiUsers, FiLayers, FiUser } from 'react-icons/fi';
import HierarchyView from './HierarchyView';
import AddTrainer from './AddTrainer';
import BatchManagement from './BatchManagement';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('hierarchy');

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
        
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
              onClick={() => setActiveTab('batches')}
              className={`flex items-center gap-2 px-4 py-2 font-medium ${activeTab === 'batches' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
            >
              <FiUsers /> Batches
            </button>
            <button
              onClick={() => setActiveTab('trainers')}
              className={`flex items-center gap-2 px-4 py-2 font-medium ${activeTab === 'trainers' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
            >
              <FiUser /> Trainers
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'hierarchy' && <HierarchyView />}
        {activeTab === 'batches' && <BatchManagement />}
        {activeTab === 'trainers' && <AddTrainer />}
      </div>
    </div>
  );
}