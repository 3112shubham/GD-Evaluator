import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCjJV4rkZe3seOs-tdarqtoMfeoY7vHDcI",
  authDomain: "gd-evaluator.firebaseapp.com",
  projectId: "gd-evaluator",
  storageBucket: "gd-evaluator.firebasestorage.app",
  messagingSenderId: "791981715171",
  appId: "1:791981715171:web:1663d26ab6d68bb1d99fd6",
  measurementId: "G-862HSKCWLV"
};
const app = initializeApp(firebaseConfig);
export const firebaseApp = app;
export const auth = getAuth(app);
export const db = getFirestore(app);
export { firebaseConfig };