// src/components/GDVolunteer.jsx
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { FiPlus, FiX, FiCheck } from 'react-icons/fi';
import { useParams, useNavigate } from 'react-router-dom';

export default function GDVolunteer() {
  const { linkId } = useParams();
  const [students, setStudents] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSessionInfo = async () => {
      try {
        const docRef = doc(db, 'sessions', linkId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          setLoading(false);
          return;
        }
        
        const sessionData = docSnap.data();
        setSessionInfo(sessionData);

        // Fetch students from the specialization
        const batchesQuery = query(
          collection(db, 'batches'),
          where('specializationId', '==', sessionData.specializationId)
        );
        const batchesSnapshot = await getDocs(batchesQuery);
        
        if (batchesSnapshot.empty) {
          setAvailableStudents([]);
          setLoading(false);
          return;
        }
        
        const studentsPromises = batchesSnapshot.docs.map(async batchDoc => {
          const studentsSnapshot = await getDocs(
            collection(db, 'batches', batchDoc.id, 'students')
          );
          return studentsSnapshot.docs.map(studentDoc => ({
            id: studentDoc.id,
            ...studentDoc.data(),
            batchId: batchDoc.id
          }));
        });
        
        const studentsArrays = await Promise.all(studentsPromises);
        setAvailableStudents(studentsArrays.flat());
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data: ", err);
        setLoading(false);
      }
    };

    // Check if user is authenticated
    const unsubscribe = auth.onAuthStateChanged(user => {
        fetchSessionInfo();
    });

    return () => unsubscribe();
  }, [linkId, navigate]);

  const addStudent = (student) => {
    if (!students.some(s => s.id === student.id)) {
      const chestNumber = students.length + 1;
      setStudents([...students, { ...student, chestNumber }]);
    }
  };

  const removeStudent = (studentId) => {
    setStudents(students.filter(s => s.id !== studentId));
  };

const submitStudents = async () => {
  if (students.length === 0 || !linkId) return;
  
  try {
    // Get current students list from the session
    const sessionRef = doc(db, 'sessions', linkId);
    const sessionSnap = await getDoc(sessionRef);
    const currentStudents = sessionSnap.data()?.students || [];
    
    // Merge existing students with new ones, avoiding duplicates
    const mergedStudents = [...currentStudents];
    students.forEach(newStudent => {
      if (!currentStudents.some(s => s.id === newStudent.id)) {
        mergedStudents.push(newStudent);
      }
    });

    // Update the session with merged students
    await updateDoc(sessionRef, {
      students: mergedStudents
    });
    
    setSubmitted(true);
    
    setTimeout(() => {
      navigate('/gd-volunteer-success');
    }, 1500);
  } catch (err) {
    console.error("Error submitting students: ", err);
  }
};
  const filteredStudents = availableStudents.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!sessionInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Invalid GD session link</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-md text-center">
          <FiCheck className="text-green-500 text-5xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Students Submitted!</h1>
          <p className="text-gray-600 mb-6">
            {students.length} students have been added to the GD session.
          </p>
          <p className="text-gray-500">
            The trainer can now start the evaluation process.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold mb-2">Add Students to GD</h1>
        <div className="mb-4">
          <p className="text-gray-600">
            <span className="font-medium">Group:</span> {sessionInfo.groupName}
          </p>
          <p className="text-gray-600">
            <span className="font-medium">Topic:</span> {sessionInfo.topic}
          </p>
        </div>
        
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-3">Available Students</h2>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search students..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
            />
            <div className="max-h-60 overflow-y-auto border rounded-lg">
              {filteredStudents.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(student => (
                      <tr key={student.id} className="border-t">
                        <td className="px-3 py-2">{student.name}</td>
                        <td className="px-3 py-2">{student.email}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => addStudent(student)}
                            disabled={students.some(s => s.id === student.id)}
                            className="text-blue-500 hover:text-blue-700 disabled:text-gray-400"
                          >
                            <FiPlus />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="p-3 text-gray-500">No students found</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">Selected Students ({students.length})</h2>
            {students.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Chest No.</th>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Email</th>
                      <th className="px-4 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => (
                      <tr key={student.id} className="border-t">
                        <td className="px-4 py-2 font-medium">{student.chestNumber}</td>
                        <td className="px-4 py-2">{student.name}</td>
                        <td className="px-4 py-2">{student.email}</td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => removeStudent(student.id)}
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
            ) : (
              <p className="text-gray-500 p-3 border rounded-lg">No students selected yet</p>
            )}
          </div>

          <button
            onClick={submitStudents}
            disabled={students.length === 0}
            className={`w-full py-3 rounded-lg text-white font-medium transition ${
              students.length === 0 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            Submit Students
          </button>
        </div>
      </div>
    </div>
  );
}