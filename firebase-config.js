// ---- Firebase Config ----
// استبدل القيم أدناه بالقيم الخاصة بمشروع Firebase لديك
const firebaseConfig = {
 apiKey: "AIzaSyDzmY7_i9Lo8kmFvuSyh42KIa94eUutQPY",
  authDomain: "soma-6bfb1.firebaseapp.com",
  databaseURL: "https://soma-6bfb1-default-rtdb.firebaseio.com",
  projectId: "soma-6bfb1",
  storageBucket: "soma-6bfb1.firebasestorage.app",
  messagingSenderId: "812268490400",
  appId: "1:812268490400:web:d053d4b013e436a9ffc3c5",
  measurementId: "G-JLVZE0MQFX"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);

// ربط Realtime Database
const db = firebase.database();
