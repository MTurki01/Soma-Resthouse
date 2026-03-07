import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

const firebaseConfig = {
    apiKey: "AIzaSyDqlCpPHeNEvWgcChWR34Hp8tKBgIQ0xg0",
    authDomain: "soma-6bfb1.firebaseapp.com",
    databaseURL: "https://soma-6bfb1-default-rtdb.firebaseio.com",
    projectId: "soma-6bfb1",
    storageBucket: "soma-6bfb1.firebasestorage.app",
    messagingSenderId: "812268490400",
    appId: "1:812268490400:web:007ce6a3d8dcc9f2ffc3c5",
    measurementId: "G-3V2513E4ZP"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

console.log("Testing connection...");

db.ref('test').push({test:1}).then(() => {
    console.log("SUCCESS: Data written to Firebase RTDB.");
    process.exit(0);
}).catch(e => {
    console.error("ERROR:", e.code, e.message);
    process.exit(1);
});

// timeout if no response
setTimeout(() => {
    console.error("TIMEOUT");
    process.exit(1);
}, 5000);
