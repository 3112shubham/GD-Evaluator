import { useState } from 'react';
import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { FiPlus, FiSave, FiX, FiTrash2 } from 'react-icons/fi';

const predefinedCourses = [
  { name: 'MBA', duration: 2 },
  { name: 'Engineering', duration: 4 },
  { name: 'MCA', duration: 3 },
  { name: 'MSCIT', duration: 2 },
  { name: 'BCA', duration: 3 },
  { name: 'Pharma', duration: 4 }
];

export default function CourseForm({ 
  courses, 
  fetchData, 
  selectedProject, 
  selectedCampus,
  selectedCourse, 
  setSelectedCourse 
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [isCustomCourse, setIsCustomCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: '',
    duration: '',
    isCustom: false,
    projectId: selectedProject,
    campusId: selectedCampus || null
  });

  const addCourse = async () => {
    if (!newCourse.name) {
      alert("Please enter course name");
      return;
    }

    try {
      await addDoc(collection(db, 'courses'), {
        ...newCourse,
        createdAt: new Date()
      });
      
      setNewCourse({ 
        name: '', 
        duration: '', 
        isCustom: isCustomCourse,
        projectId: selectedProject,
        campusId: selectedCampus || null
      });
      setIsAdding(false);
      setIsCustomCourse(false);
      fetchData();
      alert('Course added successfully!');
    } catch (err) {
      console.error("Error adding course: ", err);
      alert("Failed to add course: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    
    try {
      await deleteDoc(doc(db, 'courses', id));
      fetchData();
      // Reset selection if the deleted course was selected
      if (selectedCourse === id) {
        setSelectedCourse(null);
      }
      alert('Course deleted successfully');
    } catch (err) {
      console.error("Error deleting course: ", err);
      alert("Failed to delete course: " + err.message);
    }
  };

  const selectPredefinedCourse = (course) => {
    setNewCourse({
      ...newCourse,
      name: course.name,
      duration: course.duration,
      isCustom: false
    });
  };

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium">Courses</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          {isAdding ? <FiX /> : <FiPlus />}
          {isAdding ? 'Cancel' : 'Add Course'}
        </button>
      </div>

      {isAdding && (
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Course Type</label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setIsCustomCourse(false)}
                className={`px-3 py-1 rounded ${!isCustomCourse ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Predefined
              </button>
              <button
                onClick={() => setIsCustomCourse(true)}
                className={`px-3 py-1 rounded ${isCustomCourse ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Custom
              </button>
            </div>

            {!isCustomCourse ? (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {predefinedCourses.map((course, index) => (
                  <button
                    key={index}
                    onClick={() => selectPredefinedCourse(course)}
                    className={`p-2 border rounded ${newCourse.name === course.name ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-50'}`}
                  >
                    <div className="font-medium">{course.name}</div>
                    <div className="text-sm text-gray-600">{course.duration} years</div>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name*</label>
                  <input
                    type="text"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Course Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (years)</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={newCourse.duration}
                    onChange={(e) => setNewCourse({...newCourse, duration: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g. 4"
                  />
                </div>
              </>
            )}
          </div>
          <button
            onClick={addCourse}
            disabled={!newCourse.name}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            <FiSave /> Save Course
          </button>
        </div>
      )}

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {courses.map(course => (
          <div 
            key={course.id} 
            className={`p-2 rounded cursor-pointer flex justify-between items-center ${selectedCourse === course.id ? 'bg-blue-100' : 'bg-white hover:bg-gray-100'}`}
            onClick={() => setSelectedCourse(course.id)}
          >
            <div>
              <div className="font-medium">{course.name}</div>
              {course.duration && (
                <div className="text-sm text-gray-600">{course.duration} years</div>
              )}
            </div>
            <button 
              className="text-red-500 hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(course.id);
              }}
            >
              <FiTrash2 />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}