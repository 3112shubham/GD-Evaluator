import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
 
  apiKey: "AIzaSyBw86KQyVaSy-uMIE1EfUhb34IfKodVN-0",
 
  authDomain: "gd-evaluator-3ce2d.firebaseapp.com",
 
  projectId: "gd-evaluator-3ce2d",
 
  storageBucket: "gd-evaluator-3ce2d.firebasestorage.app",
 
  messagingSenderId: "908508844228",
 
  appId: "1:908508844228:web:c5a82bc9c9a80566a13991",
 
  measurementId: "G-B7SP8SYGNN"
 
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);