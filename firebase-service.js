// Firebase service functions for Production Planning Tool
// This file contains functions to interact with Firestore database

import { baseUrl } from './base-url.js';

// Import Firebase modules directly to ensure they're loaded before use
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

// Your web app's Firebase configuration
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

// Collection reference for all months data
const allMonthsDataCollection = collection(db, 'allMonthsData');

// Save all months data to Firestore
async function saveDataToFirestore(allMonthsData) {
  try {
    // Create a document with a fixed ID to store all months data
    await setDoc(doc(allMonthsDataCollection, 'production-data'), {
      data: allMonthsData,
      lastUpdated: new Date().toISOString()
    });
    console.log('Data successfully saved to Firestore');
    return true;
  } catch (error) {
    console.error('Error saving data to Firestore:', error);
    return false;
  }
}

// Load data from Firestore
async function loadDataFromFirestore() {
  try {
    const docRef = doc(allMonthsDataCollection, 'production-data');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log('Data successfully loaded from Firestore');
      return docSnap.data().data;
    } else {
      console.log('No data found in Firestore');
      return null;
    }
  } catch (error) {
    console.error('Error loading data from Firestore:', error);
    return null;
  }
}

// Set up real-time listener for data changes
function subscribeToDataChanges(callback) {
  const docRef = doc(allMonthsDataCollection, 'production-data');
  
  // Return the unsubscribe function
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().data);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error listening to data changes:', error);
  });
}

export {
  saveDataToFirestore,
  loadDataFromFirestore,
  subscribeToDataChanges
};