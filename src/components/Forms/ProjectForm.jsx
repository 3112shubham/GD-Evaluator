import { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { FiPlus, FiSave, FiX } from 'react-icons/fi';

export default function ProjectForm({ projects, fetchData, selectedProject, setSelectedProject }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newProject, setNewProject] = useState({
    code: '',
    description: ''
  });

  const addProject = async () => {
    if (!newProject.code) {
      alert("Please enter project code");
      return;
    }

    try {
      await addDoc(collection(db, 'projects'), {
        ...newProject,
        createdAt: new Date()
      });
      
      setNewProject({ code: '', name: '', description: '' });
      setIsAdding(false);
      fetchData();
      alert('Project added successfully!');
    } catch (err) {
      console.error("Error adding project: ", err);
      alert("Failed to add project: " + err.message);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium">Projects</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          {isAdding ? <FiX /> : <FiPlus />}
          {isAdding ? 'Cancel' : 'Add Project'}
        </button>
      </div>

      {isAdding && (
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code*</label>
            <input
              type="text"
              value={newProject.code}
              onChange={(e) => setNewProject({...newProject, code: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="PROJ001"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={newProject.description}
              onChange={(e) => setNewProject({...newProject, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Optional description"
              rows="2"
            />
          </div>
          <button
            onClick={addProject}
            disabled={!newProject.code}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            <FiSave /> Save Project
          </button>
        </div>
      )}

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {projects.map(project => (
          <div 
            key={project.id} 
            className={`p-2 rounded cursor-pointer ${selectedProject === project.id ? 'bg-blue-100' : 'bg-white hover:bg-gray-100'}`}
            onClick={() => setSelectedProject(project.id)}
          >
            <div className="font-medium">{project.code}</div>
          </div>
        ))}
      </div>
    </div>
  );
}