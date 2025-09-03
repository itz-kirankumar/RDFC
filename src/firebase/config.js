import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyCu99ausCvfcfuxaEl0ZWv5tHckTfdkjjE",
    authDomain: "www.rdfctest.site",
    projectId: "rdfcblog-81a45",
    storageBucket: "rdfcblog-81a45.appspot.com",
    messagingSenderId: "770994813528",
    appId: "1:770994813528:web:fa6bbbb5e7edd2335de82d",
    measurementId: "G-DEKB8013Q3"
};

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// --- Global Constants ---
const ADMIN_EMAILS = ["kiran160703kumar@gmail.com", "Atalgupta887@gmail.com"];
const SECTIONS = ["VARC", "DILR", "QA"];

export { auth, db, provider, ADMIN_EMAILS, SECTIONS };
