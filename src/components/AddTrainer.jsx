import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { FiEdit, FiTrash2, FiUserPlus } from 'react-icons/fi';

export default function AddTrainer() {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTrainer, setNewTrainer] = useState({
    name: '',
    email: '',
    contact: ''
  });

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    setLoading(true);
    const trainersSnapshot = await getDocs(collection(db, 'trainers'));
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

      // Create user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newTrainer.email,
        tempPassword
      );

      // Send password reset email
      const currentUrl = window.location.href.split('?')[0];

    // Send password reset email with dynamic return URL
    await sendPasswordResetEmail(auth, newTrainer.email, {
      url: `${currentUrl}?fromPasswordReset=true`,
      handleCodeInApp: true // Extends expiration to 1 week
    });
      // Save trainer details to Firestore
      await addDoc(collection(db, 'trainers'), {
        ...newTrainer,
        userId: userCredential.user.uid,
        createdAt: new Date()
      });

      alert(`Trainer added! Password reset sent to ${newTrainer.email}`);
      setNewTrainer({ name: '', email: '', contact: '' });
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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this trainer?')) return;
    
    try {
      await deleteDoc(doc(db, 'trainers', id));
      fetchTrainers();
      alert('Trainer deleted successfully');
    } catch (err) {
      console.error("Error deleting trainer: ", err);
      alert("Failed to delete trainer: " + err.message);
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
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
          <input
            type="text"
            value={newTrainer.contact}
            onChange={(e) => setNewTrainer({...newTrainer, contact: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="+91 9876543210"
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
                  <th className="px-4 py-2 text-left">Contact</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trainers.map(trainer => (
                  <tr key={trainer.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">{trainer.name}</td>
                    <td className="px-4 py-2">{trainer.email}</td>
                    <td className="px-4 py-2">{trainer.contact || 'N/A'}</td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex justify-center gap-2">
                        <button className="text-blue-500 hover:text-blue-700">
                          <FiEdit />
                        </button>
                        <button 
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(trainer.id)}
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