import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  initializeAuth,
} from 'firebase/auth';

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

// ไม่ใช้ getAuth() เพราะมันเลือก indexedDBLocalPersistence เป็นตัวแรกเสมอ
// ซึ่งปิด DB ตัวเองทุกครั้งที่หน้าเป็น visibilityState: hidden แล้วโยน
// "Database is closing/hidden" ออกมา ตอน popup ของ Google ขึ้น หน้าหลักกลายเป็น hidden
// พอ popup กลับมา SDK เขียน user ลง DB ที่ปิดไปแล้ว signInWithPopup เลย reject
// ทั้งที่ OAuth ผ่านไปแล้ว (เจอจริงบน Safari 2026-08-10)
// browserLocalPersistence เก็บบน window.localStorage ไม่มีวงจรเปิดปิดและไม่ผูกกับ visibility
// ยังอยู่ข้ามรีเฟรชและข้ามการปิดเบราว์เซอร์เหมือนเดิม
// initializeAuth ต้องระบุ popupRedirectResolver เองด้วย ไม่งั้น signInWithPopup ใช้ไม่ได้
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver,
});
