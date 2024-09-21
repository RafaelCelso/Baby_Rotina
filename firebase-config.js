import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAXhecvfpilaLJ4dzqATDbJZv0UJHSOvug",
  authDomain: "baby-rotina.firebaseapp.com",
  projectId: "baby-rotina",
  storageBucket: "baby-rotina.appspot.com",
  messagingSenderId: "943230448302",
  appId: "1:943230448302:web:93c7e7ec7414bf5734f33f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };