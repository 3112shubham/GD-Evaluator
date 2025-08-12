// src/components/NewGD.jsx
import { useState, useEffect } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiX } from 'react-icons/fi';

export default function NewGD() {
  const [topic, setTopic] = useState('');
  const [batch, setBatch] = useState('');
  const [students, setStudents] = useState([]);
  const [newStudent, setNewStudent] = useState({ name: '', batch: '' });
  const navigate = useNavigate();

  useEffect(() => {
    if (batch) {
      setNewStudent(prev => ({ ...prev, batch }));
    }
  }, [batch]);

  const addStudent = () => {
    if (newStudent.name.trim() && newStudent.batch) {
      setStudents([...students, newStudent]);
      setNewStudent({ name: '', batch });
    }
  };

  const removeStudent = (index) => {
    const updatedStudents = [...students];
    updatedStudents.splice(index, 1);
    setStudents(updatedStudents);
  };

  const startGD = async () => {
    if (!topic || students.length === 0) return;
    
    const gdData = {
      topic,
      batch,
      students,
      trainerId: auth.currentUser.uid,
      trainerEmail: auth.currentUser.email,
      evaluations: students.map(student => ({
        studentId: `${student.name}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        studentName: student.name,
        studentBatch: student.batch,
        scores: {
          opening: { initiation: 0, clarity: 0, relevance: 0, knowledge: 0 },
          speaking: { vocabulary: 0, flow: 0, confidence: 0, acknowledgment: 0, questioning: 0 },
          teamwork: { participation: 0, behavior: 0, perspectives: 0, awareness: 0 },
          engagement: { bodyLanguage: 0, pressureHandling: 0 },
          closing: { conclusion: 0, summary: 0, finalConfidence: 0 }
        },
        remarks: ''
      })),
      createdAt: new Date(),
      completed: false
    };

    try {
      const docRef = await addDoc(collection(db, 'gds'), gdData);
      navigate(`/gd/${docRef.id}`);
    } catch (err) {
      console.error("Error starting GD: ", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Start New GD Session</h1>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GD Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter GD topic"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
            <select
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Batch</option>
              <option value="Batch A">Batch A</option>
              <option value="Batch B">Batch B</option>
              <option value="Batch C">Batch C</option>
            </select>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">Add Participants</h2>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input
                type="text"
                value={newStudent.name}
                onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Student Name"
              />
              <select
                value={newStudent.batch}
                onChange={(e) => setNewStudent({...newStudent, batch: e.target.value})}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!!batch}
              >
                <option value="">Select Batch</option>
                <option value="Batch A">Batch A</option>
                <option value="Batch B">Batch B</option>
                <option value="Batch C">Batch C</option>
              </select>
              <button
                onClick={addStudent}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition flex items-center justify-center gap-1"
              >
                <FiPlus /> Add
              </button>
            </div>

            {students.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Batch</th>
                      <th className="px-4 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2">{student.name}</td>
                        <td className="px-4 py-2">{student.batch}</td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => removeStudent(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <FiX />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <button
            onClick={startGD}
            disabled={!topic || students.length === 0}
            className={`w-full py-3 rounded-lg text-white font-medium transition ${
              !topic || students.length === 0 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            Start GD Session
          </button>
        </div>
      </div>
    </div>
  );
}