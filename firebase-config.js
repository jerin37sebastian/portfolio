import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyABYZ62tw63dhU1dTNzhg-PTh1eDJwatdU",
  authDomain: "my-portfolio-fbbe6.firebaseapp.com",
  projectId: "my-portfolio-fbbe6",
  storageBucket: "my-portfolio-fbbe6.firebasestorage.app",
  messagingSenderId: "268211040158",
  appId: "1:268211040158:web:0c4964240d01fc9c52f08f",
  measurementId: "G-M78W5N3875"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
