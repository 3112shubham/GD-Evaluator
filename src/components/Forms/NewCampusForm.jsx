import { useState } from 'react';
import { addDoc, collection, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { FiPlus, FiSave, FiX, FiTrash2 } from 'react-icons/fi';

export default function CampusForm({ onClose, selectedProjectId, fetchData }) {
  const [campusName, setCampusName] = useState('');
  const [courses, setCourses] = useState({});
  const [currentCategory, setCurrentCategory] = useState('');
  const [currentCourse, setCurrentCourse] = useState('');

  const addCourseCategory = () => {
    if (!currentCategory.trim()) {
      alert('Please enter a category name');
      return;
    }
    setCourses({
      ...courses,
      [currentCategory]: []
    });
    setCurrentCategory('');
  };

  const addCourseToCategory = (category) => {
    if (!currentCourse.trim()) {
      alert('Please enter a course name');
      return;
    }
    setCourses({
      ...courses,
      [category]: [...(courses[category] || []), currentCourse]
    });
    setCurrentCourse('');
  };

  const removeCourseFromCategory = (category, index) => {
    const updatedCourses = courses[category].filter((_, i) => i !== index);
    if (updatedCourses.length === 0) {
      const { [category]: _, ...rest } = courses;
      setCourses(rest);
    } else {
      setCourses({
        ...courses,
        [category]: updatedCourses
      });
    }
  };

  const saveCampus = async () => {
    if (!campusName.trim()) {
      alert('Please enter campus name');
      return;
    }
    if (Object.keys(courses).length === 0) {
      alert('Please add at least one course category');
      return;
    }

    try {
      const projectRef = doc(db, 'projects', selectedProjectId);
      const campusesCollection = collection(projectRef, 'campuses');
      
      await addDoc(campusesCollection, {
        name: campusName,
        courses: courses,
        createdAt: new Date()
      });

      alert('Campus added successfully!');
      fetchData();
      onClose();
    } catch (err) {
      console.error('Error adding campus:', err);
      alert('Failed to add campus: ' + err.message);
    }
  };

  return (
    <div className="p-6 max-h-[90vh] overflow-y-auto">
      <h3 className="text-lg font-semibold mb-4">Add Campus</h3>

      {/* Campus Name */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Campus Name*</label>
        <input
          type="text"
          value={campusName}
          onChange={(e) => setCampusName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Main Campus"
        />
      </div>

      {/* Courses Section */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-700 mb-3">Courses by Category</h4>

        {/* Add New Category */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">Add Course Category</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={currentCategory}
              onChange={(e) => setCurrentCategory(e.target.value)}
              placeholder="e.g., Engineering"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              onKeyDown={(e) => e.key === 'Enter' && addCourseCategory()}
            />
            <button
              onClick={addCourseCategory}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex items-center gap-1"
            >
              <FiPlus size={16} /> Add
            </button>
          </div>
        </div>

        {/* Display Categories and Courses */}
        <div className="space-y-3">
          {Object.entries(courses).map(([category, courseList]) => (
            <div key={category} className="border rounded-lg p-3 bg-white">
              <div className="font-medium text-gray-700 mb-2">{category}</div>

              {/* List of Courses in Category */}
              <div className="mb-2 space-y-1">
                {courseList.map((course, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-gray-100 px-2 py-1 rounded text-sm"
                  >
                    <span>{course}</span>
                    <button
                      onClick={() => removeCourseFromCategory(category, idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Course to Category */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentCourse}
                  onChange={(e) => setCurrentCourse(e.target.value)}
                  placeholder="Course name"
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && addCourseToCategory(category)}
                />
                <button
                  onClick={() => addCourseToCategory(category)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm"
                >
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-6">
        <button
          onClick={saveCampus}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
        >
          <FiSave /> Save Campus
        </button>
        <button
          onClick={onClose}
          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded-lg flex items-center justify-center gap-2"
        >
          <FiX /> Cancel
        </button>
      </div>
    </div>
  );
}
