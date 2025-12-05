import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { FiX } from 'react-icons/fi';

const DEFAULT_SPECIALIZATIONS = [
  'CS',
  'IT',
  'HR',
  'Marketing',
  'Finance',
  'Operations',
  'Mechanical',
  'Electronics',
];

export default function AddSpecializationModal({
  onClose,
  campusId,
  projectId,
  courseCategory,
  currentSpecializations = [],
  fetchData,
}) {
  const [selectedSpecs, setSelectedSpecs] = useState(
    currentSpecializations.reduce((acc, spec) => ({ ...acc, [spec]: true }), {})
  );
  const [customSpec, setCustomSpec] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleSpec = (spec) => {
    setSelectedSpecs(prev => ({
      ...prev,
      [spec]: !prev[spec]
    }));
  };

  const addCustomSpec = () => {
    if (customSpec.trim() && !selectedSpecs.hasOwnProperty(customSpec)) {
      setSelectedSpecs({
        ...selectedSpecs,
        [customSpec]: true
      });
      setCustomSpec('');
    }
  };

  const handleSave = async () => {
    const selectedList = Object.keys(selectedSpecs).filter(spec => selectedSpecs[spec]);

    if (selectedList.length === 0) {
      alert('Please select at least one specialization');
      return;
    }

    setLoading(true);
    try {
      const campusRef = doc(db, 'projects', projectId, 'campuses', campusId);
      const campusSnap = await (await import('firebase/firestore')).getDoc(campusRef);
      const campusData = campusSnap.data();

      const updatedCourses = {
        ...campusData.courses,
        [courseCategory]: selectedList
      };

      await updateDoc(campusRef, { courses: updatedCourses });
      await fetchData();
      onClose();
    } catch (err) {
      console.error('Error updating specializations:', err);
      alert('Failed to update specializations');
    } finally {
      setLoading(false);
    }
  };

  const selectedList = Object.keys(selectedSpecs).filter(spec => selectedSpecs[spec]);

  return (
    <div className="bg-white rounded-lg p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {courseCategory} - Specializations
          </label>
          <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg max-h-48 overflow-y-auto">
            {DEFAULT_SPECIALIZATIONS.map(spec => (
              <label key={spec} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSpecs[spec] || false}
                  onChange={() => toggleSpec(spec)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">{spec}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Add Custom Specialization
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customSpec}
              onChange={(e) => setCustomSpec(e.target.value)}
              placeholder="e.g., Data Science"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              onKeyPress={(e) => e.key === 'Enter' && addCustomSpec()}
              autoFocus
            />
            <button
              onClick={addCustomSpec}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm"
            >
              Add
            </button>
          </div>
        </div>

        {selectedList.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selected ({selectedList.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedList.map(spec => (
                <div
                  key={spec}
                  className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                >
                  {spec}
                  <button
                    onClick={() => setSelectedSpecs({ ...selectedSpecs, [spec]: false })}
                    className="hover:text-purple-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
