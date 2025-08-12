// src/components/GDView.jsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { FiSave, FiCheckCircle } from 'react-icons/fi';

const categories = [
  { 
    id: 'opening', 
    name: 'Opening, Facts & Domain Knowledge', 
    max: 20,
    fields: [
      { name: 'topicInitiation', label: 'Topic Initiation & Opening Clarity', max: 5 },
      { name: 'contentRelevance', label: 'Relevance of Content', max: 5 },
      { name: 'domainKnowledge', label: 'Domain/Industry Knowledge', max: 5 },
      { name: 'useOfFacts', label: 'Use of Facts, Data, Examples', max: 5 }
    ]
  },
  { 
    id: 'speaking', 
    name: 'Speaking, Language & Delivery', 
    max: 20,
    fields: [
      { name: 'grammar', label: 'Sentence Formation & Grammar', max: 5 },
      { name: 'vocabulary', label: 'Vocabulary & Fluency', max: 5 },
      { name: 'logicalFlow', label: 'Logical Flow & Coherence', max: 5 },
      { name: 'confidenceDelivery', label: 'Confidence in Delivery', max: 5 }
    ]
  },
  { 
    id: 'teamwork', 
    name: 'Teamwork, Listening & Question Handling', 
    max: 20,
    fields: [
      { name: 'acknowledging', label: 'Acknowledging Others’ Points', max: 5 },
      { name: 'questions', label: 'Asking & Answering Questions', max: 5 },
      { name: 'timeSharing', label: 'Time Sharing & Balanced Participation', max: 5 },
      { name: 'collaboration', label: 'Respectful & Collaborative Behaviour', max: 5 }
    ]
  },
  { 
    id: 'engagement', 
    name: 'Depth, Interpretation & Engagement', 
    max: 20,
    fields: [
      { name: 'multiplePerspectives', label: 'Understanding Multiple Perspectives', max: 5 },
      { name: 'awarenessIssues', label: 'Awareness of Underlying Issues', max: 5 },
      { name: 'bodyLanguage', label: 'Body Language & Non-Verbal Cues', max: 5 },
      { name: 'handlingPressure', label: 'Handling Pressure or Counterviews', max: 5 }
    ]
  },
  { 
    id: 'closing', 
    name: 'Closing & Summarizing', 
    max: 20,
    fields: [
      { name: 'conclusionClarity', label: 'Clarity of Conclusion', max: 7 },
      { name: 'summaryPoints', label: 'Summarizing Key Points', max: 7 },
      { name: 'closingConfidence', label: 'Confidence While Closing', max: 6 }
    ]
  }
];


export default function GDView() {
  const { gdId } = useParams();
  const navigate = useNavigate();
  const [gd, setGd] = useState(null);
  const [activeStudent, setActiveStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState('opening');

  useEffect(() => {
    const fetchGD = async () => {
      const docRef = doc(db, 'gds', gdId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const gdData = docSnap.data();
        setGd(gdData);
        setActiveStudent(gdData.evaluations?.[0] || null);
        setLoading(false);
      } else {
        setLoading(false);
      }
    };
    fetchGD();
  }, [gdId]);

  const handleScoreChange = useCallback((category, subCategory, value) => {
    if (!activeStudent || !gd) return;
    
    setGd(prevGd => {
      const updatedEvaluations = prevGd.evaluations.map(evaluation => {
        if (evaluation.studentId === activeStudent.studentId) {
          return {
            ...evaluation,
            scores: {
              ...evaluation.scores,
              [category]: {
                ...evaluation.scores[category],
                [subCategory]: parseInt(value)
              }
            }
          };
        }
        return evaluation;
      });

      return { ...prevGd, evaluations: updatedEvaluations };
    });
    
    setActiveStudent(prev => ({
      ...prev,
      scores: {
        ...prev.scores,
        [category]: {
          ...prev.scores[category],
          [subCategory]: parseInt(value)
        }
      }
    }));
  }, [activeStudent, gd]);

  const handleRemarksChange = useCallback((remarks) => {
    if (!activeStudent || !gd) return;
    
    setGd(prevGd => {
      const updatedEvaluations = prevGd.evaluations.map(evaluation => {
        if (evaluation.studentId === activeStudent.studentId) {
          return { ...evaluation, remarks };
        }
        return evaluation;
      });

      return { ...prevGd, evaluations: updatedEvaluations };
    });
    
    setActiveStudent(prev => ({ ...prev, remarks }));
  }, [activeStudent, gd]);

  const saveEvaluation = async () => {
    if (!gd || !activeStudent) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'gds', gdId), {
        evaluations: gd.evaluations
      });
      setSaving(false);
    } catch (err) {
      console.error("Error saving evaluation: ", err);
      setSaving(false);
    }
  };

  const completeGD = async () => {
    if (!gd) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'gds', gdId), {
        evaluations: gd.evaluations,
        completed: true,
        completedAt: new Date()
      });
      navigate('/');
    } catch (err) {
      console.error("Error completing GD: ", err);
      setSaving(false);
    }
  };

  const calculateCategoryTotal = useCallback((category) => {
    return activeStudent?.scores?.[category] 
      ? Object.values(activeStudent.scores[category]).reduce((a, b) => a + b, 0)
      : 0;
  }, [activeStudent]);

  const calculateTotalScore = useCallback(() => {
    return categories.reduce((total, category) => {
      return total + calculateCategoryTotal(category.id);
    }, 0);
  }, [calculateCategoryTotal]);

  const ScoreSelector = ({ category, field }) => {
    const currentScore = activeStudent?.scores?.[category]?.[field.name] || 0;

    return (
      <div className="mb-4">
        <h3 className="font-medium text-gray-700 mb-2">
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

  if (!gd) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">GD not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">{gd.topic}</h1>
            <p className="text-gray-600">Batch: {gd.batch}</p>
            <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium inline-block mt-2">
              Total: {calculateTotalScore()}/100
            </div>
          </div>
          
          {/* Student Selection */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Students</h2>
            <div className="flex flex-wrap gap-2">
              {gd.evaluations.map((evaluation) => (
                <button
                  key={evaluation.studentId}
                  onClick={() => setActiveStudent(evaluation)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    activeStudent?.studentId === evaluation.studentId 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {evaluation.studentName}
                </button>
              ))}
            </div>
          </div>

          {/* Category Selection */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Evaluation Criteria</h2>
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
                  {category.name} ({calculateCategoryTotal(category.id)}/{category.max})
                </button>
              ))}
            </div>
          </div>

          {/* Current Student Evaluation */}
          {activeStudent && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">
                Evaluating: <span className="text-blue-600">{activeStudent.studentName}</span>
              </h2>
              
              <div className="space-y-6">
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

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                <textarea
                  value={activeStudent.remarks || ''}
                  onChange={(e) => handleRemarksChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="Add your comments about this student's performance..."
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={saveEvaluation}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              <FiSave /> {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={completeGD}
              disabled={saving}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              <FiCheckCircle /> Complete GD
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}