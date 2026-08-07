import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// ค่าชุดนี้เปิดเผยได้ ไม่ใช่ความลับ ความปลอดภัยอยู่ที่ firestore.rules ที่เดียว
// ไม่ใช่ที่ apiKey ทำเป็น VITE_* จึงได้แค่ indirection กับโอกาสลืมตั้ง var ตอน deploy
const app = initializeApp({
  apiKey: 'AIzaSyB8p06eVs8Z2wmVHA3po1LDvdAr_5yKaCg',
  authDomain: 'jirbrewstack.firebaseapp.com',
  projectId: 'jirbrewstack',
  storageBucket: 'jirbrewstack.firebasestorage.app',
  messagingSenderId: '448976427887',
  appId: '1:448976427887:web:6db80a8137cfde5319269a',
});

export const auth = getAuth(app);
