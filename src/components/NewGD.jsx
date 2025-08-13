import QRCode from 'react-qr-code';
import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, doc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiX, FiLink, FiCopy, FiUsers } from 'react-icons/fi';

export default function NewGD() {
  const [groupName, setGroupName] = useState('');
  const [topic, setTopic] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [students, setStudents] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [projects, setProjects] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [gdId, setGdId] = useState(null);
  const navigate = useNavigate();
  const [showQRDownload, setShowQRDownload] = useState(false);
  useEffect(() => {
    fetchInitialData();
  }, []);
    const downloadQRCode = () => {
    const canvas = document.getElementById("qr-code-canvas");
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `${groupName}-gd-link.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };
  const fetchInitialData = async () => {
    try {
      const [projectsSnap, campusesSnap, coursesSnap, specializationsSnap] = await Promise.all([
        getDocs(collection(db, 'projects')),
        getDocs(collection(db, 'campuses')),
        getDocs(collection(db, 'courses')),
        getDocs(collection(db, 'specializations'))
      ]);

      setProjects(projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setCampuses(campusesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setCourses(coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setSpecializations(specializationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    } catch (err) {
      console.error("Error fetching data: ", err);
      setLoading(false);
    }
  };

  const fetchStudents = useCallback(async () => {
    if (!selectedSpecialization) return;

    try {
      const batchesQuery = query(
        collection(db, 'batches'),
        where('specializationId', '==', selectedSpecialization)
      );
      const batchesSnapshot = await getDocs(batchesQuery);

      if (batchesSnapshot.empty) {
        setAvailableStudents([]);
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
    } catch (err) {
      console.error("Error fetching students: ", err);
    }
  }, [selectedSpecialization]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const addStudent = (student) => {
    if (!students.some(s => s.id === student.id)) {
      const chestNumber = students.length + 1;
      setStudents([...students, { ...student, chestNumber }]);
    }
  };

  const removeStudent = (studentId) => {
    setStudents(students.filter(s => s.id !== studentId));
  };

  const generateLink = async () => {
    if (!groupName || !topic || !selectedSpecialization) return;
    
    const gdData = {
      groupName,
      topic,
      projectId: selectedProject,
      campusId: selectedCampus,
      courseId: selectedCourse,
      year: selectedYear,
      specializationId: selectedSpecialization,
      students: [],
      trainerId: auth.currentUser.uid,
      trainerEmail: auth.currentUser.email,
      createdAt: new Date(),
      completed: false,
      isActive: false,
      type: 'gd'
    };

    try {
      const docRef = await addDoc(collection(db, 'sessions'), gdData);
      const linkId = docRef.id;
      const link = `${window.location.origin}/gd-volunteer/${linkId}`;
      setGeneratedLink(link);
      setGdId(linkId);
    } catch (err) {
      console.error("Error generating link: ", err);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    alert('Link copied to clipboard!');
  };

const activateGD = async () => {
  if (!gdId) return;
  
  try {
    await updateDoc(doc(db, 'sessions', gdId), {
      students: students, // can be empty array
      isActive: true
    });
    setIsActive(true);
    navigate('/dashboard');
  } catch (err) {
    console.error("Error activating GD: ", err);
  }
};

  const filteredStudents = availableStudents.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCampuses = selectedProject 
    ? campuses.filter(c => c.projectId === selectedProject) 
    : [];

  const filteredCourses = selectedCampus
    ? courses.filter(c => c.campusId === selectedCampus)
    : selectedProject
    ? courses.filter(c => c.projectId === selectedProject && !c.campusId)
    : [];

  const filteredSpecializations = selectedCourse
    ? specializations.filter(s => s.courseId === selectedCourse)
    : [];

  const availableYears = selectedCourse 
    ? [...new Set(filteredSpecializations.map(s => s.year))].sort() 
    : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Start New GD Session</h1>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter group name"
            />
          </div>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <select
                value={selectedProject}
                onChange={(e) => {
                  setSelectedProject(e.target.value);
                  setSelectedCampus('');
                  setSelectedCourse('');
                  setSelectedYear('');
                  setSelectedSpecialization('');
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedProject && filteredCampuses.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
                <select
                  value={selectedCampus}
                  onChange={(e) => {
                    setSelectedCampus(e.target.value);
                    setSelectedCourse('');
                    setSelectedYear('');
                    setSelectedSpecialization('');
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Campus</option>
                  {filteredCampuses.map(campus => (
                    <option key={campus.id} value={campus.id}>
                      {campus.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedProject && (selectedCampus || filteredCampuses.length === 0) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => {
                    setSelectedCourse(e.target.value);
                    setSelectedYear('');
                    setSelectedSpecialization('');
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Course</option>
                  {filteredCourses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedCourse && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setSelectedSpecialization('');
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Year</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>
                      Year {year}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {selectedYear && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
              <select
                value={selectedSpecialization}
                onChange={(e) => setSelectedSpecialization(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Specialization</option>
                {filteredSpecializations
                  .filter(s => s.year === selectedYear)
                  .map(specialization => (
                    <option key={specialization.id} value={specialization.id}>
                      {specialization.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {selectedSpecialization && (
  <div>
    <button
      onClick={generateLink}
      disabled={!groupName || !topic}
      className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 ${
        !groupName || !topic ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <FiLink /> Generate Volunteer Link
    </button>

    {generatedLink && (
      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
        <div className="flex flex-col items-center gap-4">
          <div className="border p-2 bg-white rounded-lg">
            <QRCode
              id="qr-code-canvas"
              value={generatedLink}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={downloadQRCode}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              Download QR Code
            </button>
            
            <button
              onClick={copyLink}
              className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <FiCopy /> Copy Link
            </button>
          </div>
          
          <p className="text-sm text-gray-600 text-center">
            Scan this QR code or share the link with volunteers to add students
          </p>
        </div>
      </div>
    )}
  </div>
)}

          <div>
            <h2 className="text-lg font-semibold mb-3">Participants</h2>
            
            {selectedSpecialization && (
              <>
                <div className="mb-4">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search students..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
                  />
                  <div className="max-h-40 overflow-y-auto border rounded-lg">
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
                                  Add
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
              </>
            )}

            {students.length > 0 && (
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
            )}
          </div>

          <button
  onClick={activateGD}
  disabled={!gdId}
  className={`w-full py-3 rounded-lg text-white font-medium transition ${
    !gdId 
      ? 'bg-gray-400 cursor-not-allowed' 
      : 'bg-green-600 hover:bg-green-700'
  }`}
>
  Activate GD Session
</button>
        </div>
      </div>
    </div>
  );
}