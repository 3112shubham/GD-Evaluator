import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useParams } from 'react-router-dom';
import { FiCheck, FiAlertCircle } from 'react-icons/fi';

export default function GDVolunteer() {
  const { linkId } = useParams();
  const sessionId = linkId;

  // Form state
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');

  // Session state
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  // Fetch session details on mount
  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) {
        setError('Invalid session link');
        setLoading(false);
        return;
      }

      try {
        const sessionRef = doc(db, 'sessions', sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
          setError('Session not found or has expired');
          setLoading(false);
          return;
        }

        const sessionData = sessionSnap.data();
        
        // Check if session is still active
        if (!sessionData.isActive) {
          setError('This GD session is no longer active');
          setLoading(false);
          return;
        }

        setSession({ id: sessionId, ...sessionData });
        setLoading(false);
      } catch (err) {
        console.error('Error fetching session:', err);
        setError('Failed to load session details');
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!studentName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!studentEmail.trim()) {
      alert('Please enter your email');
      return;
    }

    if (!selectedSpecialization) {
      alert('Please select a specialization');
      return;
    }

    setSubmitting(true);
    try {
      const newStudent = {
        name: studentName.trim(),
        email: studentEmail.trim(),
        specialization: selectedSpecialization,
        joinedAt: new Date()
      };

      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        students: arrayUnion(newStudent)
      });

      setSubmitted(true);
      setError(null);
    } catch (err) {
      console.error('Error submitting:', err);
      setError('Failed to join session. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500">Loading session...</div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full text-center">
          <div className="text-red-500 text-4xl mb-3 flex justify-center">
            <FiAlertCircle />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full text-center">
          <div className="text-green-500 text-5xl mb-4 flex justify-center">
            <FiCheck />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome! 🎉</h2>
          <p className="text-gray-600 mb-4">
            You have successfully registered for the GD session.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Group:</strong> {session.groupName}
            </p>
            <p className="text-sm text-gray-700 mt-2">
              <strong>Topic:</strong> {session.topic}
            </p>
            <p className="text-sm text-gray-700 mt-2">
              <strong>Your Name:</strong> {studentName}
            </p>
            <p className="text-sm text-gray-700 mt-2">
              <strong>Specialization:</strong> {selectedSpecialization}
            </p>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Please wait for further instructions from the trainer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        {/* Session Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">GD Session</h1>
          <p className="text-gray-600">{session.groupName}</p>
        </div>

        {/* Session Details */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6 space-y-2 text-sm">
          <div>
            <span className="font-semibold text-gray-700">Topic:</span>
            <p className="text-gray-600">{session.topic}</p>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Course:</span>
            <p className="text-gray-600">{session.course}</p>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Year:</span>
            <p className="text-gray-600">Year {session.year}</p>
          </div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specialization *
            </label>
            <select
              value={selectedSpecialization}
              onChange={(e) => setSelectedSpecialization(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            >
              <option value="">Select your specialization</option>
              {session.specializations && session.specializations.map((spec, idx) => (
                <option key={spec + idx} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex gap-2">
              <FiAlertCircle className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? 'Joining...' : (
              <>
                <FiCheck size={18} /> Join Session
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-xs text-gray-500 text-center mt-4">
          Your details will be recorded and shared with the trainer.
        </p>
      </div>
    </div>
  );
}
