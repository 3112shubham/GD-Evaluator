import { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { FiEdit, FiTrash2, FiUpload, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import * as XLSX from 'xlsx';

export default function BatchManagement() {
  const [batches, setBatches] = useState([]);
  const [projects, setProjects] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [excelFile, setExcelFile] = useState(null);
  const [students, setStudents] = useState([]);
  const [expandedBatch, setExpandedBatch] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    
    try {
      // Fetch all necessary data in parallel
      const [
        batchesSnapshot,
        projectsSnapshot,
        campusesSnapshot,
        coursesSnapshot,
        specializationsSnapshot
      ] = await Promise.all([
        getDocs(collection(db, 'batches')),
        getDocs(collection(db, 'projects')),
        getDocs(collection(db, 'campuses')),
        getDocs(collection(db, 'courses')),
        getDocs(collection(db, 'specializations'))
      ]);

      // Process the data
      const projectsData = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const campusesData = campusesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const coursesData = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const specializationsData = specializationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Process batches with all related data
      const batchesData = await Promise.all(
        batchesSnapshot.docs.map(async batchDoc => {
          const studentsSnapshot = await getDocs(collection(db, 'batches', batchDoc.id, 'students'));
          
          const batchData = batchDoc.data();
          
          // Find related data
          const project = projectsData.find(p => p.id === batchData.projectId) || {};
          const campus = campusesData.find(c => c.id === batchData.campusId) || {};
          const course = coursesData.find(c => c.id === batchData.courseId) || {};
          const specialization = specializationsData.find(s => s.id === batchData.specializationId) || {};

          return {
            id: batchDoc.id,
            ...batchData,
            projectCode: project.code,
            projectName: project.name,
            campusName: campus.name,
            courseName: course.name,
            specializationName: specialization.name,
            studentCount: studentsSnapshot.size,
            students: studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          };
        })
      );

      setProjects(projectsData);
      setCampuses(campusesData);
      setCourses(coursesData);
      setSpecializations(specializationsData);
      setBatches(batchesData);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching data: ", err);
      setLoading(false);
    }
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length > 0) {
        const studentsData = jsonData.map(row => ({
          name: row['Name'] || row['name'] || row[Object.keys(row)[0]] || '',
          email: row['Email'] || row['email'] || row[Object.keys(row)[1]] || '',
          rollNumber: row['Roll Number'] || row['rollNumber'] || '',
          joinedDate: new Date()
        }));

        setStudents(studentsData.filter(s => s.name && s.email));
      }
    };
    reader.readAsArrayBuffer(file);
    setExcelFile(file.name);
  };

  const handleDelete = async (batchId) => {
    if (!window.confirm('Are you sure you want to delete this batch?')) return;
    
    try {
      await deleteDoc(doc(db, 'batches', batchId));
      fetchAllData();
      alert('Batch deleted successfully');
    } catch (err) {
      console.error("Error deleting batch: ", err);
      alert("Failed to delete batch: " + err.message);
    }
  };

  const toggleExpandBatch = (batchId) => {
    setExpandedBatch(expandedBatch === batchId ? null : batchId);
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
        <h2 className="text-xl font-semibold">Batch Management</h2>
        <div>
          <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <FiUpload /> Upload Students
            <input 
              type="file" 
              accept=".xlsx,.xls" 
              onChange={handleExcelUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {students.length > 0 && (
        <div className="mb-6 border rounded-lg p-4 bg-blue-50">
          <h3 className="font-medium text-lg mb-3">Students Preview ({students.length})</h3>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Roll Number</th>
                </tr>
              </thead>
              <tbody>
                {students.slice(0, 10).map((student, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{student.name}</td>
                    <td className="px-3 py-2">{student.email}</td>
                    <td className="px-3 py-2">{student.rollNumber || '-'}</td>
                  </tr>
                ))}
                {students.length > 10 && (
                  <tr>
                    <td colSpan="3" className="px-3 py-2 text-center text-gray-500">
                      + {students.length - 10} more students
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex justify-end gap-3">
            <button 
              onClick={() => setStudents([])}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg"
            >
              Cancel
            </button>
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
              Create Batch
            </button>
          </div>
        </div>
      )}

      {batches.length === 0 ? (
        <p className="text-gray-500">No batches created yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Batch</th>
                <th className="px-4 py-2 text-left">Project</th>
                <th className="px-4 py-2 text-left">Campus</th>
                <th className="px-4 py-2 text-left">Course</th>
                <th className="px-4 py-2 text-left">Year</th>
                <th className="px-4 py-2 text-left">Specialization</th>
                <th className="px-4 py-2 text-left">Students</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(batch => (
                <>
                  <tr key={batch.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{batch.name}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{batch.projectCode}</div>
                      <div className="text-sm text-gray-600">{batch.projectName}</div>
                    </td>
                    <td className="px-4 py-2">{batch.campusName || '-'}</td>
                    <td className="px-4 py-2">{batch.courseName}</td>
                    <td className="px-4 py-2">Year {batch.year}</td>
                    <td className="px-4 py-2">{batch.specializationName || '-'}</td>
                    <td className="px-4 py-2">{batch.studentCount}</td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => toggleExpandBatch(batch.id)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          {expandedBatch === batch.id ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                        <button 
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(batch.id)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedBatch === batch.id && (
                    <tr className="border-t bg-gray-50">
                      <td colSpan="8" className="px-4 py-3">
                        <div className="ml-4">
                          <h4 className="font-medium mb-2">Students ({batch.studentCount})</h4>
                          {batch.students.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-3 py-2 text-left">Name</th>
                                    <th className="px-3 py-2 text-left">Email</th>
                                    <th className="px-3 py-2 text-left">Roll Number</th>
                                    <th className="px-3 py-2 text-left">Join Date</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {batch.students.map(student => (
                                    <tr key={student.id} className="border-t">
                                      <td className="px-3 py-2">{student.name}</td>
                                      <td className="px-3 py-2">{student.email}</td>
                                      <td className="px-3 py-2">{student.rollNumber || '-'}</td>
                                      <td className="px-3 py-2">
                                        {student.joinedDate?.toDate().toLocaleDateString() || '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-gray-500">No students in this batch</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}