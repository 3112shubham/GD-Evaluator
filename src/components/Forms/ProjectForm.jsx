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
        code: newProject.code,
        description: newProject.description,
        createdAt: new Date()
      });
      
      setNewProject({ code: '', description: '' });
      setIsAdding(false);
      fetchData();
      alert('Project added successfully!');
    } catch (err) {
      console.error("Error adding project: ", err);
      alert("Failed to add project: " + err.message);
    }
  };

  const handleClose = () => {
    setNewProject({ code: '', description: '' });
    setIsAdding(false);
  };

  return (
    <>
      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium">Projects</h3>
          <button
            onClick={() => setIsAdding(true)}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <FiPlus />
            Add Project
          </button>
        </div>

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

      {/* Modal with Backdrop Blur */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full relative">
            {/* Close button (X) - Top Right */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"
            >
              <FiX size={20} />
            </button>

            {/* Header */}
            <div className="mb-4 pr-8">
              <h2 className="text-xl font-semibold text-gray-900">Add Project Code</h2>
            </div>

            {/* Input field */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Project Code *</label>
              <input
                type="text"
                value={newProject.code}
                onChange={(e) => setNewProject({...newProject, code: e.target.value})}
                placeholder="Enter project code"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium flex items-center justify-center gap-2"
              >
                <FiX size={18} /> Cancel
              </button>
              <button
                onClick={addProject}
                disabled={!newProject.code}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition font-medium flex items-center justify-center gap-2"
              >
                <FiSave size={18} /> Add
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}