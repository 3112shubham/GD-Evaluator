// src/components/Evaluations.jsx
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, getDocs, limit, startAfter } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Link } from 'react-router-dom';
import { FiEdit, FiArrowUp } from 'react-icons/fi';

const ITEMS_PER_PAGE = 5;

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
  { id: 'communication', name: 'Communication', max: 10 },
  { id: 'participation', name: 'Participation', max: 10 },
  { id: 'teamwork', name: 'Teamwork', max: 10 },
  { id: 'confidence', name: 'Confidence', max: 10 },
  { id: 'contentKnowledge', name: 'Content Knowledge', max: 10 }
];

const calculateCategoryScore = (evaluation, categoryId) => {
  // For new flat score structure
  return evaluation.scores?.[categoryId] || 0;
};

const calculateGDTotalScore = (evaluation) => {
  return gdCategories.reduce((total, category) => {
    return total + (evaluation.scores?.[category.id] || 0);
  }, 0);
};

export default function Evaluations({ hideNavbar = false }) {
  const [sessions, setSessions] = useState([]);
  const [displayedSessions, setDisplayedSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [filter, setFilter] = useState({
    project: '',
    campus: '',
    course: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const projectsSnap = await getDocs(collection(db, 'projects'));
        const projectsList = projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProjects(projectsList);

        // Fetch all campuses from all projects
        let allCampuses = [];
        for (const project of projectsList) {
          const campusesRef = collection(db, 'projects', project.id, 'campuses');
          const campusesSnap = await getDocs(campusesRef);
          allCampuses = [...allCampuses, ...campusesSnap.docs.map(doc => ({
            id: doc.id,
            projectId: project.id,
            ...doc.data()
          }))];
        }
        setCampuses(allCampuses);
      } catch (err) {
        console.error("Error fetching data: ", err);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    setPage(0);
    setDisplayedSessions([]);
    
    const constraints = [
      where('trainerId', '==', auth.currentUser.uid),
      where('completed', '==', true),
      where('type', '==', 'gd'),
      orderBy('completedAt', 'desc')
    ];
    
    if (filter.project) constraints.push(where('projectId', '==', filter.project));
    if (filter.campus) constraints.push(where('campusId', '==', filter.campus));
    if (filter.course) constraints.push(where('course', '==', filter.course));
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
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionsData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate(),
        students: doc.data().students?.map(s => ({
          id: s.id || s.studentId || s.studentIdString || undefined,
          name: s.name || s.studentName || (s.student?.name) || 'Unknown Student',
          email: s.email || s.studentEmail || (s.student?.email) || undefined,
          chestNumber: typeof s.chestNumber !== 'undefined' ? s.chestNumber : (s.chestNo || s.chest || null)
        })) || []
      }));
      
      setSessions(sessionsData);
      setDisplayedSessions(sessionsData.slice(0, ITEMS_PER_PAGE));
      setHasMore(sessionsData.length > ITEMS_PER_PAGE);
      setLoading(false);
    });

    return unsubscribe;
  }, [filter]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadMore = () => {
    const nextPage = page + 1;
    const start = nextPage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const newItems = sessions.slice(start, end);
    
    if (newItems.length > 0) {
      setDisplayedSessions([...displayedSessions, ...newItems]);
      setPage(nextPage);
      // Check if there are more items remaining after this batch
      setHasMore(end < sessions.length);
    }
  };

  const resetFilters = () => {
    setFilter({
      project: '',
      campus: '',
      course: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  // helper to find student in a session by id/email/chestNumber/name
  const findStudentInSession = (session, { studentId, studentEmail, chestNumber, studentName } = {}) => {
    if (!session || !session.students) return null;

    if (studentId) {
      const byId = session.students.find(s => s.id && s.id === studentId);
      if (byId) return byId;
    }

    if (studentEmail) {
      const byEmail = session.students.find(s => s.email && s.email === studentEmail);
      if (byEmail) return byEmail;
    }

    if (typeof chestNumber !== 'undefined' && chestNumber !== null) {
      const byChest = session.students.find(s => s.chestNumber !== null && s.chestNumber !== undefined && +s.chestNumber === +chestNumber);
      if (byChest) return byChest;
    }

    if (studentName) {
      const byName = session.students.find(s => s.name && s.name === studentName);
      if (byName) return byName;
    }

    return null;
  };

  const filteredCampuses = filter.project 
    ? campuses.filter(c => c.projectId === filter.project) 
    : [];

  const courseNames = filter.campus
    ? Object.keys(campuses.find(c => c.id === filter.campus)?.courses || {})
    : [];

  return (
    <div className={hideNavbar ? "p-4" : "min-h-screen bg-gray-100 p-4"}>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Evaluation History</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Project</label>
              <select
                value={filter.project}
                onChange={(e) => setFilter({
                  ...filter, 
                  project: e.target.value,
                  campus: '',
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
                    course: ''
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
            
            {filter.campus && courseNames.length > 0 && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">Course</label>
                <select
                  value={filter.course}
                  onChange={(e) => setFilter({...filter, course: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">All Courses</option>
                  {courseNames.map(course => (
                    <option key={course} value={course}>
                      {course}
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
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={resetFilters}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg transition"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p>Loading evaluations...</p>
          </div>
        ) : displayedSessions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p>No evaluations found matching your criteria</p>
          </div>
        ) : (
          <div className="space-y-6">
            {displayedSessions.map(session => (
              <div key={session.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">
                        {session.groupName} - {session.topic}
                      </h2>
                      <p className="text-gray-600">
                        GD • 
                        {session.projectId && ` Project: ${projects.find(p => p.id === session.projectId)?.code || ''}`} • 
                        {session.campusId && ` Campus: ${campuses.find(c => c.id === session.campusId)?.name || ''}`} • 
                        {session.course && ` Course: ${session.course}`} • 
                        Date: {session.completedAt?.toLocaleDateString()} • 
                        Time: {session.completedAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                        GD
                      </span>
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                        Total: {
                          session.evaluations?.reduce((total, e) => total + calculateGDTotalScore(e), 0) 
                        }/{session.evaluations?.length * 50}
                      </span>
                      <Link
                        to={`/gd/${session.id}`}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1"
                      >
                        <FiEdit size={14} /> Edit
                      </Link>
                    </div>
                  </div>
                </div>

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
                        {/* First show evaluated students - deduplicated by chest number */}
                        {(() => {
                          const seenChestNumbers = new Set();
                          return session.evaluations?.filter(evaluationItem => {
                            const chestNo = evaluationItem.chestNumber;
                            if (seenChestNumbers.has(chestNo)) return false;
                            seenChestNumbers.add(chestNo);
                            return true;
                          }).map((evaluationItem, index) => {
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
                                <td className="px-4 py-3 font-medium">#{evaluationItem.chestNumber}</td>
                                <td className="px-4 py-3">{student.name}</td>
                                {gdCategories.map(category => (
                                  <td key={category.id} className="px-4 py-3 text-center">
                                    {calculateCategoryScore(evaluationItem, category.id)}/{category.max}
                                  </td>
                                ))}
                                <td className="px-4 py-3 text-center font-semibold">
                                    {calculateGDTotalScore(evaluationItem)}/50
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                                    <div className="line-clamp-2" title={evaluationItem.remarks}>
                                        {evaluationItem.remarks}
                                    </div>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                        
                        {/* Then show unevaluated students */}
                        {session.students
                        .filter(student => 
                          !session.evaluations?.some(evaluation => {
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
              </div>
            ))}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-800 transition"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Scroll to Top Button */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white p-3 rounded-full shadow-lg transition-all duration-300 z-50"
            title="Scroll to top"
          >
            <FiArrowUp size={24} />
          </button>
        )}
      </div>
    </div>
  );
}