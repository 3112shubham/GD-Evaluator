import { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { FiTrash2, FiPlus, FiX } from 'react-icons/fi';
import ProjectFormModal from './Forms/ProjectFormModal';
import CampusFormModal from './Forms/CampusFormModal';
import AddSpecializationModal from './Forms/AddSpecializationModal';
import Modal from './Modal';

export default function HierarchyView() {
  const [projects, setProjects] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedCampus, setSelectedCampus] = useState(null);

  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showCampusForm, setShowCampusForm] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [selectedCourseCategory, setSelectedCourseCategory] = useState(null);
  const [newCourseName, setNewCourseName] = useState('');
  const [selectedCourses, setSelectedCourses] = useState({});
  const [customCourse, setCustomCourse] = useState('');
  const [existingCourses, setExistingCourses] = useState({});

  const DEFAULT_COURSES = ['BTech', 'MBA', 'Engineering', 'MCA', 'BCA'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const projectsSnapshot = await getDocs(collection(db, 'projects'));
      const projectsList = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(projectsList);

      let allCampuses = [];
      for (const project of projectsList) {
        const campusesRef = collection(db, 'projects', project.id, 'campuses');
        const campusesSnapshot = await getDocs(campusesRef);
        allCampuses = [...allCampuses, ...campusesSnapshot.docs.map(doc => ({
          id: doc.id,
          projectId: project.id,
          ...doc.data()
        }))];
      }
      setCampuses(allCampuses);
    } catch (err) {
      console.error('Error fetching data:', err);
      alert('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (collectionName, id, projectId = null) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      if (collectionName === 'projects') {
        // Delete all campuses (subcollection) under this project first
        const campusesRef = collection(db, 'projects', id, 'campuses');
        const campusesSnapshot = await getDocs(campusesRef);
        
        for (const campusDoc of campusesSnapshot.docs) {
          await deleteDoc(doc(db, 'projects', id, 'campuses', campusDoc.id));
        }
        
        // Then delete the project
        await deleteDoc(doc(db, 'projects', id));
      } else if (collectionName === 'campuses' && projectId) {
        await deleteDoc(doc(db, 'projects', projectId, 'campuses', id));
      } else {
        await deleteDoc(doc(db, collectionName, id));
      }
      fetchData();
      alert('Deleted successfully');
    } catch (err) {
      console.error('Error deleting:', err);
      alert('Failed to delete: ' + err.message);
    }
  };

  const handleDeleteSpecialization = async (campusId, category, specName) => {
    if (!window.confirm(`Are you sure you want to delete the specialization "${specName}"?`)) return;
    try {
      const campusRef = doc(db, 'projects', selectedProject, 'campuses', campusId);
      const campusSnap = await getDoc(campusRef);
      const campusData = campusSnap.data();

      const updatedSpecList = (campusData.courses[category] || []).filter(spec => spec !== specName);

      const updatedCourses = {
        ...campusData.courses,
        [category]: updatedSpecList
      };

      await updateDoc(campusRef, { courses: updatedCourses });
      await fetchData();
      alert('Specialization deleted successfully');
    } catch (err) {
      console.error('Error deleting specialization:', err);
      alert('Failed to delete specialization: ' + err.message);
    }
  };

  const handleAddCourse = async () => {
    const selectedList = Object.keys(selectedCourses).filter(course => selectedCourses[course]);

    if (selectedList.length === 0) {
      alert('Please select at least one course');
      return;
    }

    try {
      const campusRef = doc(db, 'projects', selectedProject, 'campuses', selectedCampus);
      const campusSnap = await getDoc(campusRef);
      const campusData = campusSnap.data();

      const updatedCourses = { ...campusData.courses };
      
      // Only add new courses (those not already existing)
      selectedList.forEach(course => {
        if (!updatedCourses.hasOwnProperty(course)) {
          updatedCourses[course] = [];
        }
        // If course already exists, keep its existing specializations
      });

      await updateDoc(campusRef, { courses: updatedCourses });
      await fetchData();
      setSelectedCourses({});
      setExistingCourses({});
      setCustomCourse('');
      setShowCourseForm(false);
      alert('Courses added successfully');
    } catch (err) {
      console.error('Error adding courses:', err);
      alert('Failed to add courses: ' + err.message);
    }
  };

  const toggleCourse = (course) => {
    setSelectedCourses(prev => ({
      ...prev,
      [course]: !prev[course]
    }));
  };

  const addCustomCourse = () => {
    if (customCourse.trim() && !selectedCourses.hasOwnProperty(customCourse)) {
      setSelectedCourses({
        ...selectedCourses,
        [customCourse]: true
      });
      setCustomCourse('');
    }
  };

  const handleDeleteCourse = async (category) => {
    if (!window.confirm(`Are you sure you want to delete the course "${category}" and all its specializations?`)) return;
    try {
      const campusRef = doc(db, 'projects', selectedProject, 'campuses', selectedCampus);
      const campusSnap = await getDoc(campusRef);
      const campusData = campusSnap.data();

      const updatedCourses = { ...campusData.courses };
      delete updatedCourses[category];

      await updateDoc(campusRef, { courses: updatedCourses });
      await fetchData();
      alert('Course deleted successfully');
    } catch (err) {
      console.error('Error deleting course:', err);
      alert('Failed to delete course: ' + err.message);
    }
  };

  const filteredCampuses = selectedProject
    ? campuses.filter(c => c.projectId === selectedProject)
    : [];

  const goBack = () => {
    if (selectedCampus) {
      setSelectedCampus(null);
    } else if (selectedProject) {
      setSelectedProject(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Hierarchy View</h2>
      </div>

      {/* Projects Section */}
      <div className="border rounded-lg p-4 bg-blue-50 mb-4">
        <div className="flex justify-between items-center mb-4">
          <div className="text-lg font-semibold">Projects</div>
          <button
            onClick={() => setShowProjectForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
          >
            <FiPlus /> Add Project
          </button>
        </div>

        <div className="space-y-2">
          {projects.length === 0 ? (
            <p className="text-gray-500">No projects added yet</p>
          ) : (
            projects.map(project => (
              <div
                key={project.id}
                className={`p-3 rounded border cursor-pointer transition-all ${
                  selectedProject === project.id
                    ? 'bg-blue-100 border-blue-400'
                    : 'bg-white border-blue-200 hover:bg-blue-50'
                } flex justify-between items-center group`}
                onClick={() => {
                  setSelectedProject(project.id);
                  setSelectedCampus(null);
                }}
              >
                <span className="font-mono font-semibold">{project.code}</span>
                <button
                  className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete('projects', project.id);
                  }}
                >
                  <FiTrash2 />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Campuses Section - Shows when project is selected */}
      {selectedProject && (
        <div className="border rounded-lg p-4 bg-green-50 mb-4">
          <div className="flex justify-between items-center mb-4">
            <div className="text-lg font-semibold">Campuses</div>
            <button
              onClick={() => setShowCampusForm(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
            >
              <FiPlus /> Add Campus
            </button>
          </div>

          <div className="space-y-2">
            {filteredCampuses.length === 0 ? (
              <p className="text-gray-500">No campuses for this project</p>
            ) : (
              filteredCampuses.map(campus => (
                <div
                  key={campus.id}
                  className={`p-3 rounded border cursor-pointer transition-all ${
                    selectedCampus === campus.id
                      ? 'bg-green-100 border-green-400'
                      : 'bg-white border-green-200 hover:bg-green-50'
                  } flex justify-between items-center group`}
                  onClick={() => setSelectedCampus(campus.id)}
                >
                  <span>{campus.name}</span>
                  <button
                    className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete('campuses', campus.id, selectedProject);
                    }}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Courses Section - Shows when campus is selected */}
      {selectedProject && selectedCampus && (
        <div className="border rounded-lg p-4 bg-purple-50">
          <div className="flex justify-between items-center mb-4">
            <div className="text-lg font-semibold">
              {campuses.find(c => c.id === selectedCampus)?.name} - Courses
            </div>
            <div className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer"
              onClick={() => {
                const campusData = campuses.find(c => c.id === selectedCampus);
                const existingCoursesData = campusData?.courses || {};
                const courseState = {};
                
                // Mark existing courses as checked
                Object.keys(existingCoursesData).forEach(course => {
                  courseState[course] = true;
                });
                
                setSelectedCourses(courseState);
                setExistingCourses(courseState);
                setShowCourseForm(true);
              }}
            >
              <FiPlus /> Add Course
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(campuses.find(c => c.id === selectedCampus)?.courses || {}).map(
              ([category, specList]) => (
                <div key={category} className="bg-white p-3 rounded border border-purple-200">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-semibold text-purple-700">{category}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedCourseCategory(category);
                          setShowSpecModal(true);
                        }}
                        className="text-purple-600 hover:text-purple-800 flex items-center justify-center w-6 h-6 rounded-full hover:bg-purple-100"
                        title="Add specialization"
                      >
                        <FiPlus size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(category)}
                        className="text-red-500 hover:text-red-700 flex items-center justify-center w-6 h-6 rounded-full hover:bg-red-50"
                        title="Delete course"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {specList && specList.length > 0 ? (
                      specList.map((spec, idx) => (
                        <div
                          key={idx}
                          className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center gap-2 group"
                        >
                          <span>{spec}</span>
                          <button
                            className="text-purple-600 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteSpecialization(selectedCampus, category, spec)}
                            title="Delete specialization"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm">No specializations added</span>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {showProjectForm && (
        <Modal onClose={() => setShowProjectForm(false)} val = "Project">
          <ProjectFormModal
            onClose={() => setShowProjectForm(false)}
            fetchData={fetchData}
          />
        </Modal>
      )}

      {showCampusForm && (
        <Modal onClose={() => setShowCampusForm(false)} val = "Campus">
          <CampusFormModal
            onClose={() => setShowCampusForm(false)}
            selectedProjectId={selectedProject}
            fetchData={fetchData}
          />
        </Modal>
      )}

      {showCourseForm && (
        <Modal onClose={() => {
          setShowCourseForm(false);
          setSelectedCourses({});
          setExistingCourses({});
          setCustomCourse('');
        }} val = "Courses">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Courses
                </label>
                <div className="space-y-2 bg-gray-50 p-3 rounded-lg max-h-48 overflow-y-auto">
                  {DEFAULT_COURSES.map(course => (
                    <label key={course} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCourses[course] || false}
                        onChange={() => {
                          // Only allow toggle if it's not an existing course
                          if (!existingCourses[course]) {
                            toggleCourse(course);
                          }
                        }}
                        disabled={existingCourses[course]}
                        className="w-4 h-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span className="text-sm">{course}</span>
                      {existingCourses[course] && (
                        <span className="text-xs text-gray-500">(existing)</span>
                      )}
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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

              {Object.keys(selectedCourses).filter(c => selectedCourses[c]).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Courses ({Object.keys(selectedCourses).filter(c => selectedCourses[c]).length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(selectedCourses).filter(c => selectedCourses[c]).map(course => (
                      <div
                        key={course}
                        className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                          existingCourses[course]
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {course}
                        {!existingCourses[course] && (
                          <button
                            onClick={() => toggleCourse(course)}
                            className={existingCourses[course] ? '' : 'hover:text-purple-600'}
                          >
                            ×
                          </button>
                        )}
                        {existingCourses[course] && (
                          <span className="text-xs opacity-75">(locked)</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => {
                    setShowCourseForm(false);
                    setSelectedCourses({});
                    setExistingCourses({});
                    setCustomCourse('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCourse}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Add Courses
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {showSpecModal && selectedCourseCategory && (
        <Modal onClose={() => setShowSpecModal(false)} val = "Specializations">
          <AddSpecializationModal
            onClose={() => setShowSpecModal(false)}
            campusId={selectedCampus}
            projectId={selectedProject}
            courseCategory={selectedCourseCategory}
            currentSpecializations={campuses.find(c => c.id === selectedCampus)?.courses[selectedCourseCategory] || []}
            fetchData={fetchData}
          />
        </Modal>
      )}
    </div>
  );
}
