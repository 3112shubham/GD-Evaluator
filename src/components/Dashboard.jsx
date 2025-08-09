import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import { FiPlus, FiUsers, FiBarChart2 } from 'react-icons/fi';

export default function Dashboard() {
  const [activeGDs, setActiveGDs] = useState([]);
  const [pastGDs, setPastGDs] = useState([]);

  useEffect(() => {
    // Fetch active GDs (where completed is false)
    const qActive = query(collection(db, 'gds'), where('completed', '==', false));
    const unsubscribeActive = onSnapshot(qActive, (snapshot) => {
      const gds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActiveGDs(gds);
    });

    // Fetch past GDs (where completed is true)
    const qPast = query(collection(db, 'gds'), where('completed', '==', true));
    const unsubscribePast = onSnapshot(qPast, (snapshot) => {
      const gds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPastGDs(gds);
    });

    return () => {
      unsubscribeActive();
      unsubscribePast();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">GD Evaluation Dashboard</h1>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Link to="/new-gd" className="bg-white p-4 rounded-lg shadow flex items-center justify-center flex-col hover:bg-blue-50 transition">
            <FiPlus className="text-2xl mb-2 text-blue-500" />
            <span>New GD Session</span>
          </Link>
          <Link to="/evaluations" className="bg-white p-4 rounded-lg shadow flex items-center justify-center flex-col hover:bg-blue-50 transition">
            <FiBarChart2 className="text-2xl mb-2 text-blue-500" />
            <span>View Evaluations</span>
          </Link>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Active GD Sessions</h2>
          {activeGDs.length === 0 ? (
            <p className="text-gray-500">No active GD sessions</p>
          ) : (
            <div className="grid gap-4">
              {activeGDs.map(gd => (
                <Link 
                  key={gd.id} 
                  to={`/gd/${gd.id}`}
                  className="bg-white p-4 rounded-lg shadow hover:shadow-md transition"
                >
                  <h3 className="font-medium">{gd.topic}</h3>
                  <p className="text-sm text-gray-500">{gd.students.length} participants</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Past GD Sessions</h2>
          {pastGDs.length === 0 ? (
            <p className="text-gray-500">No past GD sessions</p>
          ) : (
            <div className="grid gap-4">
              {pastGDs.map(gd => (
                <Link 
                  key={gd.id} 
                  to={`/gd/${gd.id}`}
                  className="bg-white p-4 rounded-lg shadow hover:shadow-md transition"
                >
                  <h3 className="font-medium">{gd.topic}</h3>
                  <p className="text-sm text-gray-500">{gd.students.length} participants</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}