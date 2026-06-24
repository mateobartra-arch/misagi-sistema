// firebase-config.js
// Firebase V10 - Importación modular vía CDN
// INSTRUCCIONES: Rellena el objeto firebaseConfig con tus credenciales del proyecto Firebase.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage }     from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ⚠️  Reemplaza cada valor con los datos de tu proyecto en Firebase Console
//     Project Settings → General → Your apps → SDK setup and configuration
const firebaseConfig = {
  apiKey:            "AIzaSyDF_TbuKTa0TEIFvAUlmDc7C9jmNzzzrz0",
  authDomain:        "misagi-transportes.firebaseapp.com",
  projectId:         "misagi-transportes",
  storageBucket:     "misagi-transportes.firebasestorage.app",
  messagingSenderId: "1055674876273",
  appId:             "1:1055674876273:web:35004b5b408c875756f6d0",
};

const app     = initializeApp(firebaseConfig);
const auth    = getAuth(app);
const db      = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
