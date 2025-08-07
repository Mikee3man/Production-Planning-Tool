// Firebase configuration
// This file contains the Firebase configuration and initialization

// Import Firebase modules
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD5AUkL9IiNTxOVkY5hD5GPS8r9kx3oeuw",
  authDomain: "project-planning-tool-eb561.firebaseapp.com",
  databaseURL: "https://project-planning-tool-eb561-default-rtdb.firebaseio.com",
  projectId: "project-planning-tool-eb561",
  storageBucket: "project-planning-tool-eb561.firebasestorage.app",
  messagingSenderId: "973672610025",
  appId: "1:973672610025:web:4375d93729615724d19878",
  measurementId: "G-P72HWF3YY5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firestore
const db = getFirestore(app);

// Export the Firestore instance and functions for use in other files
export { 
  db, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  onSnapshot,
  analytics
};
