// src/components/PIView.jsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { FiSave, FiCheckCircle, FiUser } from 'react-icons/fi';

const categories = [
  {
    id: 'introduction',
    name: 'Introduction',
    max: 10,
    fields: [
      { name: 'structured', label: 'Structured Introduction', max: 5 },
      { name: 'alignment', label: 'Alignment with CV', max: 5 }
    ]
  },
  {
    id: 'internship',
    name: 'Internship/Experience',
    max: 10,
    fields: [
      { name: 'relevance', label: 'Role Relevance', max: 4 },
      { name: 'contributions', label: 'Key Contributions', max: 3 },
      { name: 'examples', label: 'Use of Examples', max: 3 }
    ]
  },
  {
    id: 'bodyLanguage',
    name: 'Body Language',
    max: 10,
    fields: [
      { name: 'eyeContact', label: 'Eye Contact & Posture', max: 3 },
      { name: 'confidence', label: 'Confidence & Presence', max: 4 },
      { name: 'voice', label: 'Voice & Tone', max: 3 }
    ]
  },
  {
    id: 'domainKnowledge',
    name: 'Domain Knowledge',
    max: 10,
    fields: [
      { name: 'concepts', label: 'Basic Concepts', max: 4 },
      { name: 'application', label: 'Application & Examples', max: 3 },
      { name: 'tools', label: 'Tools/Models Awareness', max: 3 }
    ]
  },
  {
    id: 'starMethod',
    name: 'STAR Method',
    max: 10,
    fields: [
      { name: 'structured', label: 'Structured Answering', max: 6 },
      { name: 'learning', label: 'Learning Highlighted', max: 4 }
    ]
  },
  {
    id: 'crispness',
    name: 'Crispness of Answers',
    max: 10,
    fields: [
      { name: 'concise', label: 'To-the-Point Responses', max: 4 },
      { name: 'relevance', label: 'Relevance to Question', max: 3 },
      { name: 'logical', label: 'Logical Flow', max: 3 }
    ]
  },
  {
    id: 'situational',
    name: 'Situational Handling',
    max: 10,
    fields: [
      { name: 'behavioral', label: 'Behavioral Question Handling', max: 4 },
      { name: 'pressure', label: 'Pressure Management', max: 3 },
      { name: 'ethical', label: 'Ethical Clarity', max: 3 }
    ]
  },
  {
    id: 'jdAwareness',
    name: 'JD Awareness',
    max: 10,
    fields: [
      { name: 'understanding', label: 'Understanding of JD', max: 5 },
      { name: 'mapping', label: 'Skill-Role Mapping', max: 5 }
    ]
  },
  {
    id: 'industry',
    name: 'Industry Awareness',
    max: 10,
    fields: [
      { name: 'trends', label: 'Trends & Updates', max: 4 },
      { name: 'insights', label: 'Competitor/Market Insight', max: 3 },
      { name: 'affairs', label: 'Current Affairs Relevance', max: 3 }
    ]
  },
  {
    id: 'personality',
    name: 'Personality Fitment',
    max: 10,
    fields: [
      { name: 'attitude', label: 'Attitude & Adaptability', max: 3 },
      { name: 'teamwork', label: 'Teamwork/Leadership Potential', max: 3 },
      { name: 'fitment', label: 'Organizational Fit', max: 4 }
    ]
  }
];

export default function PIView() {
  const { piId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [activeCategory, setActiveCategory] = useState('introduction');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    const fetchSession = async () => {
      const docRef = doc(db, 'sessions', piId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const sessionData = docSnap.data();
        setSession(sessionData);
        setRemarks(sessionData.evaluation?.remarks || '');
        setLoading(false);
      } else {
        setLoading(false);
      }
    };
    fetchSession();
  }, [piId]);

  const handleScoreChange = useCallback((category, field, value) => {
    setSession(prev => {
      const newEvaluation = { ...prev.evaluation };
      if (!newEvaluation[category]) newEvaluation[category] = {};
      newEvaluation[category][field] = parseInt(value);
      newEvaluation.totalScore = calculateTotalScore(newEvaluation);
      return { ...prev, evaluation: newEvaluation };
    });
  }, []);

  const handleRemarksChange = useCallback((e) => {
    const value = e.target.value;
    setRemarks(value);
    setSession(prev => {
      const newEvaluation = { ...prev.evaluation, remarks: value };
      return { ...prev, evaluation: newEvaluation };
    });
  }, []);

  const calculateCategoryScore = useCallback((category) => {
    if (!session?.evaluation?.[category]) return 0;
    return Object.values(session.evaluation[category]).reduce((a, b) => a + b, 0);
  }, [session]);

  const calculateTotalScore = useCallback((evaluation) => {
    return categories.reduce((total, category) => {
      return total + (evaluation[category.id] 
        ? Object.values(evaluation[category.id]).reduce((a, b) => a + b, 0)
        : 0);
    }, 0);
  }, []);

  const saveEvaluation = async () => {
    if (!session) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'sessions', piId), {
        evaluation: session.evaluation
      });
      setSaving(false);
    } catch (err) {
      console.error("Error saving evaluation: ", err);
      setSaving(false);
    }
  };

  const completePI = async () => {
    if (!session) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'sessions', piId), {
        evaluation: session.evaluation,
        completed: true,
        completedAt: new Date()
      });
      navigate('/');
    } catch (err) {
      console.error("Error completing PI: ", err);
      setSaving(false);
    }
  };

  const ScoreSelector = ({ category, field }) => {
    const currentScore = session?.evaluation?.[category]?.[field.name] || 0;
    
    return (
      <div className="mb-6">
        <h3 className="font-medium text-gray-700 mb-3">
          {field.label} (Max: {field.max})
        </h3>
        <div className="flex flex-wrap gap-2">
          {[...Array(field.max + 1)].map((_, i) => (
            <button
              key={i}
              onClick={() => handleScoreChange(category, field.name, i)}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition ${
                currentScore === i 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {i}
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">PI session not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-1">
                  {session.candidate.name}
                </h1>
                <p className="text-gray-600">
                  {session.candidate.position && `${session.candidate.position} • `}
                  {session.candidate.experience && `${session.candidate.experience} experience • `}
                  {session.candidate.batch}
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                  Total: {session.evaluation?.totalScore || 0}/100
                </div>
              </div>
            </div>
            
            {session.candidate.jd && (
              <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-2">Job Description</h3>
                <p className="text-gray-600 whitespace-pre-line">{session.candidate.jd}</p>
              </div>
            )}
          </div>
          
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Evaluation Criteria</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    activeCategory === category.id 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {category.name} ({calculateCategoryScore(category.id)}/{category.max})
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">
              {categories.find(c => c.id === activeCategory)?.name}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {categories
                .find(c => c.id === activeCategory)
                ?.fields.map(field => (
                  <ScoreSelector 
                    key={field.name}
                    category={activeCategory}
                    field={field}
                  />
                ))
              }
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overall Remarks
            </label>
            <textarea
              value={remarks}
              onChange={handleRemarksChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="4"
              placeholder="Add your overall assessment of the candidate..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={saveEvaluation}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              <FiSave /> {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={completePI}
              disabled={saving}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              <FiCheckCircle /> Complete Evaluation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}