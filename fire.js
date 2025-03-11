
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyBtxAxJnbSI6UfqmzUW40ERPH8_GIwoU4I",
    authDomain: "jobhive-f8260.firebaseapp.com",
    projectId: "jobhive-f8260",
    storageBucket: "jobhive-f8260.firebasestorage.app",
    messagingSenderId: "680568830430",
    appId: "1:680568830430:web:950a39730688ff1ce1454f"
  };

  const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
