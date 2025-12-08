import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { FiSave, FiCheckCircle, FiUser, FiAward, FiUsers, FiEdit, FiX, FiChevronDown, FiChevronUp, FiShare2, FiCopy, FiRefreshCw, FiArrowLeft } from 'react-icons/fi';
import { onSnapshot } from 'firebase/firestore';
import QRCode from 'react-qr-code';

// Simplified evaluation criteria with 0-10 scale
const categories = [
  { id: 'communication', name: 'Communication', max: 10 },
  { id: 'participation', name: 'Participation', max: 10 },
  { id: 'teamwork', name: 'Teamwork', max: 10 },
  { id: 'confidence', name: 'Confidence', max: 10 },
  { id: 'contentKnowledge', name: 'Content Knowledge', max: 10 }
];

// Helper function to normalize scores from old nested structure to new flat structure
const normalizeScores = (scores) => {
  if (!scores || typeof scores !== 'object') {
    return {
      communication: 0,
      participation: 0,
      teamwork: 0,
      confidence: 0,
      contentKnowledge: 0
    };
  }
  
  // If it's already flat (has 'communication' as a number), return as is
  if (typeof scores.communication === 'number') {
    return {
      communication: scores.communication || 0,
      participation: scores.participation || 0,
      teamwork: scores.teamwork || 0,
      confidence: scores.confidence || 0,
      contentKnowledge: scores.contentKnowledge || 0
    };
  }
  
  // Otherwise it's the old nested structure, return defaults
  return {
    communication: 0,
    participation: 0,
    teamwork: 0,
    confidence: 0,
    contentKnowledge: 0
  };
};

// Fallback copy method for mobile
const fallbackCopyLink = (text) => {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
    alert('Link copied to clipboard!');
  } catch (err) {
    alert('Failed to copy. Please try again.');
  }
  document.body.removeChild(textArea);
};

export default function GDView() {
  const { gdId } = useParams();
  const navigate = useNavigate();
  const [gd, setGd] = useState(null);
  const [activeStudent, setActiveStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [students, setStudents] = useState([]);
  const [availableGDs, setAvailableGDs] = useState([]);
  const [editingGroupInfo, setEditingGroupInfo] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupTopic, setGroupTopic] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
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
        
        let mergedStudents = localCacheRef.current?.students?.length > 0
          ? localCacheRef.current.students
          : gdData.students || [];
        
        // Assign chest numbers to students if they don't have them
        mergedStudents = mergedStudents.map((student, index) => ({
          ...student,
          chestNumber: student.chestNumber || (index + 1)
        }));
        
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
          const studentEval = mergedEvaluations?.find(e => e.studentId === firstStudent.chestNumber);
          setActiveStudent({
            studentId: firstStudent.chestNumber,
            studentName: firstStudent.name,
            studentEmail: firstStudent.email,
            chestNumber: firstStudent.chestNumber,
            specialization: firstStudent.specialization || '',
            scores: normalizeScores(studentEval?.scores),
            remarks: studentEval?.remarks || ''
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
        
        // Process students from database to assign chest numbers
        let dbStudents = gdData.students || [];
        dbStudents = dbStudents.map((student, index) => ({
          ...student,
          chestNumber: student.chestNumber || (index + 1)
        }));
        
        setGd(prev => ({
          ...prev,
          ...gdData,
          evaluations: prev?.evaluations || gdData.evaluations || [],
          students: dbStudents
        }));
        
        setStudents(dbStudents);
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

  const handleScoreChange = useCallback((category, value) => {
    if (!activeStudent) return;
    
    const newScore = parseInt(value);
    
    setGd(prevGd => {
      const updatedEvaluations = prevGd?.evaluations?.map(evaluation => {
        if (evaluation.studentId === activeStudent.studentId) {
          return {
            ...evaluation,
            scores: {
              ...evaluation.scores,
              [category]: newScore
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
          specialization: activeStudent.specialization || '',
          scores: {
            communication: 0,
            participation: 0,
            contentKnowledge: 0,
            teamwork: 0,
            confidence: 0,
            [category]: newScore
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
        [category]: newScore
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
          specialization: activeStudent.specialization || '',
          scores: activeStudent.scores || {
            communication: 0,
            participation: 0,
            contentKnowledge: 0,
            teamwork: 0,
            confidence: 0,
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
      // Fetch project and campus data to store names
      const projectRef = doc(db, 'projects', gd.projectId);
      const projectSnap = await getDoc(projectRef);
      const projectCode = projectSnap.data()?.code || '';

      const campusRef = doc(db, 'projects', gd.projectId, 'campuses', gd.campusId);
      const campusSnap = await getDoc(campusRef);
      const campusName = campusSnap.data()?.name || '';

      // Add projectCode and campusName to all evaluations
      const evaluationsWithMetadata = (gd.evaluations || []).map(evaluation => ({
        ...evaluation,
        projectCode,
        campusName
      }));

      await updateDoc(doc(db, 'sessions', gdId), {
        evaluations: evaluationsWithMetadata
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
      // Fetch project and campus data to store names
      const projectRef = doc(db, 'projects', gd.projectId);
      const projectSnap = await getDoc(projectRef);
      const projectCode = projectSnap.data()?.code || '';

      const campusRef = doc(db, 'projects', gd.projectId, 'campuses', gd.campusId);
      const campusSnap = await getDoc(campusRef);
      const campusName = campusSnap.data()?.name || '';

      // Add projectCode and campusName to all evaluations
      const evaluationsWithMetadata = (gd.evaluations || []).map(evaluation => ({
        ...evaluation,
        projectCode,
        campusName
      }));

      await updateDoc(doc(db, 'sessions', gdId), {
        evaluations: evaluationsWithMetadata,
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

  const calculateTotalScore = useCallback(() => {
    return categories.reduce((total, category) => {
      return total + (activeStudent?.scores?.[category.id] ?? 0);
    }, 0);
  }, [activeStudent]);

  const addStudent = (student) => {
    if (!students.some(s => s.id === student.id)) {
      const chestNumber = students.length > 0 
        ? Math.max(...students.map(s => s.chestNumber)) + 1 
        : 1;
      const newStudent = { ...student, chestNumber };
      
      setStudents([...students, newStudent]);
      
      setActiveStudent({
        studentId: chestNumber,
        studentName: newStudent.name,
        studentEmail: newStudent.email,
        chestNumber: chestNumber,
        specialization: newStudent.specialization || '',
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
          studentId: nextStudent.chestNumber,
          studentName: nextStudent.name,
          studentEmail: nextStudent.email,
          chestNumber: nextStudent.chestNumber,
          specialization: nextStudent.specialization || '',
          scores: gd.evaluations?.find(e => e.studentId === nextStudent.chestNumber)?.scores || {},
          remarks: gd.evaluations?.find(e => e.studentId === nextStudent.chestNumber)?.remarks || ''
        });
      } else {
        setActiveStudent(null);
      }
    }

    // Update cache
    localCacheRef.current.students = students.filter(s => s.chestNumber !== studentId);
    localCacheRef.current.evaluations = gd.evaluations?.filter(e => e.studentId !== studentId) || [];
    localStorage.setItem(`gdCache_${gdId}`, JSON.stringify(localCacheRef.current));
  };

  const switchGD = (newGdId) => {
    // Save current state to cache before switching
    localStorage.setItem(`gdCache_${gdId}`, JSON.stringify(localCacheRef.current));
    navigate(`/gd/${newGdId}`);
  };

  const ScoreSelector = ({ category }) => {
    const [draggedScore, setDraggedScore] = useState(null);
    const currentScore = draggedScore !== null ? draggedScore : (activeStudent?.scores?.[category.id] ?? 0);

    const handleDragStart = () => {
      setDraggedScore(activeStudent?.scores?.[category.id] ?? 0);
    };

    const handleDragMove = (e) => {
      const value = Math.round(parseFloat(e.target.value) * 10) / 10;
      setDraggedScore(value);
    };

    const handleDragEnd = (e) => {
      const value = Math.round(parseFloat(e.target.value));
      handleScoreChange(category.id, value);
      setDraggedScore(null);
    };

    return (
      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-blue-900 text-sm">{category.name}</h3>
          <span className="text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-700 px-3 py-1 rounded-full">
            {Math.round(currentScore)}/{category.max}
          </span>
        </div>
        <div className="relative">
          <input
            type="range"
            min="0"
            max={category.max}
            step="0.1"
            value={currentScore}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            onInput={handleDragMove}
            onMouseUp={handleDragEnd}
            onTouchEnd={handleDragEnd}
            className="w-full h-3 bg-blue-200 rounded-full appearance-none cursor-pointer accent-blue-600 slider"
            style={{
              background: `linear-gradient(to right, rgb(37, 99, 235) 0%, rgb(37, 99, 235) ${(currentScore / category.max) * 100}%, rgb(191, 219, 254) ${(currentScore / category.max) * 100}%, rgb(191, 219, 254) 100%)`
            }}
          />
        </div>
        <style>{`
          input[type='range'].slider::-webkit-slider-thumb {
            appearance: none;
            width: 26px;
            height: 26px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgb(37, 99, 235), rgb(99, 102, 241));
            cursor: grab;
            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
            border: 2px solid white;
          }
          input[type='range'].slider::-webkit-slider-thumb:hover {
            box-shadow: 0 3px 12px rgba(37, 99, 235, 0.5);
          }
          input[type='range'].slider::-webkit-slider-thumb:active {
            cursor: grabbing;
            box-shadow: 0 4px 16px rgba(37, 99, 235, 0.7);
          }
          input[type='range'].slider::-moz-range-thumb {
            width: 26px;
            height: 26px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgb(37, 99, 235), rgb(99, 102, 241));
            cursor: grab;
            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
            border: 2px solid white;
          }
          input[type='range'].slider::-moz-range-thumb:hover {
            box-shadow: 0 3px 12px rgba(37, 99, 235, 0.5);
          }
          input[type='range'].slider::-moz-range-thumb:active {
            cursor: grabbing;
            box-shadow: 0 4px 16px rgba(37, 99, 235, 0.7);
          }
          input[type='range'].slider::-moz-range-track {
            background: transparent;
            border: none;
          }
          input[type='range'].slider::-moz-range-progress {
            background-color: rgb(37, 99, 235);
          }
        `}</style>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-blue-800">Loading...</div>
        </div>
      </div>
    );
  }

  if (!gd) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-blue-800">GD not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-blue-100">
          {/* GD Selection Dropdown and Info Section */}
          <div className="mb-6">
            {editingGroupInfo ? (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">Group Name</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">Discussion Topic</label>
                  <input
                    type="text"
                    value={groupTopic}
                    onChange={(e) => setGroupTopic(e.target.value)}
                    className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveGroupInfo}
                    disabled={saving}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                  >
                    <FiSave /> Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setEditingGroupInfo(false);
                      setGroupName(gd.groupName || '');
                      setGroupTopic(gd.topic || '');
                    }}
                    className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg transition"
                  >
                    <FiX /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Top row with action icons */}
                <div className="flex justify-between items-center mb-4">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="p-2 hover:bg-gray-200 rounded-lg transition"
                    title="Back to Dashboard"
                  >
                    <FiArrowLeft size={20} className="text-blue-600" />
                  </button>
                  <div className="flex gap-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <button
                      onClick={() => window.location.reload()}
                      className="p-2 hover:bg-blue-100 rounded-lg transition"
                      title="Refresh page"
                    >
                      <FiRefreshCw size={20} className="text-purple-600" />
                    </button>
                    <button
                      onClick={() => setShowQRModal(true)}
                      className="p-2 hover:bg-blue-100 rounded-lg transition"
                      title="Show QR Code"
                    >
                      <FiShare2 size={20} className="text-green-600" />
                    </button>
                    <button
                      onClick={() => setEditingGroupInfo(true)}
                      className="p-2 hover:bg-blue-100 rounded-lg transition"
                      title="Edit group info"
                    >
                      <FiEdit size={20} className="text-blue-600" />
                    </button>
                  </div>
                </div>

                {/* Group info below */}
                <div>
                  <h1 className="text-2xl font-bold text-blue-900 mb-1">{gd.groupName}</h1>
                  <h2 className="text-lg text-blue-700 mb-3">{gd.topic}</h2>
                </div>
              </>
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
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white' 
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      <span>{gdItem.groupName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex flex-wrap gap-3 text-sm text-blue-700\">
              <div className="flex items-center gap-1">
                <FiUsers className="text-blue-600" /> {students.length} Participants
              </div>
              <div className="flex items-center gap-1">
                <FiAward className="text-blue-600" /> Highest: {Math.max(...(
                  gd.evaluations?.map(e => 
                    Object.values(e.scores).reduce((a, b) => a + b, 0)
                  ) || [0]
                ))}/50
              </div>
            </div>
            {activeStudent && (
              <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium inline-block mt-2 border border-blue-200">
                Total: {calculateTotalScore()}/50
              </div>
            )}
          </div>
          
          {/* Student Selection */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Students</h2>
            <div className="flex flex-wrap gap-2">
              {students.map((student, index) => (
                <button
                  key={student.chestNumber || index}
                  onClick={() => setActiveStudent({
                    studentId: student.chestNumber,
                    studentName: student.name,
                    studentEmail: student.email,
                    chestNumber: student.chestNumber,
                    specialization: student.specialization || '',
                    scores: normalizeScores(gd.evaluations?.find(e => e.studentId === student.chestNumber)?.scores),
                    remarks: gd.evaluations?.find(e => e.studentId === student.chestNumber)?.remarks || ''
                  })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                    activeStudent?.studentId === student.chestNumber 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white' 
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
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
                <h2 className="text-lg font-semibold mb-4">
                  Evaluating: <span className="text-blue-600">#{activeStudent.chestNumber} {activeStudent.studentName}</span>
                </h2>
                
                {/* Score Selectors - All Categories Visible */}
                <div className="space-y-4">
                  {categories.map(category => (
                    <ScoreSelector 
                      key={category.id}
                      category={category}
                    />
                  ))}
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-semibold text-blue-900 mb-2">Remarks</label>
                  <textarea
                    value={activeStudent.remarks || ''}
                    onChange={(e) => handleRemarksChange(e.target.value)}
                    className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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

          {/* QR Code Modal */}
          {showQRModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-blue-900">GD Registration QR Code</h2>
                  <button
                    onClick={() => setShowQRModal(false)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <FiX size={24} />
                  </button>
                </div>
                <p className="text-blue-700 mb-4 text-sm">Students can scan this QR code to register for this GD session:</p>
                <div className="flex justify-center bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
                  <QRCode 
                    value={`${window.location.origin}/gd/gd-volunteer/${gdId}`}
                    // value={`http://192.168.0.131:5177/gd/gd-volunteer/${gdId}`}
                    size={200}
                    level="H"
                  />
                </div>
                <p className="text-blue-700 text-sm mb-4">
                  <strong>Group:</strong> {gd.groupName}<br/>
                  <strong>Topic:</strong> {gd.topic}
                </p>
                <button
                  onClick={() => {
                    const link = `${window.location.origin}/gd/gd-volunteer/${gdId}`;
                    
                    // Try modern clipboard API first
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(link)
                        .then(() => alert('Link copied to clipboard!'))
                        .catch(() => fallbackCopyLink(link));
                    } else {
                      // Fallback for older browsers and mobile
                      fallbackCopyLink(link);
                    }
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-4 py-2 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <FiCopy size={16} /> Copy Link
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}