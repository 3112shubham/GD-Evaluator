import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiUsers, FiBarChart2, FiCalendar, FiUser, FiActivity, FiPlay, FiClock, FiTrash2, FiLogOut, FiHome, FiAward } from 'react-icons/fi';

export default function Dashboard() {
  const [activeGDs, setActiveGDs] = useState([]);
  const [activePIs, setActivePIs] = useState([]);
  const [pastGDs, setPastGDs] = useState([]);
  const [pastPIs, setPastPIs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  // Logo URL
  const companyLogoUrl = "https://res.cloudinary.com/dcjmaapvi/image/upload/v1730120218/Gryphon_Academy_Bird_Logo_yzzl3q.png";

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

  const handleLogout = async () => {
    const confirmed = window.confirm('Are you sure you want to logout?');
    if (!confirmed) return;

    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-blue-800">Loading your sessions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Blue Theme Navbar */}
      <nav className="bg-gradient-to-r from-blue-800 to-blue-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <img 
                  className="h-10 w-10 mr-3" 
                  src={companyLogoUrl} 
                  alt="Gryphon Academy Logo" 
                />
                <span className="text-xl font-bold ">ASSESS HUB</span>
              </div>
              <div className="hidden md:ml-10 md:flex md:space-x-8">
                <Link to="/dashboard" className="border-b-2 border-white px-1 pt-1 text-sm font-medium flex items-center">
                  <FiHome className="mr-1" /> Dashboard
                </Link>
                <Link to="/evaluations" className="border-transparent hover:border-blue-300 border-b-2 px-1 pt-1 text-sm font-medium flex items-center">
                  <FiAward className="mr-1" /> Evaluations
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-md transition-colors"
              >
                <FiLogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">Welcome to Assess Hub</h1>
          <p className="text-blue-700">Manage your evaluation sessions and track participant progress</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Link 
            to="/new-gd" 
            className="bg-white p-6 rounded-xl shadow-md border border-blue-100 hover:border-blue-300 transition-all duration-300 hover:shadow-lg flex flex-col items-center justify-center group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            <div className="bg-blue-100 p-4 rounded-full mb-4 group-hover:bg-blue-200 transition-all">
              <FiUsers className="text-blue-600 text-2xl" />
            </div>
            <span className="font-semibold text-blue-800 group-hover:text-blue-900 transition-colors">New GD Session</span>
            <p className="text-sm text-blue-600 mt-2 text-center">Create a new group discussion evaluation session</p>
          </Link>
          
          <Link 
            to="/evaluations" 
            className="bg-white p-6 rounded-xl shadow-md border border-blue-100 hover:border-blue-300 transition-all duration-300 hover:shadow-lg flex flex-col items-center justify-center group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            <div className="bg-blue-100 p-4 rounded-full mb-4 group-hover:bg-blue-200 transition-all">
              <FiBarChart2 className="text-blue-600 text-2xl" />
            </div>
            <span className="font-semibold text-blue-800 group-hover:text-blue-900 transition-colors">View Evaluations</span>
            <p className="text-sm text-blue-600 mt-2 text-center">Review past evaluation results and analytics</p>
          </Link>
          
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-xl shadow-md text-white flex flex-col justify-center">
            <h3 className="font-bold text-lg mb-2">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{activeGDs.length + activePIs.length}</div>
                <div className="text-sm">Active Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{pastGDs.length + pastPIs.length}</div>
                <div className="text-sm">Completed</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Active GD Sessions */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-blue-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-3 text-blue-900">
                <div className="bg-blue-100 p-2 rounded-full">
                  <FiActivity className="text-blue-600" size={20} />
                </div>
                Active GD Sessions
              </h2>
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">
                {activeGDs.length} Active
              </span>
            </div>
            
            {activeGDs.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-blue-200 rounded-lg bg-blue-50">
                <FiActivity className="mx-auto text-blue-300 mb-3" size={32} />
                <p className="text-blue-600">No active GD sessions</p>
                <Link 
                  to="/new-gd"
                  className="inline-block mt-3 text-blue-700 hover:text-blue-800 text-sm font-medium"
                >
                  Create your first session →
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {activeGDs.map(gd => (
                  <div 
                    key={gd.id} 
                    className="p-5 border border-blue-100 rounded-lg hover:border-blue-300 transition-all duration-300 hover:shadow-sm bg-gradient-to-r from-white to-blue-50"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-blue-900">{gd.groupName || 'Untitled Group'}</h3>
                        <p className="text-sm text-blue-700 mt-1">
                          {gd.topic} 
                        </p>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-medium">
                        {gd.date}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-blue-600">
                        {gd.participants?.length || 0} participants
                      </div>
                      <Link 
                        to={`/gd/${gd.id}`}
                        className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md"
                      >
                        <FiPlay size={16} />
                        Continue Evaluation
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past GD Sessions */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-blue-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-3 text-blue-900">
                <div className="bg-blue-100 p-2 rounded-full">
                  <FiClock className="text-blue-600" size={20} />
                </div>
                Past GD Sessions
              </h2>
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">
                {pastGDs.length} Completed
              </span>
            </div>
            
            {pastGDs.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-blue-200 rounded-lg bg-blue-50">
                <FiClock className="mx-auto text-blue-300 mb-3" size={32} />
                <p className="text-blue-600">No past GD sessions yet</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {pastGDs.map(gd => (
                  <div 
                    key={gd.id} 
                    className="p-5 border border-blue-100 rounded-lg hover:border-blue-300 transition-all duration-300 bg-gradient-to-r from-white to-blue-50"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-blue-900">{gd.groupName || 'Untitled Group'}</h3>
                        <p className="text-sm text-blue-700 mt-1">
                          {gd.topic} 
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-medium">
                          Created: {gd.date}
                        </span>
                        <span className="text-xs bg-green-100 text-green-800 px-2.5 py-1 rounded-full font-medium">
                          Completed: {gd.completedDate}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-blue-600">
                        {gd.evaluations?.length || 0} evaluations completed
                      </div>
                      <div className="flex gap-2">
                        <Link 
                          to={`/gd/${gd.id}`}
                          className="text-sm text-blue-700 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 font-medium transition-colors"
                        >
                          View Results
                        </Link>
                        <button
                          onClick={() => confirmDeleteGD(gd.id)}
                          disabled={deletingId === gd.id}
                          className="text-sm text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 font-medium transition-colors flex items-center gap-1"
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