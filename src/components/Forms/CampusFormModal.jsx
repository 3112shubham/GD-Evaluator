import { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { FiX } from 'react-icons/fi';

export default function CampusFormModal({ onClose, selectedProjectId, fetchData }) {
  const [campusName, setCampusName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!campusName.trim()) {
      alert('Please enter campus name');
      return;
    }

    setLoading(true);
    try {
      const campusesRef = collection(db, 'projects', selectedProjectId, 'campuses');

      await addDoc(campusesRef, {
        name: campusName.trim(),
        courses: {},
        createdAt: new Date()
      });

      await fetchData();
      onClose();
    } catch (err) {
      console.error('Error adding campus:', err);
      alert('Failed to add campus');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Campus Name
          </label>
          <input
            type="text"
            value={campusName}
            onChange={(e) => setCampusName(e.target.value)}
            placeholder="e.g., Mumbai Campus"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            autoFocus
            onKeyPress={(e) => e.key === 'Enter' && handleSave()}
          />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg"
          >
            {loading ? 'Adding...' : 'Add Campus'}
          </button>
        </div>
      </div>
    </div>
  );
}
