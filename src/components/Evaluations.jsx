import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function Evaluations() {
  const [evaluations, setEvaluations] = useState([]);
  const [filter, setFilter] = useState({
    batch: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    let q = query(collection(db, 'gds'), where('completed', '==', true));
    
    if (filter.batch) {
      q = query(q, where('batch', '==', filter.batch));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvaluations(gds);
    });

    return unsubscribe;
  }, [filter.batch]);

  const calculateTotalScore = (evaluation) => {
    const scores = evaluation.scores;
    return (
      scores.opening.initiation +
      scores.facts.relevance +
      scores.facts.knowledge +
      scores.facts.examples +
      scores.facts.grammar +
      scores.speaking.vocabulary +
      scores.speaking.flow +
      scores.speaking.confidence +
      scores.teamwork.questions +
      scores.teamwork.participation +
      scores.teamwork.behavior +
      scores.teamwork.perspectives +
      scores.depth.awareness +
      scores.depth.bodyLanguage +
      scores.depth.counterviews +
      scores.closing.conclusion +
      scores.closing.summary +
      scores.closing.confidence
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">GD Evaluations</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Batch</label>
              <select
                value={filter.batch}
                onChange={(e) => setFilter({...filter, batch: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">All Batches</option>
                <option value="Batch 1">Batch 1</option>
                <option value="Batch 2">Batch 2</option>
                <option value="Batch 3">Batch 3</option>
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
          </div>
        </div>

        {evaluations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p>No evaluations found matching your criteria</p>
          </div>
        ) : (
          <div className="space-y-6">
            {evaluations.map(gd => (
              <div key={gd.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">{gd.topic}</h2>
                    <p className="text-gray-600">Batch: {gd.batch} | {gd.createdAt?.toDate().toLocaleDateString()}</p>
                  </div>
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {gd.evaluations.length} participants
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left">Student</th>
                        <th className="px-4 py-2">Total Score</th>
                        <th className="px-4 py-2">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gd.evaluations.map((evaluation, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2">{evaluation.studentName}</td>
                          <td className="px-4 py-2 text-center">{calculateTotalScore(evaluation)}</td>
                          <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">{eval.remarks}</td>
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