import { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
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
  const [showAddCourseForm, setShowAddCourseForm] = useState(false);
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [selectedCourseCategory, setSelectedCourseCategory] = useState(null);

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
          <div className="text-lg font-semibold mb-4">
            {campuses.find(c => c.id === selectedCampus)?.name} - Specializations
          </div>

          <div className="space-y-3">
            {Object.entries(campuses.find(c => c.id === selectedCampus)?.courses || {}).map(
              ([category, specList]) => (
                <div key={category} className="bg-white p-3 rounded border border-purple-200">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-semibold text-purple-700">{category}</div>
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
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {specList && specList.length > 0 ? (
                      specList.map((spec, idx) => (
                        <span
                          key={idx}
                          className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm"
                        >
                          {spec}
                        </span>
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
        <Modal onClose={() => setShowProjectForm(false)}>
          <ProjectFormModal
            onClose={() => setShowProjectForm(false)}
            fetchData={fetchData}
          />
        </Modal>
      )}

      {showCampusForm && (
        <Modal onClose={() => setShowCampusForm(false)}>
          <CampusFormModal
            onClose={() => setShowCampusForm(false)}
            selectedProjectId={selectedProject}
            fetchData={fetchData}
          />
        </Modal>
      )}

      {showSpecModal && selectedCourseCategory && (
        <Modal onClose={() => setShowSpecModal(false)}>
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
