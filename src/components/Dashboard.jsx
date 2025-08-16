import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiUsers, FiBarChart2, FiCalendar, FiUser, FiActivity, FiPlay, FiClock, FiTrash2 } from 'react-icons/fi';

export default function Dashboard() {
  const [activeGDs, setActiveGDs] = useState([]);
  const [activePIs, setActivePIs] = useState([]);
  const [pastGDs, setPastGDs] = useState([]);
  const [pastPIs, setPastPIs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const unsubscribeActiveGD = onSnapshot(
      query(
        collection(db, 'sessions'), 
        where('type', '==', 'gd'),
        where('completed', '==', false),
        where('isActive', '==', true),
        where('trainerId', '==', auth.currentUser.uid)
      ), 
      (snapshot) => {
        setActiveGDs(snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          date: doc.data().createdAt?.toDate().toLocaleDateString() 
        })));
        setLoading(false);
      }
    );

    const unsubscribeActivePI = onSnapshot(
      query(
        collection(db, 'sessions'), 
        where('type', '==', 'pi'),
        where('completed', '==', false),
        where('trainerId', '==', auth.currentUser.uid)
      ), 
      (snapshot) => {
        setActivePIs(snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          date: doc.data().createdAt?.toDate().toLocaleDateString() 
        })));
      }
    );

    const unsubscribePastGD = onSnapshot(
      query(
        collection(db, 'sessions'), 
        where('type', '==', 'gd'),
        where('completed', '==', true),
        where('trainerId', '==', auth.currentUser.uid)
      ), 
      (snapshot) => {
        setPastGDs(snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          date: doc.data().createdAt?.toDate().toLocaleDateString(),
          completedDate: doc.data().completedAt?.toDate().toLocaleDateString()
        })));
      }
    );

    const unsubscribePastPI = onSnapshot(
      query(
        collection(db, 'sessions'), 
        where('type', '==', 'pi'),
        where('completed', '==', true),
        where('trainerId', '==', auth.currentUser.uid)
      ), 
      (snapshot) => {
        setPastPIs(snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          date: doc.data().createdAt?.toDate().toLocaleDateString(),
          completedDate: doc.data().completedAt?.toDate().toLocaleDateString()
        })));
      }
    );

    return () => {
      unsubscribeActiveGD();
      unsubscribeActivePI();
      unsubscribePastGD();
      unsubscribePastPI();
    };
  }, []);

  const activateGD = async (gdId) => {
    try {
      await updateDoc(doc(db, 'sessions', gdId), {
        isActive: true
      });
      navigate(`/gd/${gdId}`);
    } catch (err) {
      console.error("Error activating GD: ", err);
    }
  };

  const confirmDeleteGD = async (gdId) => {
    if (window.confirm('Are you sure you want to delete this GD session? This action cannot be undone.')) {
      await deleteGD(gdId);
    }
  };

  const deleteGD = async (gdId) => {
    try {
      setDeletingId(gdId);
      await deleteDoc(doc(db, 'sessions', gdId));
      alert('GD session deleted successfully');
    } catch (err) {
      console.error("Error deleting GD session: ", err);
      alert('Failed to delete GD session');
    } finally {
      setDeletingId(null);
    }
  };

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
        <h1 className="text-2xl font-bold mb-6">Evaluation Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link 
            to="/new-gd" 
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 transition flex flex-col items-center justify-center hover:bg-blue-50"
          >
            <div className="bg-blue-100 p-3 rounded-full mb-3">
              <FiUsers className="text-blue-600 text-2xl" />
            </div>
            <span className="font-medium">New GD Session</span>
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

        <div className="space-y-8">
          {/* Active GD Sessions */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FiActivity className="text-gray-500" /> Active GD Sessions
            </h2>
            {activeGDs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No active GD sessions</p>
            ) : (
              <div className="grid gap-4">
                {activeGDs.map(gd => (
                  <div 
                    key={gd.id} 
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition hover:bg-blue-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{gd.groupName || 'Untitled Group'}</h3>
                        <p className="text-sm text-gray-500">
                          {gd.topic} 
                        </p>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {gd.date}
                      </span>
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <Link 
                        to={`/gd/${gd.id}`}
                        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Continue Evaluation
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past GD Sessions */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FiClock className="text-gray-500" /> Past GD Sessions
            </h2>
            {pastGDs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No past GD sessions</p>
            ) : (
              <div className="grid gap-4">
                {pastGDs.map(gd => (
                  <div 
                    key={gd.id} 
                    className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{gd.groupName || 'Untitled Group'}</h3>
                        <p className="text-sm text-gray-500">
                          {gd.topic} • {gd.evaluations?.length || 0} participants
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full mb-1">
                          Created: {gd.date}
                        </span>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Completed: {gd.completedDate}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <Link 
                        to={`/gd/${gd.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1 rounded hover:bg-blue-50"
                      >
                        View Results
                      </Link>
                      <button
                        onClick={() => confirmDeleteGD(gd.id)}
                        disabled={deletingId === gd.id}
                        className="text-sm text-red-600 hover:text-red-800 px-3 py-1 rounded hover:bg-red-50 flex items-center gap-1"
                      >
                        {deletingId === gd.id ? (
                          'Deleting...'
                        ) : (
                          <>
                            <FiTrash2 size={14} /> Delete
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}