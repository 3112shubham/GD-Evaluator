import { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { FiPlus, FiSave, FiX } from 'react-icons/fi';

export default function SpecializationForm({ 
  specializations, 
  years, 
  fetchData, 
  selectedCourse, 
  selectedYear, 
  setSelectedYear,
  selectedSpecialization,
  setSelectedSpecialization
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newSpecialization, setNewSpecialization] = useState({
    name: '',
    year: '',
    courseId: selectedCourse
  });

  const addSpecialization = async () => {
    if (!newSpecialization.name || !newSpecialization.year) {
      alert("Please fill all required fields");
      return;
    }

    try {
      await addDoc(collection(db, 'specializations'), {
        ...newSpecialization,
        createdAt: new Date()
      });
      
      setNewSpecialization({ 
        name: '', 
        year: '', 
        courseId: selectedCourse
      });
      setIsAdding(false);
      fetchData();
      alert('Specialization added successfully!');
    } catch (err) {
      console.error("Error adding specialization: ", err);
      alert("Failed to add specialization: " + err.message);
    }
  };

  // Get available years from props or generate default years if not provided
  const availableYears = years && years.length > 0 
    ? years 
    : [1, 2, 3, 4]; // Default years if none provided

  if (!selectedCourse) return null;

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium">Specializations</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          {isAdding ? <FiX /> : <FiPlus />}
          {isAdding ? 'Cancel' : 'Add Specialization'}
        </button>
      </div>

      {isAdding && (
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year*</label>
            <select
              value={newSpecialization.year}
              onChange={(e) => setNewSpecialization({...newSpecialization, year: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">Select Year</option>
              {availableYears.map(year => (
                <option key={year} value={year}>Year {year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name*</label>
            <input
              type="text"
              value={newSpecialization.name}
              onChange={(e) => setNewSpecialization({...newSpecialization, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Specialization Name"
              required
            />
          </div>
          <button
            onClick={addSpecialization}
            disabled={!newSpecialization.name || !newSpecialization.year}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            <FiSave /> Save Specialization
          </button>
        </div>
      )}

      {/* Display existing specializations grouped by year */}
      <div className="space-y-3">
        {availableYears.map(year => {
          const yearSpecializations = specializations.filter(s => s.year === year);
          
          return yearSpecializations.length > 0 ? (
            <div key={year} className="space-y-1">
              <div 
                className={`p-2 rounded cursor-pointer ${selectedYear === year ? 'bg-blue-100' : 'bg-white hover:bg-gray-100'}`}
                onClick={() => {
                  setSelectedYear(year);
                  setSelectedSpecialization(null);
                }}
              >
                Year {year}
              </div>
              
              {selectedYear === year && (
                <div className="ml-4 space-y-1">
                  {yearSpecializations.map(specialization => (
                    <div 
                      key={specialization.id} 
                      className={`p-2 rounded cursor-pointer ${selectedSpecialization === specialization.id ? 'bg-blue-100' : 'bg-white hover:bg-gray-100'}`}
                      onClick={() => setSelectedSpecialization(specialization.id)}
                    >
                      {specialization.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null;
        })}
      </div>
    </div>
  );
}