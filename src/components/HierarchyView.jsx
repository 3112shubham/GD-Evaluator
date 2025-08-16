import { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, addDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { FiEdit, FiTrash2, FiChevronDown, FiChevronUp, FiSave, FiX, FiUserPlus, FiUpload, FiUsers, FiArrowLeft, FiDownload } from 'react-icons/fi';
import ProjectForm from './Forms/ProjectForm';
import CampusForm from './Forms/CampusForm';
import CourseForm from './Forms/CourseForm';
import SpecializationForm from './Forms/SpecializationForm';
import * as XLSX from 'xlsx';

export default function HierarchyView() {
  const [projects, setProjects] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [years] = useState([1, 2, 3, 4, 5, 6]);
  const [specializations, setSpecializations] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selected hierarchy
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedCampus, setSelectedCampus] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedSpecialization, setSelectedSpecialization] = useState(null);

  // UI states
  const [excelFile, setExcelFile] = useState(null);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showTrainerForm, setShowTrainerForm] = useState(false);
  const [assignedTrainers, setAssignedTrainers] = useState({});
  const [students, setStudents] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch projects
    const projectsSnapshot = await getDocs(collection(db, 'projects'));
    setProjects(projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    
    // Fetch campuses
    const campusesSnapshot = await getDocs(collection(db, 'campuses'));
    setCampuses(campusesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    
    // Fetch courses
    const coursesSnapshot = await getDocs(collection(db, 'courses'));
    setCourses(coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    
    // Fetch specializations
    const specializationsSnapshot = await getDocs(collection(db, 'specializations'));
    setSpecializations(specializationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    
    // Fetch trainers
    const trainersSnapshot = await getDocs(collection(db, 'trainers'));
    setTrainers(trainersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    
    setLoading(false);
  };

  const fetchStudents = async (specializationId) => {
    if (!specializationId) return;
    
    try {
      const batchesQuery = query(
        collection(db, 'batches'),
        where('specializationId', '==', specializationId)
      );
      const batchesSnapshot = await getDocs(batchesQuery);
      
      if (batchesSnapshot.empty) {
        setStudents([]);
        return;
      }
      
      const studentsPromises = batchesSnapshot.docs.map(async batchDoc => {
        const studentsSnapshot = await getDocs(
          collection(db, 'batches', batchDoc.id, 'students')
        );
        return studentsSnapshot.docs.map(studentDoc => ({
          id: studentDoc.id,
          ...studentDoc.data()
        }));
      });
      
      const studentsArrays = await Promise.all(studentsPromises);
      setStudents(studentsArrays.flat());
    } catch (err) {
      console.error("Error fetching students: ", err);
      alert("Failed to fetch students: " + err.message);
    }
  };

  const handleDelete = async (collectionName, id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      await deleteDoc(doc(db, collectionName, id));
      fetchData();
      alert('Deleted successfully');
    } catch (err) {
      console.error("Error deleting: ", err);
      alert("Failed to delete: " + err.message);
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
          specializationId: selectedSpecialization,
          year: selectedYear,
          joinedDate: new Date()
        }));

        setStudents(studentsData.filter(s => s.name && s.email));
      }
    };
    reader.readAsArrayBuffer(file);
    setExcelFile(file.name);
  };

  const uploadStudents = async () => {
    if (students.length === 0) {
      alert("No students to upload");
      return;
    }

    try {
      // Create a new batch
      const batchRef = await addDoc(collection(db, 'batches'), {
        name: `Batch-${new Date().toISOString().slice(0, 10)}`,
        projectId: selectedProject,
        campusId: selectedCampus || null,
        courseId: selectedCourse,
        year: selectedYear,
        specializationId: selectedSpecialization,
        createdAt: new Date()
      });

      // Add students to the batch
      const studentsCollection = collection(db, 'batches', batchRef.id, 'students');
      const addStudentPromises = students.map(student => 
        addDoc(studentsCollection, student)
      );

      await Promise.all(addStudentPromises);
      
      alert(`${students.length} students added successfully!`);
      setStudents([]);
      setExcelFile(null);
      fetchData();
    } catch (err) {
      console.error("Error adding students: ", err);
      alert("Failed to add students: " + err.message);
    }
  };

  const assignTrainer = async (specializationId, trainerId) => {
    if (!trainerId) return;
    
    try {
      await addDoc(collection(db, 'specialization_trainers'), {
        specializationId,
        trainerId,
        assignedAt: new Date()
      });
      
      setAssignedTrainers({
        ...assignedTrainers,
        [specializationId]: trainerId
      });
      alert('Trainer assigned successfully!');
    } catch (err) {
      console.error("Error assigning trainer: ", err);
      alert("Failed to assign trainer: " + err.message);
    }
  };

  const exportStudentsToExcel = () => {
    if (students.length === 0) {
      alert("No students to export");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(students.map(s => ({
      Name: s.name,
      Email: s.email,
      'Roll Number': s.rollNumber || '',
      'Join Date': s.joinedDate?.toDate().toLocaleDateString() || ''
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `Students_${selectedSpecialization}.xlsx`);
  };

  // Navigation functions
  const goBack = () => {
    if (selectedSpecialization) {
      setSelectedSpecialization(null);
      setStudents([]);
    } else if (selectedYear) {
      setSelectedYear(null);
    } else if (selectedCourse) {
      setSelectedCourse(null);
      setSelectedYear(null);
      setSelectedSpecialization(null);
    } else if (selectedCampus) {
      setSelectedCampus(null);
      setSelectedCourse(null);
      setSelectedYear(null);
      setSelectedSpecialization(null);
    } else if (selectedProject) {
      setSelectedProject(null);
      setSelectedCampus(null);
      setSelectedCourse(null);
      setSelectedYear(null);
      setSelectedSpecialization(null);
    }
  };

  // Get filtered data
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
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Side - Forms */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <ProjectForm 
          projects={projects} 
          fetchData={fetchData} 
          selectedProject={selectedProject}
          setSelectedProject={setSelectedProject}
        />

        {selectedProject && (
          <CampusForm 
            campuses={filteredCampuses}
            projects={projects}
            fetchData={fetchData}
            selectedProject={selectedProject}
            selectedCampus={selectedCampus}
            setSelectedCampus={setSelectedCampus}
          />
        )}

        {(selectedProject && (selectedCampus || filteredCampuses.length === 0)) && (
          <CourseForm 
            courses={filteredCourses}
            fetchData={fetchData}
            selectedProject={selectedProject}
            selectedCampus={selectedCampus}
            selectedCourse={selectedCourse}
            setSelectedCourse={setSelectedCourse}
          />
        )}

        {selectedCourse && (
          <SpecializationForm 
            specializations={filteredSpecializations}
            years={years}
            fetchData={fetchData}
            selectedCourse={selectedCourse}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            selectedSpecialization={selectedSpecialization}
            setSelectedSpecialization={setSelectedSpecialization}
          />
        )}
      </div>
      
      {/* Right Side - Hierarchy View */}
      <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Hierarchy View</h2>
          {(selectedProject || selectedCampus || selectedCourse || selectedYear || selectedSpecialization) && (
            <button
              onClick={goBack}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <FiArrowLeft /> Back
            </button>
          )}
        </div>
        
        {/* Projects */}
        <div className="border rounded-lg p-4 bg-blue-50">
          <div className="font-medium">Projects</div>
          <div className="mt-3 space-y-2">
            {projects.map(project => (
              <div 
                key={project.id} 
                className={`p-2 rounded flex justify-between items-center ${selectedProject === project.id ? 'bg-blue-100' : 'bg-white'}`}
                onClick={() => {
                  setSelectedProject(project.id);
                  setSelectedCampus(null);
                  setSelectedCourse(null);
                  setSelectedYear(null);
                  setSelectedSpecialization(null);
                }}
              >
                <span className="font-mono">{project.code}</span>
                <div className="flex gap-2">
                  <button 
                    className="text-red-500 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete('projects', project.id);
                    }}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Campuses */}
        {selectedProject && filteredCampuses.length > 0 && (
          <div className="mt-4 border rounded-lg p-4 bg-blue-50">
            <div className="font-medium">Campuses</div>
            <div className="mt-3 ml-4 space-y-2">
              {filteredCampuses.map(campus => (
                <div 
                  key={campus.id} 
                  className={`p-2 rounded flex justify-between items-center ${selectedCampus === campus.id ? 'bg-blue-100' : 'bg-white'}`}
                  onClick={() => {
                    setSelectedCampus(campus.id);
                    setSelectedCourse(null);
                    setSelectedYear(null);
                    setSelectedSpecialization(null);
                  }}
                >
                  <span>{campus.name}</span>
                  <div className="flex gap-2">
                    <button 
                      className="text-red-500 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete('campuses', campus.id);
                      }}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Courses */}
        {selectedProject && (selectedCampus || filteredCampuses.length === 0) && filteredCourses.length > 0 && (
          <div className="mt-4 border rounded-lg p-4 bg-blue-50">
            <div className="font-medium">Courses</div>
            <div className="mt-3 ml-4 space-y-2">
              {filteredCourses.map(course => (
                <div 
                  key={course.id} 
                  className={`p-2 rounded flex justify-between items-center ${selectedCourse === course.id ? 'bg-blue-100' : 'bg-white'}`}
                  onClick={() => {
                    setSelectedCourse(course.id);
                    setSelectedYear(null);
                    setSelectedSpecialization(null);
                  }}
                >
                  <span>{course.name}</span>
                  <div className="flex gap-2">
                    {course.isCustom && (
                      <button 
                        className="text-red-500 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete('courses', course.id);
                        }}
                      >
                        <FiTrash2 />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Years with Specializations */}
        {selectedCourse && availableYears.length > 0 && (
          <div className="mt-4 border rounded-lg p-4 bg-blue-50">
            <div className="font-medium">Years</div>
            <div className="mt-3 ml-4 space-y-4">
              {availableYears.map(year => {
                const yearSpecializations = filteredSpecializations.filter(s => s.year === year);
                return (
                  <div key={year} className="space-y-2">
                    <div 
                      className={`p-2 rounded flex justify-between items-center ${selectedYear === year ? 'bg-blue-100' : 'bg-white'}`}
                      onClick={() => {
                        setSelectedYear(year);
                        setSelectedSpecialization(null);
                      }}
                    >
                      <span>Year {year}</span>
                    </div>

                    {selectedYear === year && yearSpecializations.length > 0 && (
                      <div className="ml-4 space-y-2">
                        {yearSpecializations.map(specialization => (
                          <div 
                            key={specialization.id} 
                            className={`p-2 rounded flex justify-between items-center ${selectedSpecialization === specialization.id ? 'bg-blue-100' : 'bg-white'}`}
                            onClick={() => {
                              setSelectedSpecialization(specialization.id);
                              fetchStudents(specialization.id);
                            }}
                          >
                            <span>{specialization.name}</span>
                            <div className="flex gap-2">
                              <button 
                                className="text-red-500 hover:text-red-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete('specializations', specialization.id);
                                }}
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Student and Trainer Management (Only for selected specialization) */}
        {selectedSpecialization && (
          <div className="mt-4 border rounded-lg p-4 bg-blue-50">
            <div className="font-medium mb-3">Management for {specializations.find(s => s.id === selectedSpecialization)?.name}</div>
            
            {/* Student Management */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Students</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowStudentForm(!showStudentForm)}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                  >
                    {showStudentForm ? <FiX /> : <FiUpload />}
                    {showStudentForm ? 'Close' : 'Upload'}
                  </button>
                  {students.length > 0 && (
                    <button
                      onClick={exportStudentsToExcel}
                      className="text-green-600 hover:text-green-800 flex items-center gap-1 text-sm"
                    >
                      <FiDownload /> Export
                    </button>
                  )}
                </div>
              </div>

              {showStudentForm && (
                <div className="space-y-3 mb-3 p-3 bg-white rounded border">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload Student List (Excel)
                  </label>
                  <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-lg border border-gray-300 flex items-center justify-between text-sm">
                    <span>{excelFile || 'Choose File'}</span>
                    <FiUpload size={14} />
                    <input 
                      type="file" 
                      accept=".xlsx,.xls" 
                      onChange={handleExcelUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Excel should have columns: Name, Email, Roll Number
                  </p>
                  
                  {students.length > 0 && (
                    <button
                      onClick={uploadStudents}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-1 px-2 rounded text-sm"
                    >
                      Import {students.length} Students
                    </button>
                  )}
                </div>
              )}

              {students.length > 0 && (
                <div className="border rounded p-2 max-h-40 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-1">Name</th>
                        <th className="text-left p-1">Email</th>
                        <th className="text-left p-1">Roll No.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.slice(0, 5).map((student, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-1">{student.name}</td>
                          <td className="p-1">{student.email}</td>
                          <td className="p-1">{student.rollNumber || '-'}</td>
                        </tr>
                      ))}
                      {students.length > 5 && (
                        <tr>
                          <td colSpan={3} className="text-center p-1 text-gray-500">
                            + {students.length - 5} more students
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Trainer Management */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Trainer</span>
                <button
                  onClick={() => setShowTrainerForm(!showTrainerForm)}
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                >
                  {showTrainerForm ? <FiX /> : <FiUserPlus />}
                  {showTrainerForm ? 'Close' : 'Assign'}
                </button>
              </div>

              {showTrainerForm && (
                <div className="space-y-3 p-3 bg-white rounded border">
                  <select
                    className="w-full p-2 border rounded text-sm"
                    onChange={(e) => assignTrainer(selectedSpecialization, e.target.value)}
                    value={assignedTrainers[selectedSpecialization] || ''}
                  >
                    <option value="">Select Trainer</option>
                    {trainers.map(trainer => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.name} ({trainer.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}