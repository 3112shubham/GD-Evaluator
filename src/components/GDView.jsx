import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { FiSave, FiCheckCircle } from 'react-icons/fi';

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
        setGd(docSnap.data());
        setActiveStudent(docSnap.data().evaluations[0]);
        setLoading(false);
      }
    };
    fetchGD();
  }, [gdId]);

  const handleScoreChange = (category, subCategory, value) => {
    if (!activeStudent || !gd) return;
    
    const updatedEvaluations = gd.evaluations.map(evaluation => {
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

    setGd({ ...gd, evaluations: updatedEvaluations });
    setActiveStudent(updatedEvaluations.find(e => e.studentId === activeStudent.studentId));
  };

  const handleRemarksChange = (remarks) => {
    if (!activeStudent || !gd) return;
    
    const updatedEvaluations = gd.evaluations.map(evaluation => {
      if (evaluation.studentId === activeStudent.studentId) {
        return { ...evaluation, remarks };
      }
      return evaluation;
    });

    setGd({ ...gd, evaluations: updatedEvaluations });
    setActiveStudent(updatedEvaluations.find(e => e.studentId === activeStudent.studentId));
  };

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

  const categories = [
    { id: 'opening', name: 'Opening', max: 10, fields: ['initiation', 'clarity'] },
    { id: 'facts', name: 'Facts', max: 20, fields: ['relevance', 'knowledge', 'examples', 'grammar'] },
    { id: 'speaking', name: 'Speaking', max: 15, fields: ['vocabulary', 'flow', 'confidence'] },
    { id: 'teamwork', name: 'Teamwork', max: 20, fields: ['questions', 'participation', 'behavior', 'perspectives'] },
    { id: 'depth', name: 'Depth', max: 15, fields: ['awareness', 'bodyLanguage', 'counterviews'] },
    { id: 'closing', name: 'Closing', max: 20, fields: ['conclusion', 'summary', 'confidence'] }
  ];

  const calculateCategoryTotal = (category) => {
    return Object.values(activeStudent?.scores[category] || {}).reduce((a, b) => a + b, 0);
  };

  const calculateTotalScore = () => {
    return categories.reduce((total, category) => {
      return total + calculateCategoryTotal(category.id);
    }, 0);
  };

  const ScoreSelector = ({ category, field }) => {
    const maxScore = 
      field === 'conclusion' || field === 'summary' ? 7 :
      field === 'confidence' && category === 'closing' ? 6 : 5;
    
    const currentScore = activeStudent?.scores[category]?.[field] || 0;

    return (
      <div className="mb-4">
        <h3 className="font-medium text-gray-700 capitalize mb-2">
          {field.replace(/([A-Z])/g, ' $1')} (Max: {maxScore})
        </h3>
        <div className="flex gap-2 flex-wrap">
          {[...Array(maxScore + 1)].map((_, i) => (
            <button
              key={i}
              onClick={() => handleScoreChange(category, field, i)}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
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
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">
              Evaluating: <span className="text-blue-600">{activeStudent.studentName}</span>
            </h2>
            
            <div className="space-y-6">
              {categories
                .find(c => c.id === activeCategory)
                ?.fields.map(field => (
                  <ScoreSelector 
                    key={field}
                    category={activeCategory}
                    field={field}
                  />
                ))
              }
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
              <textarea
                value={activeStudent.remarks}
                onChange={(e) => handleRemarksChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="Add your comments about this student's performance..."
              />
            </div>
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