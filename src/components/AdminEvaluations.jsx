import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';

const categories = [
  { id: 'introduction', name: 'Introduction' },
  { id: 'internship', name: 'Internship/Experience' },
  { id: 'bodyLanguage', name: 'Body Language' },
  { id: 'domainKnowledge', name: 'Domain Knowledge' },
  { id: 'starMethod', name: 'STAR Method' },
  { id: 'crispness', name: 'Crispness of Answers' },
  { id: 'situational', name: 'Situational Handling' },
  { id: 'jdAwareness', name: 'JD Awareness' },
  { id: 'industry', name: 'Industry Awareness' },
  { id: 'personality', name: 'Personality Fitment' }
];

const gdCategories = [
  { id: 'opening', name: 'Opening', max: 20 },
  { id: 'speaking', name: 'Speaking', max: 20 },
  { id: 'teamwork', name: 'Teamwork', max: 20 },
  { id: 'engagement', name: 'Engagement', max: 20 },
  { id: 'closing', name: 'Closing', max: 20 }
];

const calculateCategoryScore = (evaluation, category) => {
  if (!evaluation.scores?.[category]) return 0;
  return Object.values(evaluation.scores[category]).reduce((a, b) => a + b, 0);
};

const calculateGDTotalScore = (evaluation) => {
  return gdCategories.reduce((total, category) => {
    return total + calculateCategoryScore(evaluation, category.id);
  }, 0);
};

const calculatePITotalScore = (evaluation) => {
  return categories.reduce((total, category) => {
    return total + (evaluation[category.id] 
      ? Object.values(evaluation[category.id]).reduce((a, b) => a + b, 0)
      : 0);
  }, 0);
};

export default function AdminEvaluations() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [batches, setBatches] = useState([]);
  const [years, setYears] = useState([]);
  
  const [filter, setFilter] = useState({
    type: '',
    project: '',
    campus: '',
    course: '',
    year: '',
    specialization: '',
    batch: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [
          projectsSnap, 
          campusesSnap, 
          coursesSnap, 
          specializationsSnap
        ] = await Promise.all([
          getDocs(collection(db, 'projects')),
          getDocs(collection(db, 'campuses')),
          getDocs(collection(db, 'courses')),
          getDocs(collection(db, 'specializations'))
        ]);

        setProjects(projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setCampuses(campusesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setCourses(coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        const specsData = specializationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSpecializations(specsData);
        setYears([...new Set(specsData.map(s => s.year))].sort());
      } catch (err) {
        console.error("Error fetching data: ", err);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    setLoading(true);
    
    try {
      const constraints = [
        where('completed', '==', true)
      ];
      
      if (filter.type) constraints.push(where('type', '==', filter.type));
      if (filter.project) constraints.push(where('projectId', '==', filter.project));
      if (filter.campus) constraints.push(where('campusId', '==', filter.campus));
      if (filter.course) constraints.push(where('courseId', '==', filter.course));
      if (filter.year) constraints.push(where('year', '==', filter.year));
      if (filter.specialization) constraints.push(where('specializationId', '==', filter.specialization));
      if (filter.batch) constraints.push(where('batch', '==', filter.batch));
      if (filter.dateFrom) {
        const fromDate = new Date(filter.dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        constraints.push(where('completedAt', '>=', fromDate));
      }
      if (filter.dateTo) {
        const toDate = new Date(filter.dateTo);
        toDate.setHours(23, 59, 59, 999);
        constraints.push(where('completedAt', '<=', toDate));
      }

      const q = query(collection(db, 'sessions'), ...constraints);
      
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const sessionsData = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            completedAt: doc.data().completedAt?.toDate(),
            // normalize student objects so we have consistent fields to match against
            // leave missing ids/emails as undefined/null (not empty string) to avoid accidental matches
            students: doc.data().students?.map(s => ({
              id: s.id || s.studentId || s.studentIdString || undefined,
              name: s.name || s.studentName || (s.student?.name) || 'Unknown Student',
              email: s.email || s.studentEmail || (s.student?.email) || undefined,
              chestNumber: typeof s.chestNumber !== 'undefined' ? s.chestNumber : (s.chestNo || s.chest || null)
            })) || []
          }));

          sessionsData.sort((a, b) => {
            if (!a.completedAt || !b.completedAt) return 0;
            return b.completedAt.getTime() - a.completedAt.getTime();
          });
          
          const allBatches = [...new Set(sessionsData.map(s => 
            s.batch || (s.candidate?.batch || '')
          ))].filter(Boolean);
          setBatches(allBatches);
          
          setSessions(sessionsData);
          setLoading(false);
        },
        (error) => {
          console.error("Firestore error:", error);
          setLoading(false);
          
          if (error.code === 'failed-precondition') {
            console.error(
              "Index missing. Please create this Firestore composite index:",
              "\nCollection: sessions",
              "\nFields: completed (asc), completedAt (desc)"
            );
            
            if (error.message.includes("https://console.firebase.google.com")) {
              const indexCreationUrl = error.message.match(/https:\/\/console\.firebase\.google\.com[^ ]*/)[0];
              console.log("Create index here:", indexCreationUrl);
            }
          }
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error("Error setting up Firestore listener:", error);
      setLoading(false);
    }
  }, [filter]);

  const resetFilters = () => {
    setFilter({
      type: '',
      project: '',
      campus: '',
      course: '',
      year: '',
      specialization: '',
      batch: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  // helper to find student in a session by multiple fallback keys
  const findStudentInSession = (session, { studentId, studentEmail, chestNumber, studentName } = {}) => {
    if (!session || !session.students) return null;

    // try by id
    if (studentId) {
      const byId = session.students.find(s => s.id && s.id === studentId);
      if (byId) return byId;
    }

    // try by email
    if (studentEmail) {
      const byEmail = session.students.find(s => s.email && s.email === studentEmail);
      if (byEmail) return byEmail;
    }

    // try by chestNumber (strict match)
    if (typeof chestNumber !== 'undefined' && chestNumber !== null) {
      const byChest = session.students.find(s => s.chestNumber !== null && s.chestNumber !== undefined && +s.chestNumber === +chestNumber);
      if (byChest) return byChest;
    }

    // try by name (last resort)
    if (studentName) {
      const byName = session.students.find(s => s.name && s.name === studentName);
      if (byName) return byName;
    }

    return null;
  };

  const exportToExcel = () => {
    const excelData = sessions.flatMap(session => {
      const project = projects.find(p => p.id === session.projectId) || { code: '', name: '' };
      const campus = campuses.find(c => c.id === session.campusId) || { name: '' };
      const course = courses.find(c => c.id === session.courseId) || { name: '' };
      const specialization = specializations.find(s => s.id === session.specializationId) || { name: '' };

      if (session.type === 'gd') {
        return session.evaluations?.map(evaluation => {
          const student = findStudentInSession(session, {
            studentId: evaluation.studentId,
            studentEmail: evaluation.studentEmail,
            chestNumber: evaluation.chestNumber,
            studentName: evaluation.studentName
          }) || {
            name: evaluation.studentName || 'Unknown Student',
            chestNumber: evaluation.chestNumber || 0,
            email: evaluation.studentEmail || undefined
          };

          return {
            'Student Name': student.name,
            'Student Email': student.email,
            'Date': session.completedAt?.toLocaleDateString(),
            'Time': session.completedAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            ...gdCategories.reduce((acc, category) => {
              acc[category.name] = calculateCategoryScore(evaluation, category.id);
              return acc;
            }, {}),
            'Total Score': calculateGDTotalScore(evaluation),
            'Remarks': evaluation.remarks || '',
            'Type': 'Group Discussion',
            'Group Name': session.groupName,
            'Topic': session.topic,
            'Project': `${project.code} - ${project.name}`,
            'Campus': campus.name,
            'Course': course.name,
            'Year': session.year,
            'Specialization': specialization.name,
            
          };
        }) || [];
      } else {
        return {
          'Session ID': session.id,
          'Type': 'Personal Interview',
          'Candidate Name': session.candidate?.name || 'Candidate',
          'Position': session.candidate?.position || 'Position',
          'Project': `${project.code} - ${project.name}`,
          'Campus': campus.name,
          'Course': course.name,
          'Year': session.year,
          'Specialization': specialization.name,
          'Batch': session.candidate?.batch || '',
          'Date': session.completedAt?.toLocaleDateString(),
          'Time': session.completedAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ...categories.reduce((acc, category) => {
            acc[category.name] = session.evaluation[category.id] 
              ? Object.values(session.evaluation[category.id]).reduce((a, b) => a + b, 0)
              : 0;
            return acc;
          }, {}),
          'Total Score': calculatePITotalScore(session.evaluation),
          'Remarks': session.evaluation.remarks || ''
        };
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Evaluations");
    
    const fileName = `evaluations_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const filteredCampuses = filter.project 
    ? campuses.filter(c => c.projectId === filter.project) 
    : [];

  const filteredCourses = filter.campus
    ? courses.filter(c => c.campusId === filter.campus)
    : filter.project
    ? courses.filter(c => c.projectId === filter.project && !c.campusId)
    : [];

  const filteredYears = filter.course
    ? [...new Set(specializations.filter(s => s.courseId === filter.course).map(s => s.year))].sort()
    : [];

  const filteredSpecializations = filter.course && filter.year
    ? specializations.filter(s => s.courseId === filter.course && s.year === filter.year)
    : [];

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">All Evaluations</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Type</label>
              <select
                value={filter.type}
                onChange={(e) => setFilter({...filter, type: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">All Types</option>
                <option value="gd">GD</option>
                <option value="pi">PI</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">Project</label>
              <select
                value={filter.project}
                onChange={(e) => setFilter({
                  ...filter, 
                  project: e.target.value,
                  campus: '',
                  course: '',
                  year: '',
                  specialization: ''
                })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">All Projects</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </option>
                ))}
              </select>
            </div>
            
            {filter.project && filteredCampuses.length > 0 && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">Campus</label>
                <select
                  value={filter.campus}
                  onChange={(e) => setFilter({
                    ...filter, 
                    campus: e.target.value,
                    course: '',
                    year: '',
                    specialization: ''
                  })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">All Campuses</option>
                  {filteredCampuses.map(campus => (
                    <option key={campus.id} value={campus.id}>
                      {campus.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {(filter.project || filter.campus) && filteredCourses.length > 0 && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">Course</label>
                <select
                  value={filter.course}
                  onChange={(e) => setFilter({
                    ...filter, 
                    course: e.target.value,
                    year: '',
                    specialization: ''
                  })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">All Courses</option>
                  {filteredCourses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {filter.course && filteredYears.length > 0 && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">Year</label>
                <select
                  value={filter.year}
                  onChange={(e) => setFilter({
                    ...filter, 
                    year: e.target.value,
                    specialization: ''
                  })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">All Years</option>
                  {filteredYears.map(year => (
                    <option key={year} value={year}>
                      Year {year}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {filter.course && filter.year && filteredSpecializations.length > 0 && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">Specialization</label>
                <select
                  value={filter.specialization}
                  onChange={(e) => setFilter({...filter, specialization: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">All Specializations</option>
                  {filteredSpecializations.map(specialization => (
                    <option key={specialization.id} value={specialization.id}>
                      {specialization.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">From Date</label>
              <input
                type="date"
                value={filter.dateFrom}
                onChange={(e) => setFilter({...filter, dateFrom: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">To Date</label>
              <input
                type="date"
                value={filter.dateTo}
                onChange={(e) => setFilter({...filter, dateTo: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={resetFilters}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg transition"
            >
              Reset Filters
            </button>
            <button
              onClick={exportToExcel}
              disabled={loading || sessions.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export to Excel
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p>Loading evaluations...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p>No evaluations found matching your criteria</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sessions.map(session => {
              
              return (
                <div key={session.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                      <div>
                        <h2 className="text-xl font-semibold">
                          {session.type === 'gd' 
                            ? `${session.groupName} - ${session.topic}` 
                            : `${session.candidate?.name || 'Candidate'} - ${session.candidate?.position || 'Position'}`}
                        </h2>
                        <p className="text-gray-600">
                          {session.type === 'gd' ? 'GD' : 'PI'} • 
                          {session.projectId && ` Project: ${projects.find(p => p.id === session.projectId)?.code || ''}`} • 
                          {session.campusId && ` Campus: ${campuses.find(c => c.id === session.campusId)?.name || ''}`} • 
                          {session.courseId && ` Course: ${courses.find(c => c.id === session.courseId)?.name || ''}`} • 
                          {session.year && ` Year: ${session.year}`} • 
                          {session.specializationId && ` Specialization: ${specializations.find(s => s.id === session.specializationId)?.name || ''}`} • 
                          Batch: {session.type === 'gd' ? session.batch : session.candidate?.batch || ''} • 
                          Date: {session.completedAt?.toLocaleDateString()} • 
                          Time: {session.completedAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          session.type === 'gd' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {session.type === 'gd' ? 'Group Discussion' : 'Personal Interview'}
                        </span>
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                          Total: {
                            session.type === 'gd' 
                              ? session.evaluations?.reduce((total, e) => total + calculateGDTotalScore(e), 0) 
                              : calculatePITotalScore(session.evaluation)
                          }/{
                            session.type === 'gd' 
                              ? session.evaluations?.length * 100 
                              : 100
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {session.type === 'gd' ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-left">Chest No.</th>
                            <th className="px-4 py-3 text-left">Student</th>
                            {gdCategories.map(category => (
                              <th key={category.id} className="px-4 py-3 text-center">
                                {category.name} ({category.max})
                              </th>
                            ))}
                            <th className="px-4 py-3 text-center">Total</th>
                            <th className="px-4 py-3 text-left">Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {session.evaluations?.map((evaluationItem, index) => {
                            const student = findStudentInSession(session, {
                              studentId: evaluationItem.studentId,
                              studentEmail: evaluationItem.studentEmail,
                              chestNumber: evaluationItem.chestNumber,
                              studentName: evaluationItem.studentName
                            }) || {
                              name: evaluationItem.studentName || `Student ${index + 1}`,
                              chestNumber: evaluationItem.chestNumber || index + 1
                            };
                            
                            return (
                                <tr key={`eval-${index}`} className="bg-white">
                                  <td className="px-4 py-3 font-medium">#{student.chestNumber}</td>
                                  <td className="px-4 py-3">{student.name}</td>
                                  {gdCategories.map(category => (
                                    <td key={category.id} className="px-4 py-3 text-center">
                                      {calculateCategoryScore(evaluationItem, category.id)}/{category.max}
                                    </td>
                                  ))}
                                  <td className="px-4 py-3 text-center font-semibold">
                                      {calculateGDTotalScore(evaluationItem)}/100
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                                      <div className="line-clamp-2" title={evaluationItem.remarks}>
                                          {evaluationItem.remarks}
                                      </div>
                                  </td>
                                </tr>
                              );
                            })}
                          
                          {session.students
                          .filter(student => 
                            !session.evaluations?.some(evaluation => {
                              // match evaluation to student by id, email, chestNumber or name
                              if (student.id && evaluation.studentId && student.id === evaluation.studentId) return true;
                              if (student.email && evaluation.studentEmail && student.email === evaluation.studentEmail) return true;
                              if (student.chestNumber !== null && student.chestNumber !== undefined && evaluation.chestNumber !== undefined && +student.chestNumber === +evaluation.chestNumber) return true;
                              if (student.name && evaluation.studentName && student.name === evaluation.studentName) return true;
                              return false;
                            })
                          )
                          .map((student, index) => (
                            <tr key={`student-${index}`} className="bg-gray-50">
                              <td className="px-4 py-3 font-medium">#{student.chestNumber}</td>
                              <td className="px-4 py-3">{student.name}</td>
                              {gdCategories.map(category => (
                                <td key={category.id} className="px-4 py-3 text-center text-gray-400">
                                    -
                                </td>
                              ))}
                              <td className="px-4 py-3 text-center text-gray-400">-</td>
                              <td className="px-4 py-3 text-sm text-gray-400">Not evaluated</td>
                            </tr>
                        ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="font-medium mb-2">Candidate Evaluation</h3>
                          <div className="space-y-3">
                            {Object.entries(session.evaluation).map(([category, scores]) => (
                              category !== 'remarks' && category !== 'totalScore' && (
                                <div key={category} className="flex justify-between">
                                  <span className="text-gray-600">
                                    {categories.find(c => c.id === category)?.name || category}
                                  </span>
                                  <span className="font-medium">
                                    {Object.values(scores).reduce((a, b) => a + b, 0)}/
                                    {categories.find(c => c.id === category)?.max || 10}
                                  </span>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-medium mb-2">Remarks</h3>
                          <p className="text-gray-600 whitespace-pre-line">
                            {session.evaluation.remarks || 'No remarks provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}