import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function NewGD() {
  const [topic, setTopic] = useState('');
  const [batch, setBatch] = useState('');
  const [students, setStudents] = useState([]);
  const [newStudent, setNewStudent] = useState({ name: '', batch: '' });
  const navigate = useNavigate();

  const addStudent = () => {
    if (newStudent.name.trim() && newStudent.batch) {
      setStudents([...students, newStudent]);
      setNewStudent({ name: '', batch: '' });
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
        studentId: `${student.name}-${Date.now()}`,
        studentName: student.name,
        studentBatch: student.batch,
        scores: {
          opening: { initiation: 0, clarity: 0 },
          facts: { relevance: 0, knowledge: 0, examples: 0, grammar: 0 },
          speaking: { vocabulary: 0, flow: 0, confidence: 0 },
          teamwork: { questions: 0, participation: 0, behavior: 0, perspectives: 0 },
          depth: { awareness: 0, bodyLanguage: 0, counterviews: 0 },
          closing: { conclusion: 0, summary: 0, confidence: 0 },
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
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Start New GD Session</h1>
        
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">GD Topic</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Enter GD topic"
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Batch</label>
          <select
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">Select Batch</option>
            <option value="Batch 1">Batch 1</option>
            <option value="Batch 2">Batch 2</option>
            <option value="Batch 3">Batch 3</option>
          </select>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Add Participants</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newStudent.name}
              onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
              className="flex-1 px-3 py-2 border rounded-lg"
              placeholder="Student Name"
            />
            <select
              value={newStudent.batch}
              onChange={(e) => setNewStudent({...newStudent, batch: e.target.value})}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">Select Batch</option>
              <option value="Batch 1">Batch 1</option>
              <option value="Batch 2">Batch 2</option>
              <option value="Batch 3">Batch 3</option>
            </select>
            <button
              onClick={addStudent}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              Add
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
                          className="text-red-500 hover:text-red-700"
                        >
                          Remove
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
          className={`w-full py-3 rounded-lg text-white font-medium ${!topic || students.length === 0 ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'}`}
        >
          Start GD Session
        </button>
      </div>
    </div>
  );
}