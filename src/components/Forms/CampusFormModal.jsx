import { useState } from 'react';
import { addDoc, collection, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { FiX } from 'react-icons/fi';

const DEFAULT_COURSES = ['MBA', 'Engineering', 'Pharma', 'MCA', 'BCA'];

export default function CampusFormModal({ onClose, selectedProjectId, fetchData }) {
  const [campusName, setCampusName] = useState('');
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [customCourse, setCustomCourse] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleCourse = (course) => {
    setSelectedCourses(prev =>
      prev.includes(course)
        ? prev.filter(c => c !== course)
        : [...prev, course]
    );
  };

  const addCustomCourse = () => {
    if (customCourse.trim() && !selectedCourses.includes(customCourse)) {
      setSelectedCourses([...selectedCourses, customCourse]);
      setCustomCourse('');
    }
  };

  const handleSave = async () => {
    if (!campusName.trim()) {
      alert('Please enter campus name');
      return;
    }

    if (selectedCourses.length === 0) {
      alert('Please select at least one course');
      return;
    }

    setLoading(true);
    try {
      const campusesRef = collection(db, 'projects', selectedProjectId, 'campuses');
      const coursesMap = {};
      selectedCourses.forEach(course => {
        coursesMap[course] = [];
      });

      await addDoc(campusesRef, {
        name: campusName.trim(),
        courses: coursesMap,
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
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Add Campus</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <FiX size={24} />
        </button>
      </div>

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
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Courses
          </label>
          <div className="space-y-2">
            {DEFAULT_COURSES.map(course => (
              <label key={course} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCourses.includes(course)}
                  onChange={() => toggleCourse(course)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">{course}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Add Custom Course
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customCourse}
              onChange={(e) => setCustomCourse(e.target.value)}
              placeholder="Enter custom course"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              onKeyPress={(e) => e.key === 'Enter' && addCustomCourse()}
            />
            <button
              onClick={addCustomCourse}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm"
            >
              Add
            </button>
          </div>
        </div>

        {selectedCourses.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selected Courses ({selectedCourses.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedCourses.map(course => (
                <div
                  key={course}
                  className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                >
                  {course}
                  <button
                    onClick={() => setSelectedCourses(selectedCourses.filter(c => c !== course))}
                    className="hover:text-green-600"
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
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg"
          >
            {loading ? 'Adding...' : 'Add Campus'}
          </button>
        </div>
      </div>
    </div>
  );
}
