import QRCode from 'react-qr-code';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, doc, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { FiDownload, FiCopy, FiCheck, FiArrowLeft, FiPlay } from 'react-icons/fi';

export default function NewGD() {
  // Form state
  const [groupName, setGroupName] = useState('');
  const [topic, setTopic] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // Session state
  const [generatedLink, setGeneratedLink] = useState('');
  const [gdId, setGdId] = useState(null);
  const [isActive, setIsActive] = useState(false);

  // Data state
  const [projects, setProjects] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // Form validation check
  const isFormComplete = groupName && topic && selectedProject && selectedCampus && selectedCourse && selectedYear;

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsSnap = await getDocs(collection(db, 'projects'));
        setProjects(projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Fetch campuses when project changes
  const handleProjectChange = async (projectId) => {
    setSelectedProject(projectId);
    setSelectedCampus('');
    setSelectedCourse('');
    setSelectedYear('');

    if (!projectId) {
      setCampuses([]);
      return;
    }

    setLoading(true);
    try {
      const campusesSnap = await getDocs(collection(db, 'projects', projectId, 'campuses'));
      const campusList = campusesSnap.docs.map(d => ({ id: d.id, projectId, ...d.data() }));
      setCampuses(campusList);
    } catch (err) {
      console.error('Error fetching campuses:', err);
      setCampuses([]);
    } finally {
      setLoading(false);
    }
  };

  // Get course options from selected campus
  const selectedCampusObj = campuses.find(c => c.id === selectedCampus);
  const courseOptions = selectedCampusObj ? Object.keys(selectedCampusObj.courses || {}) : [];

  // Get specializations from selected course
  const specializationOptions = selectedCampusObj && selectedCourse
    ? (selectedCampusObj.courses[selectedCourse] || [])
    : [];

  // Hardcoded year dropdown 1-6
  const availableYears = [1, 2, 3, 4, 5, 6];

  // Activate GD session
  const activateGD = async () => {
    if (!isFormComplete) return;

    const gdData = {
      groupName,
      topic,
      projectId: selectedProject,
      campusId: selectedCampus,
      course: selectedCourse,
      year: selectedYear,
      students: [],
      specializations: specializationOptions, // available specializations for this course
      trainerId: auth.currentUser.uid,
      trainerEmail: auth.currentUser.email,
      createdAt: new Date(),
      isActive: true,
      type: 'gd'
    };

    try {
      const docRef = await addDoc(collection(db, 'sessions'), gdData);
      const linkId = docRef.id;
      const link = `${window.location.origin}/gd/gd-volunteer/${linkId}`;
      // const link = `http://192.168.0.131:5177/gd/gd-volunteer/${linkId}`;
      setGeneratedLink(link);
      setGdId(linkId);
      setIsActive(true);
    } catch (err) {
      console.error('Error activating GD:', err);
      alert('Failed to activate GD session');
    }
  };

  // Download QR code
  const downloadQRCode = () => {
    // Wait for QR code to render if needed
    setTimeout(() => {
      const qrContainer = document.getElementById('qr-code-canvas');
      const svgElement = qrContainer?.querySelector('svg') || document.querySelector('svg[data-testid="qr-code"]');
      
      if (!svgElement) {
        alert('QR code is still loading. Please try again in a moment.');
        return;
      }

      try {
        // Use fixed size for consistency
        const size = 250;
        const canvas = document.createElement('canvas');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);

        // Serialize SVG
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, size, size);
          const pngUrl = canvas.toDataURL('image/png');
          
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = `${groupName || 'gd'}-qr.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          alert('Failed to process QR code. Please try again.');
        };
        img.src = url;
      } catch (err) {
        console.error('Error downloading QR:', err);
        alert('Error: ' + err.message);
      }
    }, 100);
  };

  // Copy link to clipboard with mobile fallback
  const copyLink = () => {
    const link = generatedLink;
    
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link)
        .then(() => alert('Link copied to clipboard!'))
        .catch(() => fallbackCopy(link));
    } else {
      // Fallback for older browsers and mobile
      fallbackCopy(link);
    }
  };

  // Fallback copy method for mobile
  const fallbackCopy = (text) => {
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

  if (loading && projects.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-blue-800">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-3xl mx-auto">
        {!isActive ? (
          <div className="bg-white rounded-xl shadow-md p-6 border border-blue-100">
            <h1 className="text-3xl font-bold mb-2 text-blue-900">Start New GD Session</h1>
            <p className="text-blue-700 mb-8">Fill in the details below to create and activate a new group discussion session</p>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">Group Name*</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g., Group A"
                    className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">GD Topic*</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Climate Change"
                    className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Project Selection */}
              <div>
                <label className="block text-sm font-semibold text-blue-900 mb-2">Project*</label>
                <select
                  value={selectedProject}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Select Project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campus Selection */}
              {selectedProject && campuses.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">Campus*</label>
                  <select
                    value={selectedCampus}
                    onChange={(e) => {
                      setSelectedCampus(e.target.value);
                      setSelectedCourse('');
                      setSelectedYear('');
                    }}
                    className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select Campus</option>
                    {campuses.map(campus => (
                      <option key={campus.id} value={campus.id}>
                        {campus.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Course Selection */}
              {selectedCampus && courseOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">Course*</label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => {
                      setSelectedCourse(e.target.value);
                      setSelectedYear('');
                    }}
                    className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select Course</option>
                    {courseOptions.map(courseName => (
                      <option key={courseName} value={courseName}>
                        {courseName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Year Selection */}
              {selectedCourse && (
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">Year*</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select Year</option>
                    {availableYears.map(year => (
                      <option key={year} value={year}>
                        Year {year}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Activate Button */}
              {isFormComplete && (
                <button
                  onClick={activateGD}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <FiCheck size={20} /> Activate GD Session
                </button>
              )}
            </div>
          </div>
        ) : (
          // QR Code Display
          <div className="bg-white rounded-xl shadow-md p-6 border border-blue-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-3xl font-bold text-blue-900">GD Session Active</h2>
                <p className="text-blue-700 mt-2">Your session is ready. Share the QR code or link with participants.</p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm flex-shrink-0"
              >
                <FiArrowLeft /> Back
              </button>
            </div>

            <div className="space-y-6">
              {/* Session Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                <h3 className="font-bold text-xl text-blue-900 mb-4">{groupName}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <p className="text-blue-600"><strong>Topic:</strong> <span className="text-blue-900">{topic}</span></p>
                    <p className="text-blue-600"><strong>Project:</strong> <span className="text-blue-900">{projects.find(p => p.id === selectedProject)?.code}</span></p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-blue-600"><strong>Campus:</strong> <span className="text-blue-900">{campuses.find(c => c.id === selectedCampus)?.name}</span></p>
                    <p className="text-blue-600"><strong>Course:</strong> <span className="text-blue-900">{selectedCourse} - Year {selectedYear}</span></p>
                  </div>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="flex flex-col items-center gap-4">
                <div className="text-center w-full">
                  <p className="text-blue-700 mb-4 font-semibold">Scan this QR code or use the link below to join:</p>
                  <div className="inline-block border-4 border-blue-200 p-4 bg-white rounded-lg shadow-md">
                    <QRCode
                      id="qr-code-canvas"
                      value={generatedLink}
                      size={250}
                      level="H"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap justify-center">
                  <button
                    onClick={copyLink}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <FiCopy /> Copy Link
                  </button>
                  <button
                    onClick={() => navigate(`/gd/${gdId}`)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <FiPlay /> Evaluate
                  </button>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 border-l-4 border-blue-600 rounded-lg p-4 mt-4 w-full">
                  <p className="text-sm font-semibold text-blue-900 mb-3">Students will:</p>
                  <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                    <li>Scan this QR code</li>
                    <li>Enter their name and email</li>
                    <li>Select their specialization</li>
                    <li>Submit to join the session</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
