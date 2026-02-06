import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Replace with your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyAgIRykte6PCiKXmi9C62YtouNt5lcaS8I",
  authDomain: "groceries-945a8.firebaseapp.com",
  projectId: "groceries-945a8",
  storageBucket: "groceries-945a8.firebasestorage.app",
  messagingSenderId: "380027064653",
  appId: "1:380027064653:web:acd3e698870efda20ea704"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
