import { useState, useEffect } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { FiPlus, FiSave, FiX } from 'react-icons/fi';

export default function CampusForm({ campuses, projects, fetchData, selectedProject, selectedCampus, setSelectedCampus }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newCampus, setNewCampus] = useState({
    name: '',
    location: '',
    projectId: selectedProject
  });

  // Automatically select campus if there's only one
  useEffect(() => {
    if (selectedProject && campuses.filter(c => c.projectId === selectedProject).length === 1) {
      const singleCampus = campuses.find(c => c.projectId === selectedProject);
      setSelectedCampus(singleCampus.id);
    }
  }, [selectedProject, campuses, setSelectedCampus]);

  const addCampus = async () => {
    if (!newCampus.name || !newCampus.projectId) {
      alert("Please enter campus name and select a project");
      return;
    }

    try {
      await addDoc(collection(db, 'campuses'), {
        ...newCampus,
        createdAt: new Date()
      });
      
      setNewCampus({ name: '', location: '', projectId: selectedProject });
      setIsAdding(false);
      fetchData();
      alert('Campus added successfully!');
    } catch (err) {
      console.error("Error adding campus: ", err);
      alert("Failed to add campus: " + err.message);
    }
  };

  if (!selectedProject) return null;

  const projectCampuses = campuses.filter(campus => campus.projectId === selectedProject);
  const hasSingleCampus = projectCampuses.length === 1;

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium">Campuses {hasSingleCampus && '(Auto-selected)'}</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
          disabled={!selectedProject}
        >
          {isAdding ? <FiX /> : <FiPlus />}
          {isAdding ? 'Cancel' : 'Add Campus'}
        </button>
      </div>

      {isAdding && (
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              value={newCampus.projectId}
              onChange={(e) => setNewCampus({...newCampus, projectId: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.code} - {project.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name*</label>
            <input
              type="text"
              value={newCampus.name}
              onChange={(e) => setNewCampus({...newCampus, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Campus Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={newCampus.location}
              onChange={(e) => setNewCampus({...newCampus, location: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="City, State"
            />
          </div>
          <button
            onClick={addCampus}
            disabled={!newCampus.name}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            <FiSave /> Save Campus
          </button>
        </div>
      )}

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {projectCampuses.map(campus => (
          <div 
            key={campus.id} 
            className={`p-2 rounded cursor-pointer ${selectedCampus === campus.id ? 'bg-blue-100' : 'bg-white hover:bg-gray-100'}`}
            onClick={() => setSelectedCampus(campus.id)}
          >
            <div className="font-medium">{campus.name}</div>
            {campus.location && (
              <div className="text-sm text-gray-600">{campus.location}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}