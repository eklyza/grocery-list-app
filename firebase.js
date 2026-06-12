import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyAgIRykte6PCiKXmi9C62YtouNt5lcaS8I",
  authDomain: "groceries-945a8.firebaseapp.com",
  projectId: "groceries-945a8",
  storageBucket: "groceries-945a8.firebasestorage.app",
  messagingSenderId: "380027064653",
  appId: "1:380027064653:web:acd3e698870efda20ea704"
};

const app = initializeApp(firebaseConfig);
export const auth = Platform.OS === 'web'
  ? getAuth(app)
  : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
export const db = getFirestore(app);
