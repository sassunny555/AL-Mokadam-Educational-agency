/* ============================================
   Firebase Configuration for AL-Mokadam
   ============================================ */

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBmUxfxTLOaDGoTyzyQ06VKG59FIyB03iQ",
    authDomain: "al-mokadam-educational-agency.firebaseapp.com",
    projectId: "al-mokadam-educational-agency",
    storageBucket: "al-mokadam-educational-agency.firebasestorage.app",
    messagingSenderId: "307944911949",
    appId: "1:307944911949:web:2a7ea0447e722ed13fd804",
    measurementId: "G-BBHSMZ4N3E"
};

// Initialize Firebase
let app, db, auth, storage;

function initFirebase() {
    if (typeof firebase !== 'undefined') {
        // Initialize Firebase App
        if (!firebase.apps.length) {
            app = firebase.initializeApp(firebaseConfig);
        } else {
            app = firebase.app();
        }
        
        // Initialize Firestore
        db = firebase.firestore();
        
        // Initialize Auth (only if auth SDK is loaded)
        if (firebase.auth) {
            auth = firebase.auth();
        }
        
        // Initialize Storage
        if (firebase.storage) {
            storage = firebase.storage();
        }
        
        console.log('Firebase initialized successfully');
        return true;
    } else {
        console.warn('Firebase SDK not loaded');
        return false;
    }
}

// ============================================
// Firestore Helper Functions
// ============================================

// Add document to collection
async function addDocument(collection, data) {
    try {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        const docRef = await db.collection(collection).add(data);
        console.log(`Document added to ${collection}:`, docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error adding document:', error);
        throw error;
    }
}

// ============================================
// Storage Helper Functions
// ============================================

async function uploadFileToStorage(file, path) {
    try {
        if (!storage) {
            throw new Error('Firebase Storage not initialized');
        }
        const ref = storage.ref().child(path);
        const snapshot = await ref.put(file);
        const url = await snapshot.ref.getDownloadURL();
        return { path, url, name: file.name, size: file.size };
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}

// Update document in collection
async function updateDocument(collection, docId, data) {
    try {
        data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection(collection).doc(docId).update(data);
        console.log(`Document updated in ${collection}:`, docId);
        return true;
    } catch (error) {
        console.error('Error updating document:', error);
        throw error;
    }
}

// Delete document from collection
async function deleteDocument(collection, docId) {
    try {
        await db.collection(collection).doc(docId).delete();
        console.log(`Document deleted from ${collection}:`, docId);
        return true;
    } catch (error) {
        console.error('Error deleting document:', error);
        throw error;
    }
}

// Get all documents from collection
async function getDocuments(collection, orderBy = 'createdAt', direction = 'desc') {
    try {
        const snapshot = await db.collection(collection)
            .orderBy(orderBy, direction)
            .get();
        
        const documents = [];
        snapshot.forEach(doc => {
            documents.push({ id: doc.id, ...doc.data() });
        });
        return documents;
    } catch (error) {
        console.error('Error getting documents:', error);
        throw error;
    }
}

// Get single document
async function getDocument(collection, docId) {
    try {
        const doc = await db.collection(collection).doc(docId).get();
        if (doc.exists) {
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (error) {
        console.error('Error getting document:', error);
        throw error;
    }
}

// Get active documents only
async function getActiveDocuments(collection, orderBy = 'order', direction = 'asc') {
    try {
        const snapshot = await db.collection(collection)
            .where('active', '==', true)
            .orderBy(orderBy, direction)
            .get();
        
        const documents = [];
        snapshot.forEach(doc => {
            documents.push({ id: doc.id, ...doc.data() });
        });
        return documents;
    } catch (error) {
        console.error('Error getting active documents:', error);
        // Fallback without ordering if index doesn't exist
        const snapshot = await db.collection(collection)
            .where('active', '==', true)
            .get();
        const documents = [];
        snapshot.forEach(doc => {
            documents.push({ id: doc.id, ...doc.data() });
        });
        return documents;
    }
}

// ============================================
// Contact Form Submission
// ============================================

async function submitInquiry(formData) {
    try {
        formData.status = 'new';
        formData.notes = '';
        const docId = await addDocument('inquiries', formData);
        return docId;
    } catch (error) {
        console.error('Error submitting inquiry:', error);
        throw error;
    }
}

// ============================================
// University Functions
// ============================================

// Get all active universities
async function getUniversities() {
    try {
        const snapshot = await db.collection('universities')
            .where('active', '==', true)
            .orderBy('order', 'asc')
            .get();
        
        const universities = [];
        snapshot.forEach(doc => {
            universities.push({ id: doc.id, ...doc.data() });
        });
        return universities;
    } catch (error) {
        console.error('Error getting universities:', error);
        // Fallback without ordering
        const snapshot = await db.collection('universities')
            .where('active', '==', true)
            .get();
        const universities = [];
        snapshot.forEach(doc => {
            universities.push({ id: doc.id, ...doc.data() });
        });
        return universities;
    }
}

// Get single university with its courses
async function getUniversityWithCourses(uniId) {
    try {
        // Get university
        const uniDoc = await db.collection('universities').doc(uniId).get();
        if (!uniDoc.exists) return null;
        
        const university = { id: uniDoc.id, ...uniDoc.data() };
        
        // Get course details for each offering
        if (university.courseOfferings && university.courseOfferings.length > 0) {
            const coursePromises = university.courseOfferings.map(async (offering) => {
                const courseDoc = await db.collection('courses').doc(offering.courseId).get();
                if (courseDoc.exists) {
                    return {
                        ...courseDoc.data(),
                        id: courseDoc.id,
                        fees: offering.fees,
                        intake: offering.intake
                    };
                }
                return null;
            });
            university.courses = (await Promise.all(coursePromises)).filter(c => c !== null);
        } else {
            university.courses = [];
        }
        
        return university;
    } catch (error) {
        console.error('Error getting university:', error);
        throw error;
    }
}

// ============================================
// Course Functions
// ============================================

// Get all courses (master list)
async function getCourses() {
    try {
        const snapshot = await db.collection('courses')
            .orderBy('name', 'asc')
            .get();
        
        const courses = [];
        snapshot.forEach(doc => {
            courses.push({ id: doc.id, ...doc.data() });
        });
        return courses;
    } catch (error) {
        console.error('Error getting courses:', error);
        throw error;
    }
}

// Get courses by category
async function getCoursesByCategory(category) {
    try {
        const snapshot = await db.collection('courses')
            .where('category', '==', category)
            .get();
        
        const courses = [];
        snapshot.forEach(doc => {
            courses.push({ id: doc.id, ...doc.data() });
        });
        return courses;
    } catch (error) {
        console.error('Error getting courses by category:', error);
        throw error;
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initFirebase);
