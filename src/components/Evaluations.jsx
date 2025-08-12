// src/components/Evaluations.jsx
import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';

// Calculate scores outside component to avoid re-declaration
const calculateCategoryScore = (evaluation, categoryId) => {
  return evaluation.scores?.[categoryId] 
    ? Object.values(evaluation.scores[categoryId]).reduce((a, b) => a + b, 0)
    : 0;
};

const calculateTotalScore = (evaluation) => {
  if (!evaluation.scores) return 0;
  return ['opening', 'speaking', 'teamwork', 'engagement', 'closing'].reduce(
    (total, category) => total + calculateCategoryScore(evaluation, category), 0
  );
};

const getCategoryMax = (categoryId) => {
  const maxValues = { opening: 20, speaking: 25, teamwork: 20, engagement: 10, closing: 20 };
  return maxValues[categoryId] || 0;
};

export default function Evaluations() {
  const [evaluations, setEvaluations] = useState([]);
  const [filter, setFilter] = useState({ batch: '', dateFrom: '', dateTo: '' });
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);

  // Extract unique batches
  useEffect(() => {
    if (evaluations.length > 0) {
      const uniqueBatches = [...new Set(evaluations.map(gd => gd.batch))];
      setBatches(uniqueBatches);
    }
  }, [evaluations]);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    
    const constraints = [
      where('trainerId', '==', auth.currentUser.uid),
      where('completed', '==', true),
      orderBy('completedAt', 'desc')
    ];
    
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

    const q = query(collection(db, 'gds'), ...constraints);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvaluations(snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate() 
      })));
      setLoading(false);
    });

    return unsubscribe;
  }, [filter]);

  const resetFilters = () => {
    setFilter({ batch: '', dateFrom: '', dateTo: '' });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Your GD Evaluations</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        ) : evaluations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p>No evaluations found matching your criteria</p>
          </div>
        ) : (
          <div className="space-y-6">
            {evaluations.map(gd => (
              <div key={gd.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">{gd.topic}</h2>
                      <p className="text-gray-600">
                        Batch: {gd.batch} | 
                        Date: {gd.completedAt?.toLocaleDateString()} | 
                        Time: {gd.completedAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                        {gd.evaluations?.length || 0} participants
                      </span>
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                        Total Duration: {gd.duration || 'N/A'} mins
                      </span>
                    </div>
                  </div>
                </div>

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
                      {gd.evaluations?.map((evaluation, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 font-medium">{evaluation.studentName}</td>
                          <td className="px-4 py-3 text-center">
                            {calculateCategoryScore(evaluation, 'opening')}/{getCategoryMax('opening')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {calculateCategoryScore(evaluation, 'speaking')}/{getCategoryMax('speaking')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {calculateCategoryScore(evaluation, 'teamwork')}/{getCategoryMax('teamwork')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {calculateCategoryScore(evaluation, 'engagement')}/{getCategoryMax('engagement')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {calculateCategoryScore(evaluation, 'closing')}/{getCategoryMax('closing')}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold">
                            {calculateTotalScore(evaluation)}/100
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}