import { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { FiX } from 'react-icons/fi';

export default function ProjectFormModal({ onClose, fetchData }) {
  const [projectCode, setProjectCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddProject = async () => {
    if (!projectCode.trim()) {
      alert('Please enter a project code');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'projects'), {
        code: projectCode.trim(),
        createdAt: new Date()
      });
      await fetchData();
      onClose();
    } catch (err) {
      console.error('Error adding project:', err);
      alert('Failed to add project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 w-full max-w-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Add Project</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <FiX size={24} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project Code
          </label>
          <input
            type="text"
            value={projectCode}
            onChange={(e) => setProjectCode(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddProject()}
            placeholder="e.g., GD-2024"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAddProject}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg"
          >
            {loading ? 'Adding...' : 'Add Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
