import { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { FiSearch, FiSave, FiRefreshCw } from 'react-icons/fi';

export default function RoleManagement() {
  const [trainers, setTrainers] = useState([]);
  const [filteredTrainers, setFilteredTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState({});
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    fetchTrainers();
  }, []);

  useEffect(() => {
    const filtered = trainers.filter(trainer =>
      trainer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trainer.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTrainers(filtered);
  }, [searchTerm, trainers]);

  const fetchTrainers = async () => {
    setLoading(true);
    try {
      const trainersSnapshot = await getDocs(collection(db, 'trainers'));
      const trainersList = trainersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTrainers(trainersList);
      setFilteredTrainers(trainersList);
      
      // Initialize selectedRole with current roles
      const rolesMap = {};
      trainersList.forEach(trainer => {
        rolesMap[trainer.id] = trainer.role || 'user';
      });
      setSelectedRole(rolesMap);
    } catch (err) {
      console.error('Error fetching trainers:', err);
      alert('Failed to fetch trainers');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (trainerId, newRole) => {
    setSelectedRole({
      ...selectedRole,
      [trainerId]: newRole
    });
  };

  const saveRole = async (trainerId) => {
    try {
      setSavingId(trainerId);
      const newRole = selectedRole[trainerId];
      await updateDoc(doc(db, 'trainers', trainerId), {
        role: newRole
      });
      
      // Update local state
      setTrainers(trainers.map(t => 
        t.id === trainerId ? { ...t, role: newRole } : t
      ));
      
      alert('Role updated successfully');
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Failed to update role: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500">Loading trainers...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Role Management</h1>
          <p className="text-blue-700">Add or change user roles for all trainers</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2">
            <FiSearch className="text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={fetchTrainers}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              title="Refresh trainers list"
            >
              <FiRefreshCw /> Refresh
            </button>
          </div>
        </div>

        {/* Trainers Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {filteredTrainers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No trainers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <tr>
                    <th className="px-6 py-3 text-left">Name</th>
                    <th className="px-6 py-3 text-left">Email</th>
                    <th className="px-6 py-3 text-left">Current Role</th>
                    <th className="px-6 py-3 text-left">New Role</th>
                    <th className="px-6 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrainers.map((trainer, index) => (
                    <tr
                      key={trainer.id}
                      className={`border-t ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } hover:bg-blue-50 transition-colors`}
                    >
                      <td className="px-6 py-4 font-medium text-gray-800">
                        {trainer.name}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {trainer.email}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            trainer.role === 'admin'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {trainer.role || 'user'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={selectedRole[trainer.id] || 'user'}
                          onChange={(e) =>
                            handleRoleChange(trainer.id, e.target.value)
                          }
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                          <option value="dead">Dead</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => saveRole(trainer.id)}
                          disabled={savingId === trainer.id}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                            savingId === trainer.id
                              ? 'bg-gray-400 cursor-not-allowed'
                              : selectedRole[trainer.id] !== trainer.role
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                          }`}
                        >
                          <FiSave size={16} />
                          {savingId === trainer.id ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Trainers with 'admin' role can access the admin dashboard and manage hierarchy. 
            Trainers with 'user' role can only manage their own evaluations. 'Dead' role deactivates the account.
          </p>
        </div>
      </div>
    </div>
  );
}
