import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { FiSave, FiCheckCircle, FiUser, FiAward, FiUsers, FiEdit, FiX, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { onSnapshot } from 'firebase/firestore';

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
      { name: 'acknowledging', label: 'Acknowledging Others Points', max: 5 },
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
  const [availableStudents, setAvailableStudents] = useState([]);
  const [students, setStudents] = useState([]);
  const [availableGDs, setAvailableGDs] = useState([]);
  const [editingGroupInfo, setEditingGroupInfo] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupTopic, setGroupTopic] = useState('');
  const localCacheRef = useRef(null);
  const autoSaveTimeoutRef = useRef(null);

  // Initialize local cache
  useEffect(() => {
    const cachedData = localStorage.getItem(`gdCache_${gdId}`);
    if (cachedData) {
      localCacheRef.current = JSON.parse(cachedData);
    } else {
      localCacheRef.current = {
        evaluations: [],
        students: []
      };
    }
  }, [gdId]);

  // Save to localStorage when component unmounts
  useEffect(() => {
    return () => {
      if (localCacheRef.current) {
        localStorage.setItem(`gdCache_${gdId}`, JSON.stringify(localCacheRef.current));
      }
    };
  }, [gdId]);

  // Fetch GD data and set up real-time listener
  useEffect(() => {
    const fetchGD = async () => {
      const docRef = doc(db, 'sessions', gdId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const gdData = docSnap.data();
        
        // Merge with cached data if available
        const mergedEvaluations = localCacheRef.current?.evaluations?.length > 0 
          ? localCacheRef.current.evaluations 
          : gdData.evaluations || [];
        
        const mergedStudents = localCacheRef.current?.students?.length > 0
          ? localCacheRef.current.students
          : gdData.students || [];
        
        setGd({
          ...gdData,
          evaluations: mergedEvaluations,
          students: mergedStudents
        });
        
        setGroupName(gdData.groupName || '');
        setGroupTopic(gdData.topic || '');
        setStudents(mergedStudents);
        
        if (mergedStudents.length > 0) {
          const firstStudent = mergedStudents[0];
          setActiveStudent({
            studentId: firstStudent.id,
            studentName: firstStudent.name,
            studentEmail: firstStudent.email,
            chestNumber: firstStudent.chestNumber,
            scores: mergedEvaluations?.find(e => e.studentId === firstStudent.id)?.scores || {},
            remarks: mergedEvaluations?.find(e => e.studentId === firstStudent.id)?.remarks || ''
          });
        }
        
        if (gdData.specializationId) {
          const batchesQuery = query(
            collection(db, 'batches'),
            where('specializationId', '==', gdData.specializationId)
          );
          const batchesSnapshot = await getDocs(batchesQuery);
          
          if (!batchesSnapshot.empty) {
            const studentsPromises = batchesSnapshot.docs.map(async batchDoc => {
              const studentsSnapshot = await getDocs(
                collection(db, 'batches', batchDoc.id, 'students')
              );
              return studentsSnapshot.docs.map(studentDoc => ({
                id: studentDoc.id,
                ...studentDoc.data(),
                batchId: batchDoc.id
              }));
            });
            
            const studentsArrays = await Promise.all(studentsPromises);
            setAvailableStudents(studentsArrays.flat());
          }
        }
      }
      setLoading(false);
    };

    const fetchActiveGDs = async () => {
      if (!auth.currentUser) return;
      
      const q = query(
        collection(db, 'sessions'),
        where('type', '==', 'gd'),
        where('completed', '==', false),
        where('isActive', '==', true),
        where('trainerId', '==', auth.currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const gds = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setAvailableGDs(gds);
    };

    fetchGD();
    fetchActiveGDs();

    // Set up real-time listener for GD updates (read-only)
    const unsubscribe = onSnapshot(doc(db, 'sessions', gdId), (doc) => {
      if (doc.exists()) {
        const gdData = doc.data();
        setGd(prev => ({
          ...prev,
          ...gdData,
          // Don't overwrite evaluations and students from local state
          evaluations: prev?.evaluations || gdData.evaluations || [],
          students: prev?.students || gdData.students || []
        }));
        setGroupName(gdData.groupName || '');
        setGroupTopic(gdData.topic || '');
      }
    });

    return () => unsubscribe();
  }, [gdId]);

  // Update local cache when evaluations or students change
  useEffect(() => {
    if (gd) {
      localCacheRef.current = {
        evaluations: gd.evaluations || [],
        students: students
      };
    }
  }, [gd, students]);

  const handleScoreChange = useCallback((category, subCategory, value) => {
    if (!activeStudent) return;
    
    const newScore = parseInt(value);
    
    setGd(prevGd => {
      const updatedEvaluations = prevGd?.evaluations?.map(evaluation => {
        if (evaluation.studentId === activeStudent.studentId) {
          return {
            ...evaluation,
            scores: {
              ...evaluation.scores,
              [category]: {
                ...evaluation.scores[category],
                [subCategory]: newScore
              }
            }
          };
        }
        return evaluation;
      }) || [];

      if (!updatedEvaluations.some(e => e.studentId === activeStudent.studentId)) {
        updatedEvaluations.push({
          studentId: activeStudent.studentId,
          studentName: activeStudent.studentName,
          studentEmail: activeStudent.studentEmail,
          chestNumber: activeStudent.chestNumber,
          scores: {
            opening: { topicInitiation: 0, contentRelevance: 0, domainKnowledge: 0, useOfFacts: 0 },
            speaking: { grammar: 0, vocabulary: 0, logicalFlow: 0, confidenceDelivery: 0 },
            teamwork: { acknowledging: 0, questions: 0, timeSharing: 0, collaboration: 0 },
            engagement: { multiplePerspectives: 0, awarenessIssues: 0, bodyLanguage: 0, handlingPressure: 0 },
            closing: { conclusionClarity: 0, summaryPoints: 0, closingConfidence: 0 },
            [category]: {
              [subCategory]: newScore
            }
          },
          remarks: activeStudent.remarks || ''
        });
      }

      return { ...prevGd, evaluations: updatedEvaluations };
    });
    
    setActiveStudent(prev => ({
      ...prev,
      scores: {
        ...prev.scores,
        [category]: {
          ...prev.scores[category],
          [subCategory]: newScore
        }
      }
    }));

    // Debounce auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem(`gdCache_${gdId}`, JSON.stringify(localCacheRef.current));
    }, 1000);
  }, [activeStudent, gdId]);

  const handleRemarksChange = useCallback((remarks) => {
    if (!activeStudent) return;
    
    setGd(prevGd => {
      const updatedEvaluations = prevGd?.evaluations?.map(evaluation => {
        if (evaluation.studentId === activeStudent.studentId) {
          return { ...evaluation, remarks };
        }
        return evaluation;
      }) || [];

      if (!updatedEvaluations.some(e => e.studentId === activeStudent.studentId)) {
        updatedEvaluations.push({
          studentId: activeStudent.studentId,
          studentName: activeStudent.studentName,
          studentEmail: activeStudent.studentEmail,
          chestNumber: activeStudent.chestNumber,
          scores: activeStudent.scores || {
            opening: { topicInitiation: 0, contentRelevance: 0, domainKnowledge: 0, useOfFacts: 0 },
            speaking: { grammar: 0, vocabulary: 0, logicalFlow: 0, confidenceDelivery: 0 },
            teamwork: { acknowledging: 0, questions: 0, timeSharing: 0, collaboration: 0 },
            engagement: { multiplePerspectives: 0, awarenessIssues: 0, bodyLanguage: 0, handlingPressure: 0 },
            closing: { conclusionClarity: 0, summaryPoints: 0, closingConfidence: 0 }
          },
          remarks
        });
      }

      return { ...prevGd, evaluations: updatedEvaluations };
    });
    
    setActiveStudent(prev => ({ ...prev, remarks }));

    // Debounce auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem(`gdCache_${gdId}`, JSON.stringify(localCacheRef.current));
    }, 1000);
  }, [activeStudent, gdId]);

  const saveEvaluation = async () => {
    if (!gd) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'sessions', gdId), {
        evaluations: gd.evaluations || [],
        students: students
      });
      // Clear cache after successful save
      localStorage.removeItem(`gdCache_${gdId}`);
      setSaving(false);
    } catch (err) {
      console.error("Error saving evaluation: ", err);
      setSaving(false);
    }
  };

  const saveGroupInfo = async () => {
    if (!gd) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'sessions', gdId), {
        groupName,
        topic: groupTopic
      });
      setEditingGroupInfo(false);
      setSaving(false);
    } catch (err) {
      console.error("Error saving group info: ", err);
      setSaving(false);
    }
  };

  const completeGD = async () => {
    if (!gd) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'sessions', gdId), {
        evaluations: gd.evaluations || [],
        students: students,
        completed: true,
        completedAt: new Date(),
        isActive: false,
        type: 'gd',
        groupName,
        topic: groupTopic
      });
      // Clear cache after completion
      localStorage.removeItem(`gdCache_${gdId}`);
      navigate('/dashboard', { replace: true });
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

  const addStudent = (student) => {
    if (!students.some(s => s.id === student.id)) {
      const chestNumber = students.length > 0 
        ? Math.max(...students.map(s => s.chestNumber)) + 1 
        : 1;
      const newStudent = { ...student, chestNumber };
      
      setStudents([...students, newStudent]);
      
      setActiveStudent({
        studentId: newStudent.id,
        studentName: newStudent.name,
        studentEmail: newStudent.email,
        chestNumber: newStudent.chestNumber,
        scores: {},
        remarks: ''
      });

      // Update cache
      localCacheRef.current.students = [...students, newStudent];
      localStorage.setItem(`gdCache_${gdId}`, JSON.stringify(localCacheRef.current));
    }
  };

  const removeStudent = (studentId) => {
    setStudents(students.filter(s => s.id !== studentId));
    
    if (activeStudent?.studentId === studentId) {
      const remainingStudents = students.filter(s => s.id !== studentId);
      if (remainingStudents.length > 0) {
        const nextStudent = remainingStudents[0];
        setActiveStudent({
          studentId: nextStudent.id,
          studentName: nextStudent.name,
          studentEmail: nextStudent.email,
          chestNumber: nextStudent.chestNumber,
          scores: gd.evaluations?.find(e => e.studentId === nextStudent.id)?.scores || {},
          remarks: gd.evaluations?.find(e => e.studentId === nextStudent.id)?.remarks || ''
        });
      } else {
        setActiveStudent(null);
      }
    }

    // Update cache
    localCacheRef.current.students = students.filter(s => s.id !== studentId);
    localCacheRef.current.evaluations = gd.evaluations?.filter(e => e.studentId !== studentId) || [];
    localStorage.setItem(`gdCache_${gdId}`, JSON.stringify(localCacheRef.current));
  };

  const switchGD = (newGdId) => {
    // Save current state to cache before switching
    localStorage.setItem(`gdCache_${gdId}`, JSON.stringify(localCacheRef.current));
    navigate(`/gd/${newGdId}`);
  };

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
          {/* GD Selection Dropdown and Info Section */}
          <div className="mb-6">
            {editingGroupInfo ? (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discussion Topic</label>
                  <input
                    type="text"
                    value={groupTopic}
                    onChange={(e) => setGroupTopic(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveGroupInfo}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                  >
                    <FiSave /> Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setEditingGroupInfo(false);
                      setGroupName(gd.groupName || '');
                      setGroupTopic(gd.topic || '');
                    }}
                    className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition"
                  >
                    <FiX /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 mb-1">{gd.groupName}</h1>
                  <h2 className="text-lg text-gray-600 mb-3">{gd.topic}</h2>
                </div>
                <button
                  onClick={() => setEditingGroupInfo(true)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                >
                  <FiEdit size={16} /> Edit
                </button>
              </div>
            )}

            {availableGDs.length > 0 && (
              <div className="mb-4">
                <h2 className="text-lg font-semibold mb-2">Active GDs</h2>
                <div className="flex flex-wrap gap-2">
                  {availableGDs.map(gdItem => (
                    <button
                      key={gdItem.id}
                      onClick={() => switchGD(gdItem.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                        gdItem.id === gdId 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <span>{gdItem.groupName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <FiUsers className="text-gray-500" /> {students.length} Participants
              </div>
              <div className="flex items-center gap-1">
                <FiAward className="text-gray-500" /> Highest: {Math.max(...(
                  gd.evaluations?.map(e => 
                    Object.values(e.scores).flatMap(c => Object.values(c)).reduce((a, b) => a + b, 0)
                  ) || [0]
                ))}/100
              </div>
            </div>
            {activeStudent && (
              <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium inline-block mt-2">
                Total: {calculateTotalScore()}/100
              </div>
            )}
          </div>
          
          {/* Student Selection */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Students</h2>
            <div className="flex flex-wrap gap-2">
              {students.map((student) => (
                <button
                  key={student.id}
                  onClick={() => setActiveStudent({
                    studentId: student.id,
                    studentName: student.name,
                    studentEmail: student.email,
                    chestNumber: student.chestNumber,
                    scores: gd.evaluations?.find(e => e.studentId === student.id)?.scores || {},
                    remarks: gd.evaluations?.find(e => e.studentId === student.id)?.remarks || ''
                  })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                    activeStudent?.studentId === student.id 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <span>#{student.chestNumber}</span>
                  <span>{student.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Evaluation Section */}
          {activeStudent && (
            <>
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

              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3">
                  Evaluating: <span className="text-blue-600">#{activeStudent.chestNumber} {activeStudent.studentName}</span>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}