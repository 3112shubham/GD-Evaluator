// src/components/Evaluations.jsx
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';

const categories = [
  {
    id: 'introduction',
    name: 'Introduction'
  },
  {
    id: 'internship',
    name: 'Internship/Experience'
  },
  {
    id: 'bodyLanguage',
    name: 'Body Language'
  },
  {
    id: 'domainKnowledge',
    name: 'Domain Knowledge'
  },
  {
    id: 'starMethod',
    name: 'STAR Method'
  },
  {
    id: 'crispness',
    name: 'Crispness of Answers'
  },
  {
    id: 'situational',
    name: 'Situational Handling'
  },
  {
    id: 'jdAwareness',
    name: 'JD Awareness'
  },
  {
    id: 'industry',
    name: 'Industry Awareness'
  },
  {
    id: 'personality',
    name: 'Personality Fitment'
  }
];

const calculateCategoryScore = (evaluation, category) => {
  if (!evaluation.scores?.[category]) return 0;
  return Object.values(evaluation.scores[category]).reduce((a, b) => a + b, 0);
};

const calculateGDTotalScore = (evaluation) => {
  const categories = ['opening', 'speaking', 'teamwork', 'engagement', 'closing'];
  return categories.reduce((total, category) => {
    return total + (evaluation.scores?.[category] 
      ? Object.values(evaluation.scores[category]).reduce((a, b) => a + b, 0)
      : 0);
  }, 0);
};

const calculatePITotalScore = (evaluation) => {
  return categories.reduce((total, category) => {
    return total + (evaluation[category.id] 
      ? Object.values(evaluation[category.id]).reduce((a, b) => a + b, 0)
      : 0);
  }, 0);
};

export default function Evaluations() {
  const [sessions, setSessions] = useState([]);
  const [filter, setFilter] = useState({
    type: '',
    batch: '',
    dateFrom: '',
    dateTo: ''
  });
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    
    const constraints = [
      where('trainerId', '==', auth.currentUser.uid),
      where('completed', '==', true),
      orderBy('completedAt', 'desc')
    ];
    
    if (filter.type) constraints.push(where('type', '==', filter.type));
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
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionsData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate() 
      }));
      
      // Extract unique batches
      const allBatches = [...new Set(sessionsData.map(s => 
        s.type === 'gd' ? s.batch : s.candidate.batch
      ))];
      setBatches(allBatches.filter(b => b));
      
      setSessions(sessionsData);
      setLoading(false);
    });

    return unsubscribe;
  }, [filter]);

  const resetFilters = () => {
    setFilter({
      type: '',
      batch: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Evaluation History</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <label className="block text-sm text-gray-600 mb-1">Batch</label>
              <select
                value={filter.batch}
                onChange={(e) => setFilter({...filter, batch: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">All Batches</option>
                {batches.map(batch => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
              </select>
            </div>
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
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg transition"
              >
                Reset Filters
              </button>
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
            {sessions.map(session => (
              <div key={session.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">
                        {session.type === 'gd' 
                          ? session.topic 
                          : `${session.candidate.name} - ${session.candidate.position}`}
                      </h2>
                      <p className="text-gray-600">
                        {session.type === 'gd' ? 'GD' : 'PI'} • 
                        Batch: {session.type === 'gd' ? session.batch : session.candidate.batch} • 
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
                          <th className="px-4 py-3 text-left">Student</th>
                          <th className="px-4 py-3 text-center">Opening</th>
                          <th className="px-4 py-3 text-center">Speaking</th>
                          <th className="px-4 py-3 text-center">Teamwork</th>
                          <th className="px-4 py-3 text-center">Engagement</th>
                          <th className="px-4 py-3 text-center">Closing</th>
                          <th className="px-4 py-3 text-center">Total</th>
                          <th className="px-4 py-3 text-left">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.evaluations?.map((evaluation, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 font-medium">{evaluation.studentName}</td>
                            <td className="px-4 py-3 text-center">
                              {calculateCategoryScore(evaluation, 'opening')}/20
                            </td>
                            <td className="px-4 py-3 text-center">
                              {calculateCategoryScore(evaluation, 'speaking')}/25
                            </td>
                            <td className="px-4 py-3 text-center">
                              {calculateCategoryScore(evaluation, 'teamwork')}/20
                            </td>
                            <td className="px-4 py-3 text-center">
                              {calculateCategoryScore(evaluation, 'engagement')}/10
                            </td>
                            <td className="px-4 py-3 text-center">
                              {calculateCategoryScore(evaluation, 'closing')}/20
                            </td>
                            <td className="px-4 py-3 text-center font-semibold">
                              {calculateGDTotalScore(evaluation)}/100
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                              <div className="line-clamp-2" title={evaluation.remarks}>
                                {evaluation.remarks}
                              </div>
                            </td>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}