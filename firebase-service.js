// Firebase service functions for Production Planning Tool
// This file contains functions to interact with Firestore database

import { baseUrl } from './base-url.js';
import { db, collection, doc, setDoc, getDoc, getDocs, onSnapshot } from './firebase-config.js';

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