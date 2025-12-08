import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';
import { FiArrowUp } from 'react-icons/fi';

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

export default function AdminEvaluations() {
  const [sessions, setSessions] = useState([]);
  const [displayedSessions, setDisplayedSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [batches, setBatches] = useState([]);
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

        // Fetch trainers
        const trainersSnap = await getDocs(collection(db, 'trainers'));
        setTrainers(trainersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch specializations
        const specializationsSnap = await getDocs(collection(db, 'specializations'));
        setSpecializations(specializationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching data: ", err);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    setLoading(true);
    setPage(0);
    setDisplayedSessions([]);
    
    try {
      const constraints = [
        where('completed', '==', true),
        where('type', '==', 'gd')
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
      
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const sessionsData = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            completedAt: doc.data().completedAt?.toDate()
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
          setDisplayedSessions(sessionsData.slice(0, ITEMS_PER_PAGE));
          setHasMore(sessionsData.length > ITEMS_PER_PAGE);
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

  const resetFilters = () => {
    setFilter({
      project: '',
      campus: '',
      course: '',
      dateFrom: '',
      dateTo: ''
    });
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

  // Helper to validate if export is enabled
  const isExportEnabled = () => {
    // Check if project is selected
    if (!filter.project) return false;
    
    // Both dates must be selected
    if (!filter.dateFrom || !filter.dateTo) return false;
    
    // Validate max 7 days
    const fromDate = new Date(filter.dateFrom);
    const toDate = new Date(filter.dateTo);
    const diffTime = Math.abs(toDate - fromDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 7) return false;
    
    return sessions.length > 0;
  };

  const exportToExcel = () => {
    const excelData = sessions.flatMap(session => {
      const project = projects.find(p => p.id === session.projectId) || { code: '', name: '' };
      const campus = campuses.find(c => c.id === session.campusId) || { name: '' };
      const trainer = trainers.find(t => t.userId === session.trainerId) || { name: 'Unknown' };

      return session.evaluations?.map(evaluation => {
        return {
          'Name': evaluation.studentName || 'Unknown Student',
          'Email': evaluation.studentEmail || '',
          ...gdCategories.reduce((acc, category) => {
            acc[category.name] = calculateCategoryScore(evaluation, category.id);
            return acc;
          }, {}),
          'Total(out of 50)': calculateGDTotalScore(evaluation),
          'Remarks': evaluation.remarks || '',
          'Group Name': session.groupName,
          'Topic': session.topic,
          'Project': evaluation.projectCode ? `${evaluation.projectCode} - ${project.name}` : `${project.code} - ${project.name}`,
          'Campus': evaluation.campusName || campus.name,
          'Course': session.course || '',
          'Specialization': evaluation.specialization || '',
          'Trainer Name': trainer.name,
          'Date': session.completedAt?.toLocaleDateString(),
          'Time': session.completedAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      }) || [];
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

  const courseNames = filter.campus
    ? Object.keys(campuses.find(c => c.id === filter.campus)?.courses || {})
    : [];

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">All Evaluations</h1>
        
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
          
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={resetFilters}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg transition"
            >
              Reset Filters
            </button>
            <div className="relative group">
              <button
                onClick={exportToExcel}
                disabled={!isExportEnabled()}
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  !filter.project ? 'Please select a project' :
                  !filter.dateFrom || !filter.dateTo ? 'Please select both from and to dates' :
                  filter.dateFrom && filter.dateTo && Math.ceil(Math.abs(new Date(filter.dateTo) - new Date(filter.dateFrom)) / (1000 * 60 * 60 * 24)) > 7 ? 'Date range must not exceed 7 days' :
                  sessions.length === 0 ? 'No evaluations to export' :
                  'Export data to Excel'
                }
              >
                Export to Excel
              </button>
              {!isExportEnabled() && (
                <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-800 text-white text-sm p-2 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none">
                  {!filter.project && 'Select a project to enable export'}
                  {filter.project && (!filter.dateFrom || !filter.dateTo) && 'Select both from and to dates'}
                  {filter.dateFrom && filter.dateTo && Math.ceil(Math.abs(new Date(filter.dateTo) - new Date(filter.dateFrom)) / (1000 * 60 * 60 * 24)) > 7 && 'Date range must not exceed 7 days'}
                  {sessions.length === 0 && 'No evaluations to export'}
                </div>
              )}
            </div>
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
            {displayedSessions.map(session => {
              
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
                        {session.course && ` Course: ${session.course}`} • 
                        Date: {session.completedAt?.toLocaleDateString()} • 
                        Time: {session.completedAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                          Group Discussion
                        </span>
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                          Total: {
                            session.evaluations?.reduce((total, e) => total + calculateGDTotalScore(e), 0) 
                          }/{session.evaluations?.length * 50}
                        </span>
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
                        {session.evaluations?.map((evaluationItem, index) => (
                          <tr key={`eval-${index}`} className="bg-white">
                            <td className="px-4 py-3 font-medium">#{evaluationItem.chestNumber}</td>
                            <td className="px-4 py-3">{evaluationItem.studentName}</td>
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
                          ))}
                        </tbody>
                      </table>
                    </div>
                </div>
              );
            })}
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