// src/components/NewPI.jsx
import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiUser } from 'react-icons/fi';

const initialScores = {
  introduction: { structured: 0, alignment: 0 },
  internship: { relevance: 0, contributions: 0, examples: 0 },
  bodyLanguage: { eyeContact: 0, confidence: 0, voice: 0 },
  domainKnowledge: { concepts: 0, application: 0, tools: 0 },
  starMethod: { structured: 0, learning: 0 },
  crispness: { concise: 0, relevance: 0, logical: 0 },
  situational: { behavioral: 0, pressure: 0, ethical: 0 },
  jdAwareness: { understanding: 0, mapping: 0 },
  industry: { trends: 0, insights: 0, affairs: 0 },
  personality: { attitude: 0, teamwork: 0, fitment: 0 }
};

export default function NewPI() {
  const [candidate, setCandidate] = useState({
    name: '',
    position: '',
    batch: '',
    experience: '',
    jd: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCandidate(prev => ({ ...prev, [name]: value }));
  };

  const startPI = async () => {
    if (!candidate.name) return;
    setLoading(true);
    
    try {
      const piData = {
        candidate,
        trainerId: auth.currentUser.uid,
        trainerEmail: auth.currentUser.email,
        evaluation: {
          ...initialScores,
          remarks: '',
          totalScore: 0
        },
        createdAt: new Date(),
        completed: false,
        type: 'pi'
      };

      const docRef = await addDoc(collection(db, 'sessions'), piData);
      navigate(`/pi/${docRef.id}`);
    } catch (err) {
      console.error("Error starting PI: ", err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">New Personal Interview</h1>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Candidate Name <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              value={candidate.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Full name"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position Applied</label>
              <input
                name="position"
                value={candidate.position}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Job title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
              <input
                name="experience"
                value={candidate.experience}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Years of experience"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
            <select
              name="batch"
              value={candidate.batch}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Batch</option>
              <option value="Batch A">Batch A</option>
              <option value="Batch B">Batch B</option>
              <option value="Batch C">Batch C</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
            <textarea
              name="jd"
              value={candidate.jd}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="3"
              placeholder="Paste job description here..."
            />
          </div>

          <button
            onClick={startPI}
            disabled={!candidate.name || loading}
            className={`w-full py-3 rounded-lg text-white font-medium transition flex items-center justify-center gap-2 ${
              !candidate.name || loading
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <FiUser /> {loading ? 'Creating Session...' : 'Start PI Session'}
          </button>
        </div>
      </div>
    </div>
  );
}