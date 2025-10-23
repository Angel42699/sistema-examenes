// firebase-config.js - Versión tradicional (NO módulo)

// Tu configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD7C4_rIdB_aw6Gpgg9LcGo5oHPVYN5UrQ",
    authDomain: "examen-e4083.firebaseapp.com",
    databaseURL: "https://examen-e4083-default-rtdb.firebaseio.com",
    projectId: "examen-e4083",
    storageBucket: "examen-e4083.firebasestorage.app",
    messagingSenderId: "1017039887811",
    appId: "1:1017039887811:web:992dcc930bed714d43b176"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Hacer disponible globalmente
const database = firebase.database();
console.log('✅ Firebase inicializado correctamente');