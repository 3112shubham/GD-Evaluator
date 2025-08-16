// src/components/Auth.jsx
import { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, collection, where, query } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiLogIn, FiUserPlus } from 'react-icons/fi';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        // Check if email ends with allowed domain
        if (!email.endsWith('@yourdomain.com')) {
          throw new Error('Only authorized email domains can register');
        }

        // Check if user is in trainers collection
        const trainersSnapshot = await getDocs(
          query(collection(db, 'trainers'), where('email', '==', email))
        );
        
        if (trainersSnapshot.empty) {
          throw new Error('You are not authorized to register as trainer');
        }

        const trainerData = trainersSnapshot.docs[0].data();
        
        // Create user and store in Firestore
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", userCredential.user.uid), {
          name: trainerData.name,
          email,
          createdAt: new Date(),
          role: "trainer",
          campuses: trainerData.campuses || [],
          batches: trainerData.batches || []
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      
      // Redirect to the original path or dashboard
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-100">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">GD Evaluator</h1>
          <p className="text-gray-600">
            {isSignUp ? "Create Trainer Account" : "Trainer Login"}
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="John Doe"
                required
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="your@email.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
          >
            {isSignUp ? <FiUserPlus /> : <FiLogIn />}
            {isSignUp ? "Sign Up" : "Login"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            {isSignUp 
              ? "Already have an account? Login" 
              : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}