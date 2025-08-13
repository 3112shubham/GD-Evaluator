// src/components/GDVolunteerSuccess.jsx
import { FiCheck } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

export default function GDVolunteerSuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-md w-full">
        <FiCheck className="text-green-500 text-5xl mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Students Submitted Successfully!</h1>
        <p className="text-gray-600 mb-6">
          The trainer has been notified and can now start the evaluation process.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}