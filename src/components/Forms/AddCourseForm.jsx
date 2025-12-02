import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { FiPlus, FiX } from 'react-icons/fi';

export default function AddCourseForm({ onClose, campusId, projectId, currentCourses, fetchData }) {
  const [categories, setCategories] = useState(
    Object.entries(currentCourses || {}).map(([category, courses]) => ({
      category,
      courses: [...courses],
    }))
  );
  const [newCategory, setNewCategory] = useState('');
  const [newCourse, setNewCourse] = useState('');
  const [selectingCategoryForCourse, setSelectingCategoryForCourse] = useState(null);

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      setCategories([...categories, { category: newCategory, courses: [] }]);
      setNewCategory('');
    }
  };

  const handleAddCourseToCategory = (categoryIndex) => {
    if (newCourse.trim()) {
      const updated = [...categories];
      updated[categoryIndex].courses.push(newCourse);
      setCategories(updated);
      setNewCourse('');
      setSelectingCategoryForCourse(null);
    }
  };

  const handleRemoveCourse = (categoryIndex, courseIndex) => {
    const updated = [...categories];
    updated[categoryIndex].courses.splice(courseIndex, 1);
    setCategories(updated);
  };

  const handleRemoveCategory = (categoryIndex) => {
    const updated = categories.filter((_, idx) => idx !== categoryIndex);
    setCategories(updated);
  };

  const handleSave = async () => {
    try {
      const coursesObject = {};
      categories.forEach(({ category, courses }) => {
        if (category.trim() && courses.length > 0) {
          coursesObject[category] = courses;
        }
      });

      const campusRef = doc(db, 'projects', projectId, 'campuses', campusId);
      await updateDoc(campusRef, { courses: coursesObject });

      await fetchData();
      onClose();
    } catch (err) {
      console.error('Error saving courses:', err);
      alert('Failed to save courses');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Add Courses</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <FiX size={24} />
        </button>
      </div>

      <div className="space-y-4 mb-4">
        {/* Add New Category */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Add New Category
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="e.g., Engineering, Business"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <button
              onClick={handleAddCategory}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-1 transition-colors"
            >
              <FiPlus /> Add
            </button>
          </div>
        </div>

        {/* Existing and New Categories */}
        <div className="space-y-3">
          {categories.map((item, categoryIndex) => (
            <div key={categoryIndex} className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-purple-700">{item.category}</h4>
                <button
                  onClick={() => handleRemoveCategory(categoryIndex)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FiX />
                </button>
              </div>

              {/* Display courses in category */}
              <div className="flex flex-wrap gap-2 mb-2">
                {item.courses.map((course, courseIndex) => (
                  <span
                    key={courseIndex}
                    className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm flex items-center gap-1"
                  >
                    {course}
                    <button
                      onClick={() => handleRemoveCourse(categoryIndex, courseIndex)}
                      className="hover:text-red-600"
                    >
                      <FiX size={14} />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add course to category */}
              {selectingCategoryForCourse === categoryIndex ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCourse}
                    onChange={(e) => setNewCourse(e.target.value)}
                    placeholder="e.g., Mechanical, Computer Science"
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    autoFocus
                    onKeyPress={(e) =>
                      e.key === 'Enter' && handleAddCourseToCategory(categoryIndex)
                    }
                  />
                  <button
                    onClick={() => handleAddCourseToCategory(categoryIndex)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-sm"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setSelectingCategoryForCourse(null);
                      setNewCourse('');
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <FiX />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSelectingCategoryForCourse(categoryIndex)}
                  className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1"
                >
                  <FiPlus size={16} /> Add Course
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          Save Courses
        </button>
      </div>
    </div>
  );
}
