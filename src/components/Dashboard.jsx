import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Link } from 'react-router-dom';
import { FiPlus, FiUsers, FiBarChart2, FiCalendar } from 'react-icons/fi';

export default function Dashboard() {
  const [activeGDs, setActiveGDs] = useState([]);
  const [pastGDs, setPastGDs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    // Active GDs query
    const qActive = query(
      collection(db, 'gds'), 
      where('completed', '==', false),
      where('trainerId', '==', auth.currentUser.uid)
    );
    
    // Past GDs query
    const qPast = query(
      collection(db, 'gds'), 
      where('completed', '==', true),
      where('trainerId', '==', auth.currentUser.uid)
    );

    const unsubscribeActive = onSnapshot(qActive, (snapshot) => {
      const gds = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        date: doc.data().createdAt?.toDate().toLocaleDateString() 
      }));
      setActiveGDs(gds);
      setLoading(false);
    });

    const unsubscribePast = onSnapshot(qPast, (snapshot) => {
      const gds = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        date: doc.data().createdAt?.toDate().toLocaleDateString() 
      }));
      setPastGDs(gds);
    });

    return () => {
      unsubscribeActive();
      unsubscribePast();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">GD Evaluation Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link 
            to="/new-gd" 
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 transition flex flex-col items-center justify-center hover:bg-blue-50"
          >
            <div className="bg-blue-100 p-3 rounded-full mb-3">
              <FiPlus className="text-blue-600 text-2xl" />
            </div>
            <span className="font-medium">New GD Session</span>
          </Link>
          <Link 
            to="/new-gd" 
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 transition flex flex-col items-center justify-center hover:bg-blue-50"
          >
            <div className="bg-blue-100 p-3 rounded-full mb-3">
              <FiPlus className="text-blue-600 text-2xl" />
            </div>
            <span className="font-medium">New PI Session</span>
          </Link>
          <Link 
            to="/evaluations" 
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 transition flex flex-col items-center justify-center hover:bg-blue-50"
          >
            <div className="bg-blue-100 p-3 rounded-full mb-3">
              <FiBarChart2 className="text-blue-600 text-2xl" />
            </div>
            <span className="font-medium">View Evaluations</span>
          </Link>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FiUsers className="text-gray-500" /> Active GD Sessions
            </h2>
            {activeGDs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No active GD sessions</p>
            ) : (
              <div className="grid gap-4">
                {activeGDs.map(gd => (
                  <Link 
                    key={gd.id} 
                    to={`/gd/${gd.id}`}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition hover:bg-blue-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{gd.topic}</h3>
                        <p className="text-sm text-gray-500">{gd.batch} • {gd.students.length} participants</p>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {gd.date}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FiCalendar className="text-gray-500" /> Past GD Sessions
            </h2>
            {pastGDs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No past GD sessions</p>
            ) : (
              <div className="grid gap-4">
                {pastGDs.map(gd => (
                  <Link 
                    key={gd.id} 
                    to={`/gd/${gd.id}`}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition hover:bg-blue-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{gd.topic}</h3>
                        <p className="text-sm text-gray-500">{gd.batch} • {gd.students.length} participants</p>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                        {gd.date}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}