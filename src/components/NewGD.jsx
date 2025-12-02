import QRCode from 'react-qr-code';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, doc, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { FiDownload, FiCopy, FiCheck, FiArrowLeft } from 'react-icons/fi';

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
    const canvas = document.getElementById('qr-code-canvas');
    if (canvas) {
      const pngUrl = canvas
        .toDataURL('image/png')
        .replace('image/png', 'image/octet-stream');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `${groupName}-gd-qr.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  // Copy link to clipboard
  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    alert('Link copied to clipboard!');
  };

  if (loading && projects.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {!isActive ? (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h1 className="text-2xl font-bold mb-6">Start New GD Session</h1>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Group Name*</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g., Group A"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GD Topic*</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Climate Change"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Project Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project*</label>
                <select
                  value={selectedProject}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campus*</label>
                  <select
                    value={selectedCampus}
                    onChange={(e) => {
                      setSelectedCampus(e.target.value);
                      setSelectedCourse('');
                      setSelectedYear('');
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course*</label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => {
                      setSelectedCourse(e.target.value);
                      setSelectedYear('');
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year*</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <FiCheck size={20} /> Activate GD Session
                </button>
              )}
            </div>
          </div>
        ) : (
          // QR Code Display
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6 text-center">GD Session Active</h2>

            <div className="space-y-6">
              {/* Session Info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3">{groupName}</h3>
                <div className="space-y-1 text-sm text-gray-700">
                  <p><strong>Topic:</strong> {topic}</p>
                  <p><strong>Project:</strong> {projects.find(p => p.id === selectedProject)?.code}</p>
                  <p><strong>Campus:</strong> {campuses.find(c => c.id === selectedCampus)?.name}</p>
                  <p><strong>Course:</strong> {selectedCourse}</p>
                  <p><strong>Year:</strong> {selectedYear}</p>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="flex flex-col items-center gap-4">
                <div className="text-center">
                  <p className="text-gray-600 mb-4">Scan this QR code or use the link below to join:</p>
                  <div className="inline-block border-4 border-gray-200 p-4 bg-white rounded-lg">
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
                    onClick={downloadQRCode}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <FiDownload /> Download QR
                  </button>

                  <button
                    onClick={copyLink}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <FiCopy /> Copy Link
                  </button>

                  <button
                    onClick={() => navigate('/dashboard')}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <FiArrowLeft /> Back to Dashboard
                  </button>
                </div>

                {/* Instructions */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-gray-700">
                    <strong>Students will:</strong>
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-700 mt-2 space-y-1">
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
