import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function GDView() {
  const { gdId } = useParams();
  const [gd, setGd] = useState(null);
  const [activeStudent, setActiveStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchGD = async () => {
      const docRef = doc(db, 'gds', gdId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setGd(docSnap.data());
        setLoading(false);
      }
    };
    fetchGD();
  }, [gdId]);

  const handleScoreChange = (category, subCategory, value) => {
    if (!activeStudent) return;
    
    const updatedEvaluations = gd.evaluations.map(evaluation => {
      if (evaluation.studentId === activeStudent.studentId) {
        return {
          ...evaluation,
          scores: {
            ...evaluation.scores,
            [category]: {
              ...evaluation.scores[category],
              [subCategory]: parseInt(value) || 0
            }
          }
        };
      }
      return evaluation;
    });

    setGd({ ...gd, evaluations: updatedEvaluations });
  };

  const handleRemarksChange = (remarks) => {
    if (!activeStudent) return;
    
    const updatedEvaluations = gd.evaluations.map(evaluation => {
      if (evaluation.studentId === activeStudent.studentId) {
        return { ...evaluation, remarks };
      }
      return evaluation;
    });

    setGd({ ...gd, evaluations: updatedEvaluations });
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
      setSaving(false);
    } catch (err) {
      console.error("Error completing GD: ", err);
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!gd) {
    return <div className="min-h-screen flex items-center justify-center">GD not found</div>;
  }

  const currentStudent = activeStudent || gd.evaluations[0];

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <h1 className="text-2xl font-bold mb-2">{gd.topic}</h1>
          <p className="text-gray-600 mb-4">Batch: {gd.batch}</p>
          
          <div className="flex overflow-x-auto pb-2 mb-4">
            {gd.evaluations.map((evaluation) => (
              <button
                key={evaluation.studentId}
                onClick={() => setActiveStudent(evaluation)}
                className={`px-4 py-2 mr-2 rounded-full whitespace-nowrap ${activeStudent?.studentId === eval.studentId ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                {evaluation.studentName}
              </button>
            ))}
          </div>
        </div>

        {currentStudent && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-4">
            <h2 className="text-xl font-semibold mb-4">Evaluating: {currentStudent.studentName}</h2>
            
            {/* Evaluation Form */}
            <div className="space-y-6">
              {/* Opening, Facts & Domain Knowledge */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">1. Opening, Facts & Domain Knowledge (20 marks)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Topic Initiation & Opening Clarity (5)</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={currentStudent.scores.opening.initiation}
                      onChange={(e) => handleScoreChange('opening', 'initiation', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Relevance of Content (5)</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={currentStudent.scores.facts.relevance}
                      onChange={(e) => handleScoreChange('facts', 'relevance', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Domain/Industry Knowledge (5)</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={currentStudent.scores.facts.knowledge}
                      onChange={(e) => handleScoreChange('facts', 'knowledge', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Use of Facts, Data, Examples (5)</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={currentStudent.scores.facts.examples}
                      onChange={(e) => handleScoreChange('facts', 'examples', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Sentence Formation & Grammar (5)</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={currentStudent.scores.facts.grammar}
                      onChange={(e) => handleScoreChange('facts', 'grammar', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Speaking, Language & Delivery */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">2. Speaking, Language & Delivery (20 marks)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Vocabulary & Fluency (5)</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={currentStudent.scores.speaking.vocabulary}
                      onChange={(e) => handleScoreChange('speaking', 'vocabulary', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Logical Flow & Coherence (5)</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={currentStudent.scores.speaking.flow}
                      onChange={(e) => handleScoreChange('speaking', 'flow', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Confidence in Delivery (5)</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={currentStudent.scores.speaking.confidence}
                      onChange={(e) => handleScoreChange('speaking', 'confidence', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Acknowledging Others' Points (5)</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={currentStudent.scores.teamwork.questions}
                      onChange={(e) => handleScoreChange('teamwork', 'questions', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Teamwork, Listening & Question Handling */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">3. Teamwork, Listening & Question Handling (20 marks)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Time Sharing & Balanced Participation (5)</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={currentStudent.scores.teamwork.participation}
                      onChange={(e) => handleScoreChange('teamwork', 'participation', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Respectful & Collaborative Behavior (5)</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={currentStudent.scores.teamwork.behavior}
                      onChange={(e) => handleScoreChange('teamwork', 'behavior', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Understanding Multiple Perspectives (5)</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={currentStudent.scores.teamwork.perspectives}
                      onChange={(e) => handleScoreChange('teamwork', 'perspectives', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Awareness of Underlying Issues (5)</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={currentStudent.scores.depth.awareness}
                      onChange={(e) => handleScoreChange('depth', 'awareness', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Depth, Interpretation & Engagement */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">4. Depth, Interpretation & Engagement (20 marks)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Body Language & Non-Verbal Cues (5)</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={currentStudent.scores.depth.bodyLanguage}
                      onChange={(e) => handleScoreChange('depth', 'bodyLanguage', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Handling Pressure or Counterviews (5)</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={currentStudent.scores.depth.counterviews}
                      onChange={(e) => handleScoreChange('depth', 'counterviews', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Closing & Summarizing */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">5. Closing & Summarizing (20 marks)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Clarity of Conclusion (7)</label>
                    <input
                      type="number"
                      min="0"
                      max="7"
                      value={currentStudent.scores.closing.conclusion}
                      onChange={(e) => handleScoreChange('closing', 'conclusion', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Summarizing Key Points (7)</label>
                    <input
                      type="number"
                      min="0"
                      max="7"
                      value={currentStudent.scores.closing.summary}
                      onChange={(e) => handleScoreChange('closing', 'summary', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Confidence While Closing (6)</label>
                    <input
                      type="number"
                      min="0"
                      max="6"
                      value={currentStudent.scores.closing.confidence}
                      onChange={(e) => handleScoreChange('closing', 'confidence', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">Remarks</h3>
                <textarea
                  value={currentStudent.remarks}
                  onChange={(e) => handleRemarksChange(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                  placeholder="Additional comments about the student's performance..."
                ></textarea>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={saveEvaluation}
                disabled={saving}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={completeGD}
                disabled={saving}
                className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 disabled:bg-green-300"
              >
                {saving ? 'Processing...' : 'Complete GD'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}