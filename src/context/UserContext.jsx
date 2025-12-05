import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const unsubscribeSnapshot = useRef(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (authUser) => {
      // Clean up previous snapshot listener
      if (unsubscribeSnapshot.current) {
        unsubscribeSnapshot.current();
        unsubscribeSnapshot.current = null;
      }

      if (authUser) {
        try {
            // Ensure the signed-in user has a corresponding trainer record
            const trainersCol = collection(db, 'trainers');
            const q = query(trainersCol, where('userId', '==', authUser.uid));
            const querySnap = await getDocs(q);

            if (querySnap.empty) {
              // No trainer record found: prevent login
              console.warn('Signed-in user has no trainer record; signing out');
              try {
                await signOut(auth);
              } catch (signOutErr) {
                console.error('Error signing out user without trainer record:', signOutErr);
              }
              setUser(null);
              setUserRole(null);
              setLoading(false);
              alert('You are not authorized to access this application. Please contact an administrator.');
              return;
            }

            // Use the first matching trainer doc (should be unique)
            const trainerDoc = querySnap.docs[0];
            const trainerRef = doc(db, 'trainers', trainerDoc.id);

            // Set up real-time listener for role changes
            unsubscribeSnapshot.current = onSnapshot(
              trainerRef,
              async (trainerSnap) => {
                if (trainerSnap.exists()) {
                  const role = trainerSnap.data().role || 'user';

                  // If role is 'dead', sign out the user immediately
                  if (role === 'dead') {
                    console.log('User role is dead, signing out');
                    await signOut(auth);
                    setUser(null);
                    setUserRole(null);
                    setLoading(false);
                    return;
                  }

                  setUser(authUser);
                  setUserRole(role);
                  setLoading(false);
                } else {
                  // Trainer doc was removed while signed in: sign out
                  console.warn('Trainer document removed; signing out');
                  try {
                    await signOut(auth);
                  } catch (signOutErr) {
                    console.error('Error signing out after trainer doc removal:', signOutErr);
                  }
                  setUser(null);
                  setUserRole(null);
                  setLoading(false);
                }
              },
              (error) => {
                console.error('Error listening to role changes:', error);
                setUser(authUser);
                setUserRole('user');
                setLoading(false);
              }
            );
        } catch (error) {
          console.error('Error setting up role listener:', error);
          setUser(authUser);
          setUserRole('user');
          setLoading(false);
        }
      } else {
        setUser(null);
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot.current) {
        unsubscribeSnapshot.current();
      }
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, userRole, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
