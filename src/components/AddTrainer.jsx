import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, addDoc, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth as getAuthFromApp, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut as signOutAuth } from 'firebase/auth';
import { firebaseConfig } from '../firebase';
import { FiEdit, FiTrash2, FiUserPlus, FiMail } from 'react-icons/fi';
export default function AddTrainer() {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTrainer, setNewTrainer] = useState({
    name: '',
    email: ''
  });

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    setLoading(true);
    const q = query(collection(db, 'trainers'), where('role', '==', 'user'));
    const trainersSnapshot = await getDocs(q);
    setTrainers(trainersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  };

  const addTrainer = async () => {
    if (!newTrainer.name || !newTrainer.email) {
      alert("Please enter trainer name and email");
      return;
    }

    try {
      // First check if email already exists
      const emailExists = trainers.some(trainer => trainer.email === newTrainer.email);
      if (emailExists) {
        alert("A trainer with this email already exists");
        return;
      }

      const tempPassword = Math.random().toString(36).slice(-8);

      // Create user using a secondary Firebase App instance so the admin stays logged in
      let secondaryApp;
      if (!getApps().some(a => a.name === 'createUserApp')) {
        secondaryApp = initializeApp(firebaseConfig, 'createUserApp');
      } else {
        secondaryApp = getApp('createUserApp');
      }

      const secondaryAuth = getAuthFromApp(secondaryApp);
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        newTrainer.email,
        tempPassword
      );

      // Sign out the secondary auth so it doesn't remain signed-in
      try {
        await signOutAuth(secondaryAuth);
      } catch (signOutErr) {
        console.warn('Could not sign out secondary auth:', signOutErr);
      }

      // Send password reset email using the main auth instance
      const currentUrl = window.location.href.split('?')[0];
      await sendPasswordResetEmail(auth, newTrainer.email, {
        url: `${currentUrl}?fromPasswordReset=true`,
        handleCodeInApp: true
      });

      // Save trainer details to Firestore with default 'user' role
      await addDoc(collection(db, 'trainers'), {
        ...newTrainer,
        userId: userCredential.user.uid,
        role: 'user',
        createdAt: new Date()
      });

      alert(`Trainer added! Password reset sent to ${newTrainer.email}`);
      setNewTrainer({ name: '', email: '' });
      fetchTrainers();

    } catch (err) {
      console.error("Error adding trainer: ", err);
      let errorMessage = "Failed to add trainer";
      
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already in use by another account";
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address";
      } else if (err.code === 'auth/weak-password') {
        errorMessage = "Password is too weak";
      }
      
      alert(errorMessage + ": " + err.message);
    }
  };

  const handleDelete = async (id, trainer) => {
    if (!window.confirm('Are you sure you want to permanently delete this trainer? This action cannot be undone.')) return;
    
    try {
      // Only delete trainer document from Firestore (do NOT delete from Firebase Auth)
      await deleteDoc(doc(db, 'trainers', id));

      fetchTrainers();
      alert('Trainer deleted from database. Firebase Authentication user was not removed.');
    } catch (err) {
      console.error("Error deleting trainer: ", err);
      try {
        // Attempt to at least remove the DB entry if initial attempt failed
        await deleteDoc(doc(db, 'trainers', id));
        fetchTrainers();
        alert('Trainer deleted from database. Note: The Firebase Authentication user may need manual deletion.');
      } catch (firestoreErr) {
        alert("Failed to delete trainer: " + firestoreErr.message);
      }
    }
  };

  const handleResendPassword = async (trainer) => {
    try {
      const currentUrl = window.location.href.split('?')[0];
      await sendPasswordResetEmail(auth, trainer.email, {
        url: `${currentUrl}?fromPasswordReset=true`,
        handleCodeInApp: true
      });
      alert(`Password reset email sent to ${trainer.email}`);
    } catch (err) {
      console.error("Error sending password reset: ", err);
      alert("Failed to send password reset email: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Side - Form */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <h2 className="text-xl font-semibold">Add Trainer</h2>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name*</label>
          <input
            type="text"
            value={newTrainer.name}
            onChange={(e) => setNewTrainer({...newTrainer, name: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="Trainer Name"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email*</label>
          <input
            type="email"
            value={newTrainer.email}
            onChange={(e) => setNewTrainer({...newTrainer, email: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="trainer@example.com"
            required
          />
        </div>
        
        <button
          onClick={addTrainer}
          disabled={!newTrainer.name || !newTrainer.email}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg disabled:bg-gray-400"
        >
          <FiUserPlus className="inline mr-2" /> Add Trainer
        </button>
      </div>
      
      {/* Right Side - Trainers List */}
      <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">All Trainers</h2>
        
        {trainers.length === 0 ? (
          <p className="text-gray-500">No trainers added yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trainers.map(trainer => (
                  <tr key={trainer.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">{trainer.name}</td>
                    <td className="px-4 py-2">{trainer.email}</td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          className="text-green-500 hover:text-green-700 flex items-center gap-1"
                          onClick={() => handleResendPassword(trainer)}
                          title="Resend password reset email"
                        >
                          <FiMail /> Resend
                        </button>
                        <button 
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(trainer.id, trainer)}
                          title="Delete trainer"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}